import { Injectable, signal, inject, NgZone } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { catchError, map, filter, tap, switchMap } from 'rxjs/operators';
import { Observable, of, fromEvent, merge, timer, from, firstValueFrom } from 'rxjs';

declare var google: any;

export interface UserProfile {
    email: string;
    name: string;
    picture: string;
}

const STORAGE_KEYS = {
    ACCESS_TOKEN: 'google_access_token',
    TOKEN_EXPIRES_AT: 'google_token_expires_at',
    USER_PROFILE: 'google_user_profile',
    IS_AUTHORIZED: 'google_is_authorized',
    LAST_ACTIVITY_AT: 'google_last_activity_at',
    LAST_REFRESH_AT: 'google_last_refresh_at'
};

const INACTIVITY_LIMIT_MS = 24 * 60 * 60 * 1000; // 24 hours
const REFRESH_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes buffer to renew before expiry
const SESSION_REFRESH_INTERVAL_MS = 8 * 60 * 1000; // 8 minutes
const REFRESH_GRACE_PERIOD_MS = 60 * 1000; // 1 minute

@Injectable({
    providedIn: 'root'
})
export class GoogleAuthService {
    private http = inject(HttpClient);
    private zone = inject(NgZone);
    private tokenClient: any;
    
    // Centralized Reactive State
    public accessToken = signal<string | null>(null);
    public tokenExpiresAt = signal<number>(0);
    public isAuthenticated = signal<boolean>(false);
    public isAuthorized = signal<boolean>(false);
    public userProfile = signal<UserProfile | null>(null);
    
    public isScriptLoaded = signal<boolean>(false);
    public isInitializing = signal<boolean>(true);
    public isVerifying = signal<boolean>(false);
    public lastActivityAt = signal<number>(0);
    public sessionExpiredByInactivity = signal<boolean>(false);
    public needsInteractiveRefresh = signal<boolean>(false);

    private refreshInProgress: Promise<string | null> | null = null;
    private refreshResolver: ((token: string | null) => void) | null = null;

    private sessionMonitorTimer: any;
    private refreshDeadlineTimer: any;
    private lastRefreshAt = signal<number>(0);

    constructor() {
        this.initializeAuthState();
        this.loadGoogleScript();
        this.setupInactivityTracker();
        this.setupTabSync();
        this.scheduleSessionRefresh();

        // Safety timeout to prevent stuck splash screen
        setTimeout(() => {
            if (this.isInitializing()) {
                console.warn('[Auth] Initialization safety timeout reached.');
                this.isInitializing.set(false);
            }
        }, 10000); // 10 seconds
    }

    private initializeAuthState() {
        const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
        const expiresAt = parseInt(localStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRES_AT) || '0', 10);
        const profileStr = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
        const lastActivity = parseInt(localStorage.getItem(STORAGE_KEYS.LAST_ACTIVITY_AT) || '0', 10);
        const lastRefresh = parseInt(localStorage.getItem(STORAGE_KEYS.LAST_REFRESH_AT) || '0', 10);
        const isAuthorizedLocal = localStorage.getItem(STORAGE_KEYS.IS_AUTHORIZED) === 'true';

        this.lastActivityAt.set(lastActivity);
        this.lastRefreshAt.set(lastRefresh);
        this.tokenExpiresAt.set(expiresAt);

        // 1. Check absolute inactivity
        if (this.checkInactivity(lastActivity)) {
            console.warn('[Auth] Session expired by inactivity.');
            this.clearLocalSession();
            this.sessionExpiredByInactivity.set(true);
            this.isInitializing.set(false);
            return;
        }

        // 2. Initial state from local storage (Optimistic)
        if (profileStr) {
            this.userProfile.set(JSON.parse(profileStr));
            this.isAuthenticated.set(true);
            this.isAuthorized.set(isAuthorizedLocal);
        }

        // 3. Restore token if fresh
        if (token && expiresAt > Date.now()) {
            this.accessToken.set(token);
        }

        // isInitializing stays true until script load completes
    }

    private checkInactivity(lastActivity: number): boolean {
        if (lastActivity <= 0) return false;
        return (Date.now() - lastActivity) > INACTIVITY_LIMIT_MS;
    }

    private setupInactivityTracker() {
        const activityEvents = merge(
            fromEvent(window, 'click'),
            fromEvent(window, 'keydown'),
            fromEvent(window, 'scroll'),
            fromEvent(window, 'touchstart'),
            fromEvent(document, 'visibilitychange').pipe(
                filter(() => document.visibilityState === 'visible')
            )
        );

        let lastUpdate = 0;
        activityEvents.subscribe(() => {
            const now = Date.now();
            if (now - lastUpdate > 30000) {
                this.markUserActivity();
                lastUpdate = now;
            }
        });

        timer(60000, 60000).subscribe(() => {
            if (this.isAuthenticated() && this.checkInactivity(this.lastActivityAt())) {
                this.logoutManual();
            }
        });
    }

    public markUserActivity() {
        const now = Date.now();
        this.lastActivityAt.set(now);
        localStorage.setItem(STORAGE_KEYS.LAST_ACTIVITY_AT, now.toString());
    }

    private setupTabSync() {
        fromEvent<StorageEvent>(window, 'storage').subscribe(event => {
            if (event.key === STORAGE_KEYS.ACCESS_TOKEN) {
                if (!event.newValue) {
                    this.syncSessionFromStorage(); // Actualiza señales locales
                } else {
                    this.syncSessionFromStorage();
                }
            }
        });
    }

    private syncSessionFromStorage() {
        const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
        const expiresAt = parseInt(localStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRES_AT) || '0', 10);
        const profileStr = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
        const isAuth = localStorage.getItem(STORAGE_KEYS.IS_AUTHORIZED) === 'true';
        
        if (profileStr) {
            this.userProfile.set(JSON.parse(profileStr));
            this.isAuthenticated.set(true);
            this.isAuthorized.set(isAuth);
            this.accessToken.set(token);
            this.tokenExpiresAt.set(expiresAt);
            
            const lastRefresh = parseInt(localStorage.getItem(STORAGE_KEYS.LAST_REFRESH_AT) || '0', 10);
            this.lastRefreshAt.set(lastRefresh);
            this.scheduleSessionRefresh();
        } else {
            this.accessToken.set(null);
            this.isAuthenticated.set(false);
            this.isAuthorized.set(false);
            this.userProfile.set(null);
        }
    }

    private loadGoogleScript() {
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = async () => {
            this.initGsiIdentity();
            this.initTokenClient();
            this.isScriptLoaded.set(true);
            
            // PROACTIVE SESSION REFRESH
            // If we have a local session but no valid token, 
            // we try to refresh BEFORE removing the splash screen.
            if (this.isAuthenticated() && (!this.accessToken() || this.tokenExpiresAt() < (Date.now() + REFRESH_THRESHOLD_MS))) {
                console.log('[Auth] Authenticated session found. Attempting background refresh...');
                try {
                    // We wait for the refresh attempt. 
                    // This keeps the Splash Screen visible while working.
                    await firstValueFrom(this.ensureValidAccessToken());
                } catch (err) {
                    console.warn('[Auth] Background refresh during bootstrap failed:', err);
                }
            }

            this.isInitializing.set(false);
        };
        script.onerror = () => {
            this.isInitializing.set(false);
        };
        document.head.appendChild(script);
    }

    private initGsiIdentity() {
        google.accounts.id.initialize({
            client_id: environment.googleOAuthClientId,
            auto_select: false, // Changed to false to avoid automatic popups/aborts
            callback: (response: any) => {
                if (response.credential) {
                    // Identity confirmed
                }
            }
        });
    }

    private initTokenClient() {
        this.tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: environment.googleOAuthClientId,
            scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
            callback: (tokenResponse: any) => {
                if (tokenResponse && tokenResponse.access_token) {
                    this.handleTokenResponse(tokenResponse);
                } else if (tokenResponse.error) {
                    console.error('[Auth] GSI callback error:', tokenResponse.error);
                    this.resolveRefresh(null);
                }
            },
        });
    }

    private async handleTokenResponse(tokenResponse: any) {
        this.needsInteractiveRefresh.set(false);
        const token = tokenResponse.access_token;
        const expiresIn = tokenResponse.expires_in || 3599;
        const expiresAt = Date.now() + (expiresIn * 1000);
        
        this.accessToken.set(token);
        this.tokenExpiresAt.set(expiresAt);
        localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
        localStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRES_AT, expiresAt.toString());
        
        const now = Date.now();
        this.lastRefreshAt.set(now);
        localStorage.setItem(STORAGE_KEYS.LAST_REFRESH_AT, now.toString());
        
        this.markUserActivity();
        this.clearRefreshDeadline();
        this.scheduleSessionRefresh();

        // Check if we need to fetch/verify profile
        if (!this.userProfile() || !this.isAuthorized()) {
            try {
                await firstValueFrom(this.verifyFullSession(token));
            } catch (err) {
                console.error('[Auth] Error during full session verification:', err);
            }
        }
        
        // Resolve refresh ONLY AFTER verification is attempt (if needed)
        this.resolveRefresh(token);
    }

    private resolveRefresh(token: string | null) {
        if (this.refreshInProgress) {
            if (this.refreshResolver) this.refreshResolver(token);
            this.refreshResolver = null;
            this.refreshInProgress = null;
        }
    }

    private verifyFullSession(token: string): Observable<boolean> {
        this.isVerifying.set(true);
        return this.fetchUserProfile(token).pipe(
            switchMap((profile: UserProfile): Observable<boolean> => {
                this.userProfile.set(profile);
                this.isAuthenticated.set(true);
                localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
                
                const isOwner = this.isOwnerEmail(profile.email);
                if (!isOwner) {
                    this.isAuthorized.set(false);
                    localStorage.setItem(STORAGE_KEYS.IS_AUTHORIZED, 'false');
                    return of(false);
                }

                return this.verifySpreadsheetAccess(token).pipe(
                    tap((hasAccess) => {
                        this.isAuthorized.set(hasAccess);
                        localStorage.setItem(STORAGE_KEYS.IS_AUTHORIZED, hasAccess.toString());
                    })
                );
            }),
            tap({
                next: () => this.isVerifying.set(false),
                error: () => this.isVerifying.set(false),
                complete: () => this.isVerifying.set(false)
            }),
            catchError((err: any) => {
                this.isVerifying.set(false);
                return of(false);
            })
        );
    }

    private isOwnerEmail(email: string): boolean {
        const authorizedEmail = (environment.authorizedOwnerEmail || '').toLowerCase().trim();
        const userEmail = (email || '').toLowerCase().trim();
        return authorizedEmail !== '' && userEmail === authorizedEmail;
    }

    private verifySpreadsheetAccess(token: string): Observable<boolean> {
        const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
        return this.http.get<any>(
            `https://sheets.googleapis.com/v4/spreadsheets/${environment.spreadsheetId}/values/A1`,
            { headers }
        ).pipe(
            map(() => true),
            catchError(() => of(false))
        );
    }

    public loginInteractive() {
        if (this.tokenClient) {
            // Explicitly prompt to allow user gesture to work 100%
            this.tokenClient.requestAccessToken({ prompt: 'select_account' });
        }
    }

    public logoutManual() {
        const token = this.accessToken();
        if (token) {
            try { google.accounts.oauth2.revoke(token, () => {}); } catch (e) {}
        }
        this.clearLocalSession();
        window.location.href = '/login';
    }

    public clearLocalSession() {
        this.accessToken.set(null);
        this.tokenExpiresAt.set(0);
        this.isAuthenticated.set(false);
        this.isAuthorized.set(false);
        this.userProfile.set(null);
        this.needsInteractiveRefresh.set(false);
        
        localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.TOKEN_EXPIRES_AT);
        localStorage.removeItem(STORAGE_KEYS.USER_PROFILE);
        localStorage.removeItem(STORAGE_KEYS.IS_AUTHORIZED);
        localStorage.removeItem(STORAGE_KEYS.LAST_ACTIVITY_AT);
        localStorage.removeItem(STORAGE_KEYS.LAST_REFRESH_AT);
        
        this.clearRefreshDeadline();
        if (this.sessionMonitorTimer) {
            clearTimeout(this.sessionMonitorTimer);
            this.sessionMonitorTimer = null;
        }
    }

    private fetchUserProfile(token: string): Observable<UserProfile> {
        const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
        return this.http.get<any>('https://www.googleapis.com/oauth2/v3/userinfo', { headers }).pipe(
            map(res => ({
                email: res.email,
                name: res.name,
                picture: res.picture
            }))
        );
    }

    public ensureValidAccessToken(): Observable<string | null> {
        const token = this.accessToken();
        const expiresAt = this.tokenExpiresAt();

        // If token is mathematically valid (with 1 minute grace period), just use it.
        // The proactive renewal is handled asynchronously by scheduleSessionRefresh().
        // If the token is rejected early by Google, the auth.interceptor will catch the 401.
        if (token && expiresAt > (Date.now() + 60000)) {
            return of(token);
        }

        // Only block the request and force a renewal if the token is completely expired.
        console.warn('[Auth] Token is expired. Forcing silent renewal before request.');
        return this.silentRenew();
    }

    public silentRenew(): Observable<string | null> {
        if (this.refreshInProgress) {
            return from(this.refreshInProgress);
        }

        if (!this.isAuthenticated()) {
            return of(null);
        }

        this.refreshInProgress = new Promise((resolve) => {
            if (!this.tokenClient) {
                console.warn('[Auth] No token client available for renewal.');
                resolve(null);
                return;
            }

            this.refreshResolver = resolve;
            
            // CRITICAL: We use prompt: 'none' but we MUST catch the GSI failure
            // to open a popup when a gesture was expected.
            try {
                this.tokenClient.requestAccessToken({ 
                    prompt: 'none',
                    login_hint: this.userProfile()?.email || '',
                    include_granted_scopes: true, // Ensured we keep requested scopes
                    enable_granular_consent: false
                });
                
                // Set a timeout to resolve if GIS hangs or fails silently
                setTimeout(() => {
                    if (this.refreshInProgress) {
                        console.log('[Auth] Silent renew timed out after 15 seconds (likely blocked or needs interaction).');
                        this.resolveRefresh(null);
                    }
                }, 15000); // 15 seconds as requested by user

            } catch (err) {
                console.error('[Auth] Error during silent renewal request:', err);
                this.resolveRefresh(null);
            }
        });

        return from(this.refreshInProgress).pipe(
            tap((token: string | null) => {
                if (!token && this.isAuthenticated()) {
                    // We don't automatically log out here. 
                    // Let the HTTP Interceptor handle it if a request fails with 401.
                    console.warn('[Auth] Silent renew failed to obtain token.');
                    this.needsInteractiveRefresh.set(true);
                }
            })
        );
    }

    private scheduleSessionRefresh() {
        if (!this.isAuthenticated()) return;

        if (this.sessionMonitorTimer) {
            clearTimeout(this.sessionMonitorTimer);
        }

        // Try to refresh 15 minutes before expiration (tokens usually last 60 minutes)
        const timeUntilExpiry = this.tokenExpiresAt() - Date.now();
        // If expired or expiring in less than 15 mins, refresh in 5 seconds.
        // Otherwise, schedule it to run 15 mins before expiry.
        const delay = timeUntilExpiry > REFRESH_THRESHOLD_MS 
            ? timeUntilExpiry - REFRESH_THRESHOLD_MS 
            : 5000; 

        // Run outside Angular to avoid unnecessary change detection cycles
        this.zone.runOutsideAngular(() => {
            this.sessionMonitorTimer = setTimeout(() => {
                this.executeBackgroundRefresh();
            }, Math.max(0, delay));
        });
    }

    private executeBackgroundRefresh() {
        if (!this.isAuthenticated()) return;

        console.log('[Auth] Triggering scheduled background session refresh...');

        // Trigger the silent renewal
        this.silentRenew().subscribe({
            next: (token) => {
                if (token) {
                    console.log('[Auth] Scheduled background refresh successful.');
                } else {
                    console.warn('[Auth] Scheduled background refresh failed. Will wait for interceptor to catch 401.');
                }
            },
            error: (err) => {
                console.error('[Auth] Error during scheduled background refresh:', err);
            }
        });
    }

    private clearRefreshDeadline() {
        if (this.refreshDeadlineTimer) {
            clearTimeout(this.refreshDeadlineTimer);
            this.refreshDeadlineTimer = null;
        }
    }
}
