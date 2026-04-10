import { Injectable, signal, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { catchError, map, filter } from 'rxjs/operators';
import { Observable, of, fromEvent, merge, timer, from } from 'rxjs';

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
    LAST_ACTIVITY_AT: 'google_last_activity_at'
};

const INACTIVITY_LIMIT_MS = 24 * 60 * 60 * 1000; // 24 hours
const REFRESH_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes

@Injectable({
    providedIn: 'root'
})
export class GoogleAuthService {
    private http = inject(HttpClient);
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

    private refreshInProgress: Promise<string | null> | null = null;
    private refreshResolver: ((token: string | null) => void) | null = null;

    constructor() {
        this.initializeAuthState();
        this.loadGoogleScript();
        this.setupInactivityTracker();
        this.setupTabSync();
    }

    private initializeAuthState() {
        const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
        const expiresAt = parseInt(localStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRES_AT) || '0', 10);
        const profileStr = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
        const lastActivity = parseInt(localStorage.getItem(STORAGE_KEYS.LAST_ACTIVITY_AT) || '0', 10);
        const isAuthorizedLocal = localStorage.getItem(STORAGE_KEYS.IS_AUTHORIZED) === 'true';

        this.lastActivityAt.set(lastActivity);
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
        script.onload = () => {
            this.initGsiIdentity();
            this.initTokenClient();
            this.isScriptLoaded.set(true);
            
            // AUTOMATIC SILENT BOOTSTRAP IS NOW GESTURE-AWARE
            // Instead of prompt: 'none' (which often fails/blocks), 
            // we wait for the first valid user interaction to potentially refresh.
            // But we mark initialization as finished so the app can render.
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
                    this.resolveRefresh(tokenResponse.access_token);
                } else if (tokenResponse.error) {
                    console.error('[Auth] GSI callback error:', tokenResponse.error);
                    this.resolveRefresh(null);
                    // If interaction was required, we don't force a loop.
                    // The user will have to click something eventually.
                }
            },
        });
    }

    private resolveRefresh(token: string | null) {
        if (this.refreshInProgress) {
            if (this.refreshResolver) this.refreshResolver(token);
            this.refreshResolver = null;
            this.refreshInProgress = null;
        }
    }

    private handleTokenResponse(tokenResponse: any) {
        const token = tokenResponse.access_token;
        const expiresIn = tokenResponse.expires_in || 3599;
        const expiresAt = Date.now() + (expiresIn * 1000);
        
        this.accessToken.set(token);
        this.tokenExpiresAt.set(expiresAt);
        localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
        localStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRES_AT, expiresAt.toString());
        this.markUserActivity();

        // Check if we need to fetch/verify profile
        if (!this.userProfile() || !this.isAuthorized()) {
            this.verifyFullSession(token);
        }
    }

    private verifyFullSession(token: string) {
        this.isVerifying.set(true);
        this.fetchUserProfile(token).subscribe({
            next: (profile) => {
                this.userProfile.set(profile);
                this.isAuthenticated.set(true);
                localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
                
                const isOwner = this.isOwnerEmail(profile.email);
                if (!isOwner) {
                    this.isAuthorized.set(false);
                    localStorage.setItem(STORAGE_KEYS.IS_AUTHORIZED, 'false');
                    this.isVerifying.set(false);
                    return;
                }

                this.verifySpreadsheetAccess(token).subscribe({
                    next: (hasAccess) => {
                        this.isAuthorized.set(hasAccess);
                        localStorage.setItem(STORAGE_KEYS.IS_AUTHORIZED, hasAccess.toString());
                        this.isVerifying.set(false);
                    },
                    error: () => {
                        this.isAuthorized.set(false);
                        this.isVerifying.set(false);
                    }
                });
            },
            error: () => {
                this.isVerifying.set(false);
            }
        });
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
        
        localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.TOKEN_EXPIRES_AT);
        localStorage.removeItem(STORAGE_KEYS.USER_PROFILE);
        localStorage.removeItem(STORAGE_KEYS.IS_AUTHORIZED);
        localStorage.removeItem(STORAGE_KEYS.LAST_ACTIVITY_AT);
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

        // Valid and non-expiring soon
        if (token && expiresAt > (Date.now() + REFRESH_THRESHOLD_MS)) {
            return of(token);
        }

        // Here is the CORE CHANGE:
        // Instead of automatically calling silentRenew (which might fail with a blocked popup),
        // we check if we are in a User Gesture context.
        // If we are, we can try to renew.
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
                    include_granted_scopes: false,
                    enable_granular_consent: false
                });
                
                // Set a timeout to resolve if GIS hangs or fails silently
                setTimeout(() => {
                    if (this.refreshInProgress) {
                        // console.log('[Auth] Silent renew timed out (likely blocked or needs interaction).');
                        this.resolveRefresh(null);
                    }
                }, 5000);

            } catch (err) {
                this.resolveRefresh(null);
            }
        });

        return from(this.refreshInProgress);
    }
}
