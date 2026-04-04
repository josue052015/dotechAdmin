import { Injectable, signal, inject, computed, effect } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { catchError, map, filter, switchMap, take, tap } from 'rxjs/operators';
import { Observable, of, fromEvent, merge, BehaviorSubject, firstValueFrom, throwError, timer } from 'rxjs';
import { toObservable } from '@angular/core/rxjs-interop';

declare var google: any;

interface UserProfile {
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
const REFRESH_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

@Injectable({
    providedIn: 'root'
})
export class GoogleAuthService {
    private http = inject(HttpClient);
    private tokenClient: any;
    
    public accessToken = signal<string | null>(null);
    public isAuthenticated = signal<boolean>(false);
    public isAuthorized = signal<boolean>(false);
    public userProfile = signal<UserProfile | null>(null);
    public isScriptLoaded = signal<boolean>(false);
    public isInitializing = signal<boolean>(true);
    public isVerifying = signal<boolean>(false);
    public lastActivityAt = signal<number>(Date.now());

    private refreshInProgress: Promise<string | null> | null = null;

    constructor() {
        this.loadAuthState();
        this.loadGoogleScript();
        this.setupInactivityTracker();
        this.setupTabSync();
    }

    private loadAuthState() {
        const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
        const expiresAt = parseInt(localStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRES_AT) || '0', 10);
        const profileStr = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
        const lastActivity = parseInt(localStorage.getItem(STORAGE_KEYS.LAST_ACTIVITY_AT) || '0', 10);

        // Check if session is expired by inactivity first
        if (lastActivity > 0 && (Date.now() - lastActivity) > INACTIVITY_LIMIT_MS) {
            console.warn('[Auth] Session expired due to 24h inactivity.');
            this.clearSession();
            this.isInitializing.set(false);
            return;
        }

        if (token && expiresAt > Date.now() && profileStr) {
            const profile: UserProfile = JSON.parse(profileStr);
            this.accessToken.set(token);
            this.userProfile.set(profile);
            this.isAuthenticated.set(true);
            this.lastActivityAt.set(lastActivity || Date.now());
            
            const isOwner = this.isOwnerEmail(profile.email);
            this.isAuthorized.set(isOwner);
            localStorage.setItem(STORAGE_KEYS.IS_AUTHORIZED, isOwner.toString());
            
            this.isInitializing.set(false);
        } else if (token && profileStr) {
            // Token expired but session window still valid - will be handled by guards/interceptor via silent renew
            this.lastActivityAt.set(lastActivity);
            this.isAuthenticated.set(true);
            this.isInitializing.set(false);
        } else {
            this.isInitializing.set(false);
        }
    }

    private setupInactivityTracker() {
        // Track activity: click, keydown, scroll, touchstart
        const activityEvents = merge(
            fromEvent(window, 'click'),
            fromEvent(window, 'keydown'),
            fromEvent(window, 'scroll'),
            fromEvent(window, 'touchstart')
        );

        // Update activity with throttling (every 30 seconds max)
        let lastUpdate = 0;
        activityEvents.subscribe(() => {
            const now = Date.now();
            if (now - lastUpdate > 30000) {
                this.updateActivity();
                lastUpdate = now;
            }
        });

        // Periodic check for inactivity (every minute)
        timer(0, 60000).subscribe(() => {
            this.checkInactivity();
        });
    }

    private updateActivity() {
        const now = Date.now();
        this.lastActivityAt.set(now);
        localStorage.setItem(STORAGE_KEYS.LAST_ACTIVITY_AT, now.toString());
    }

    private checkInactivity() {
        const last = this.lastActivityAt();
        if (last > 0 && (Date.now() - last) > INACTIVITY_LIMIT_MS) {
            console.warn('[Auth] Session expired due to inactivity.');
            this.clearSession();
            window.location.href = '/login'; // Force redirect to be sure
        }
    }

    private setupTabSync() {
        fromEvent<StorageEvent>(window, 'storage').subscribe(event => {
            if (event.key === STORAGE_KEYS.ACCESS_TOKEN) {
                if (event.newValue) {
                    this.loadAuthState();
                } else {
                    this.clearSession(false);
                }
            }
        });
    }

    private loadGoogleScript() {
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => {
            this.initTokenClient();
            this.isScriptLoaded.set(true);
        };
        document.head.appendChild(script);
    }

    private initTokenClient() {
        this.tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: environment.googleOAuthClientId,
            scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
            callback: (tokenResponse: any) => {
                if (tokenResponse && tokenResponse.access_token) {
                    this.handleTokenResponse(tokenResponse);
                } else if (tokenResponse.error) {
                    console.error('[Auth] Token request error:', tokenResponse.error);
                    this.handleRefreshFailure();
                }
            },
        });
    }

    private handleTokenResponse(tokenResponse: any) {
        const token = tokenResponse.access_token;
        this.accessToken.set(token);
        const expiresIn = tokenResponse.expires_in || 3599;
        const expiresAt = Date.now() + (expiresIn * 1000);
        
        localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
        localStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRES_AT, expiresAt.toString());
        this.updateActivity();

        if (this.refreshInProgress) {
            // This was a silent renew call
            return; 
        }

        this.isVerifying.set(true);
        this.fetchUserProfile(token).subscribe({
            next: (profile) => {
                this.userProfile.set(profile);
                this.isAuthenticated.set(true);
                localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
                
                const isOwner = this.isOwnerEmail(profile.email);
                if (!isOwner) {
                    this.isAuthorized.set(false);
                    this.isVerifying.set(false);
                    localStorage.setItem(STORAGE_KEYS.IS_AUTHORIZED, 'false');
                    return;
                }

                this.verifySpreadsheetAccess(token).subscribe({
                    next: (hasAccess) => {
                        this.isAuthorized.set(hasAccess);
                        this.isVerifying.set(false);
                        localStorage.setItem(STORAGE_KEYS.IS_AUTHORIZED, hasAccess.toString());
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
        const authorizedEmail = ((environment as any).authorizedOwnerEmail || '').toLowerCase().trim();
        const userEmail = (email || '').toLowerCase().trim();
        return authorizedEmail !== '' && userEmail === authorizedEmail;
    }

    private verifySpreadsheetAccess(token: string): Observable<boolean> {
        const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
        const spreadsheetId = environment.spreadsheetId;
        
        return this.http.get<any>(
            `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1`,
            { headers }
        ).pipe(
            map(() => true),
            catchError(err => {
                console.error('[Auth] Spreadsheet access verification failed:', err.status);
                return of(false);
            })
        );
    }

    public login() {
        if (this.tokenClient) {
            this.tokenClient.requestAccessToken({ prompt: 'select_account' });
        }
    }

    public logout() {
        const token = this.accessToken();
        if (token) {
            try {
                google.accounts.oauth2.revoke(token, () => {});
            } catch (e) {}
        }
        this.clearSession();
    }

    private clearSession(broadcast = true) {
        this.accessToken.set(null);
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

    /**
     * Ensures an access token is valid, performing a silent renew if necessary.
     * Uses single-flight pattern to avoid multiple simultaneous refresh requests.
     */
    public ensureValidAccessToken(): Observable<string | null> {
        const token = this.accessToken();
        const expiresAt = parseInt(localStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRES_AT) || '0', 10);
        const lastActivity = this.lastActivityAt();

        // Check inactivity window
        if (lastActivity > 0 && (Date.now() - lastActivity) > INACTIVITY_LIMIT_MS) {
            this.clearSession();
            return of(null);
        }

        // Check if token is still valid and not about to expire soon
        if (token && expiresAt > (Date.now() + REFRESH_THRESHOLD_MS)) {
            return of(token);
        }

        // Silent renew required
        return this.silentRenew();
    }

    public silentRenew(): Observable<string | null> {
        if (this.refreshInProgress) {
            return from(this.refreshInProgress);
        }

        this.refreshInProgress = new Promise((resolve) => {
            if (!this.tokenClient) {
                resolve(null);
                return;
            }

            // Create a one-time listener for the callback
            const originalCallback = this.tokenClient.callback;
            this.tokenClient.callback = (tokenResponse: any) => {
                this.tokenClient.callback = originalCallback;
                if (tokenResponse && tokenResponse.access_token) {
                    this.handleTokenResponse(tokenResponse);
                    resolve(tokenResponse.access_token);
                } else {
                    this.handleRefreshFailure();
                    resolve(null);
                }
                this.refreshInProgress = null;
            };

            this.tokenClient.requestAccessToken({ prompt: '' });
        });

        return from(this.refreshInProgress);
    }

    private handleRefreshFailure() {
        console.error('[Auth] Silent renew failed. User must re-authenticate.');
        this.clearSession();
        // Don't force redirect here, let the interceptor/guard handle it
    }
}

function from<T>(promise: Promise<T>): Observable<T> {
    return new Observable<T>(subscriber => {
        promise.then(
            value => {
                subscriber.next(value);
                subscriber.complete();
            },
            err => subscriber.error(err)
        );
    });
}
