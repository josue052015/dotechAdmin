import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { GoogleAuthService } from '../services/google-auth.service';

export const ownerGuard: CanActivateFn = () => {
  const auth = inject(GoogleAuthService);
  const router = inject(Router);

  if (auth.isAuthorized()) {
    return true;
  }

  return router.createUrlTree(['/access-denied']);
};
