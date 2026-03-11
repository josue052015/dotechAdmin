import { Injectable, signal } from '@angular/core';
import { environment } from '../../../environments/environment';

declare var google: any;

@Injectable({
    providedIn: 'root'
})
export class GoogleAuthService {
    private tokenClient: any;
    public accessToken = signal<string | null>(null);
    public isAuthenticated = signal<boolean>(false);
    public isScriptLoaded = signal<boolean>(false);

    constructor() {
        this.loadTokenFromStorage();
        this.loadGoogleScript();
    }

    private loadTokenFromStorage() {
        const storedToken = localStorage.getItem('google_access_token');
        const expiresAtStr = localStorage.getItem('google_token_expires_at');
        const expiresAt = expiresAtStr ? parseInt(expiresAtStr, 10) : 0;

        if (storedToken && expiresAt > Date.now()) {
            this.accessToken.set(storedToken);
            this.isAuthenticated.set(true);
        }
    }

    private loadGoogleScript() {
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => {
            this.initTokenClient();
            this.isScriptLoaded.set(true);
            
            const storedToken = localStorage.getItem('google_access_token');
            const expiresAtStr = localStorage.getItem('google_token_expires_at');
            const expiresAt = expiresAtStr ? parseInt(expiresAtStr, 10) : 0;

            if (storedToken && expiresAt <= Date.now()) {
                this.autoRenewToken();
            }
        };
        document.head.appendChild(script);
    }

    private initTokenClient() {
        this.tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: environment.googleOAuthClientId,
            scope: 'https://www.googleapis.com/auth/spreadsheets',
            callback: (tokenResponse: any) => {
                if (tokenResponse && tokenResponse.access_token) {
                    this.accessToken.set(tokenResponse.access_token);
                    this.isAuthenticated.set(true);
                    
                    const expiresIn = tokenResponse.expires_in || 3599;
                    const expiresAt = Date.now() + (expiresIn * 1000);
                    
                    localStorage.setItem('google_access_token', tokenResponse.access_token);
                    localStorage.setItem('google_token_expires_at', expiresAt.toString());
                }
            },
        });
    }

    public login() {
        if (this.tokenClient) {
            this.tokenClient.requestAccessToken({ prompt: 'consent' });
        }
    }

    public autoRenewToken() {
        if (this.tokenClient) {
            // Request token silently if possible
            this.tokenClient.requestAccessToken({ prompt: '' });
        }
    }

    public logout() {
        const token = this.accessToken();
        if (token) {
            google.accounts.oauth2.revoke(token, () => {
                this.accessToken.set(null);
                this.isAuthenticated.set(false);
                localStorage.removeItem('google_access_token');
                localStorage.removeItem('google_token_expires_at');
            });
        }
    }
}
