import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { GoogleAuthService } from '../services/google-auth.service';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, map, switchMap, take, catchError } from 'rxjs/operators';
import { of, Observable } from 'rxjs';

export const ownerGuard: CanActivateFn = () => {
  const auth = inject(GoogleAuthService);
  const router = inject(Router);

  return toObservable(auth.isInitializing).pipe(
    filter(isInitializing => !isInitializing),
    take(1),
    switchMap(() => {
      // 1. Fully Authorized
      if (auth.isAuthorized()) {
        return auth.ensureValidAccessToken().pipe(
            map(token => {
                if (token) {
                    return true;
                }
                return router.createUrlTree(['/login']);
            })
        );
      }

      // 2. Authenticated but Explicitly NOT Authorized
      if (auth.isAuthenticated() && !auth.isAuthorized()) {
        return of(router.createUrlTree(['/access-denied']));
      }

      // 4. Default to Login
      return of(router.createUrlTree(['/login']));
    })
  );
};
