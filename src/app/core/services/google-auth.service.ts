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
        this.loadGoogleScript();
    }

    private loadGoogleScript() {
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => {
            this.initTokenClient();
            this.isScriptLoaded.set(true);
            // Try to recover token from session storage
            const storedToken = sessionStorage.getItem('google_access_token');
            if (storedToken) {
                this.accessToken.set(storedToken);
                this.isAuthenticated.set(true);
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
                    sessionStorage.setItem('google_access_token', tokenResponse.access_token);
                }
            },
        });
    }

    public login() {
        if (this.tokenClient) {
            this.tokenClient.requestAccessToken();
        }
    }

    public logout() {
        const token = this.accessToken();
        if (token) {
            google.accounts.oauth2.revoke(token, () => {
                this.accessToken.set(null);
                this.isAuthenticated.set(false);
                sessionStorage.removeItem('google_access_token');
            });
        }
    }
}
