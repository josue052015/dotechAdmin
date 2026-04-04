import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { GoogleAuthService } from '../services/google-auth.service';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, map, switchMap, take } from 'rxjs/operators';
import { of } from 'rxjs';

export const authGuard: CanActivateFn = () => {
  const auth = inject(GoogleAuthService);
  const router = inject(Router);

  return toObservable(auth.isInitializing).pipe(
    filter(isInitializing => !isInitializing),
    take(1),
    switchMap(() => {
      if (auth.isAuthenticated()) {
        return of(true);
      }
      return of(router.createUrlTree(['/login']));
    })
  );
};
