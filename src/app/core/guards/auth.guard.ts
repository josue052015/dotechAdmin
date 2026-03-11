import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { GoogleAuthService } from '../services/google-auth.service';

export const authGuard: CanActivateFn = (route, state) => {
    const auth = inject(GoogleAuthService);
    const router = inject(Router);

    if (auth.isAuthenticated()) {
        return true;
    }

    // Not logged in, redirect to login page.
    router.navigate(['/login']);
    return false;
};
