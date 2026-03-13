import { Injectable, signal, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { catchError, map } from 'rxjs/operators';
import { Observable, of } from 'rxjs';

declare var google: any;

interface UserProfile {
    email: string;
    name: string;
    picture: string;
}

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

    constructor() {
        this.loadAuthState();
        this.loadGoogleScript();
    }

    private loadAuthState() {
        const token = localStorage.getItem('google_access_token');
        const expiresAt = parseInt(localStorage.getItem('google_token_expires_at') || '0', 10);
        const profileStr = localStorage.getItem('google_user_profile');

        if (token && expiresAt > Date.now() && profileStr) {
            const profile: UserProfile = JSON.parse(profileStr);
            this.accessToken.set(token);
            this.userProfile.set(profile);
            this.isAuthenticated.set(true);
            
            // Always verify ownership by email on restore
            const isOwner = this.isOwnerEmail(profile.email);
            this.isAuthorized.set(isOwner);
            localStorage.setItem('google_is_authorized', isOwner.toString());
            
            if (!isOwner) {
                console.warn('[Auth] Restored session is NOT the owner. Access denied.');
            }
        }
        this.isInitializing.set(false);
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
                }
            },
        });
    }

    private handleTokenResponse(tokenResponse: any) {
        this.accessToken.set(tokenResponse.access_token);
        const expiresIn = tokenResponse.expires_in || 3599;
        const expiresAt = Date.now() + (expiresIn * 1000);
        
        localStorage.setItem('google_access_token', tokenResponse.access_token);
        localStorage.setItem('google_token_expires_at', expiresAt.toString());

        this.isVerifying.set(true);

        this.fetchUserProfile(tokenResponse.access_token).subscribe({
            next: (profile) => {
                console.log('[Auth] User authenticated:', profile.email);
                this.userProfile.set(profile);
                this.isAuthenticated.set(true);
                localStorage.setItem('google_user_profile', JSON.stringify(profile));
                
                // PRIMARY CHECK: Is this the owner's email?
                const isOwner = this.isOwnerEmail(profile.email);
                console.log('[Auth] Owner email check:', isOwner ? 'MATCH ✓' : 'NO MATCH ✗');
                console.log('[Auth] Logged in as:', profile.email);
                console.log('[Auth] Authorized owner:', (environment as any).authorizedOwnerEmail);

                if (!isOwner) {
                    console.warn('[Auth] ACCESS DENIED — Email does not match the authorized owner.');
                    this.isAuthorized.set(false);
                    this.isVerifying.set(false);
                    localStorage.setItem('google_is_authorized', 'false');
                    return;
                }

                // SECONDARY CHECK: Can this user actually access the spreadsheet?
                this.verifySpreadsheetAccess(tokenResponse.access_token).subscribe({
                    next: (hasAccess) => {
                        console.log('[Auth] Spreadsheet access:', hasAccess ? 'CONFIRMED ✓' : 'DENIED ✗');
                        this.isAuthorized.set(hasAccess);
                        this.isVerifying.set(false);
                        localStorage.setItem('google_is_authorized', hasAccess.toString());
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

    /**
     * Checks if the given email matches the configured authorized owner.
     * This is the PRIMARY authorization gate — only the exact owner email is allowed.
     */
    private isOwnerEmail(email: string): boolean {
        const authorizedEmail = ((environment as any).authorizedOwnerEmail || '').toLowerCase().trim();
        const userEmail = (email || '').toLowerCase().trim();
        return authorizedEmail !== '' && userEmail === authorizedEmail;
    }

    /**
     * SECONDARY check: verifies the user can actually read the spreadsheet.
     * This confirms the owner still has valid access to the sheet.
     */
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
        
        this.accessToken.set(null);
        this.isAuthenticated.set(false);
        this.isAuthorized.set(false);
        this.userProfile.set(null);
        
        localStorage.removeItem('google_access_token');
        localStorage.removeItem('google_token_expires_at');
        localStorage.removeItem('google_user_profile');
        localStorage.removeItem('google_is_authorized');
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

    public autoRenewToken() {
        if (this.tokenClient) {
            this.tokenClient.requestAccessToken({ prompt: '' });
        }
    }
}
