import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { GoogleAuthService } from '../services/google-auth.service';

export const authGuard: CanActivateFn = (route, state) => {
    const auth = inject(GoogleAuthService);
    const router = inject(Router);

    // If we haven't checked sessionStorage yet, the component init of GoogleAuthService handles it.
    // But wait! We need a small check.
    const storedToken = sessionStorage.getItem('google_access_token');

    if (auth.isAuthenticated() || storedToken) {
        return true;
    }

    // Not logged in, redirect to login page.
    router.navigate(['/login']);
    return false;
};
