import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { GoogleAuthService } from '../services/google-auth.service';
import { catchError, switchMap, throwError, of, filter, take, mergeMap } from 'rxjs';
import { toObservable } from '@angular/core/rxjs-interop';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(GoogleAuthService);
  const router = inject(Router);

  // 1. Only intercept requests to Google APIs
  if (!req.url.includes('googleapis.com')) {
    return next(req);
  }

  // 2. Wait for auth initialization before making any Google request
  // This prevents race conditions where components request data while 
  // we are still trying to restore the session.
  return toObservable(auth.isInitializing).pipe(
    filter(initializing => !initializing),
    take(1),
    switchMap(() => {
      // 3. Check for valid token
      return auth.ensureValidAccessToken().pipe(
        switchMap(token => {
          if (!token) {
            // No token available. If we are authenticated (identidad confirmada), 
            // but have no access token (permiso denegado/expirado), we let the guard handle it.
            return next(req); 
          }

          const authReq = req.clone({
            setHeaders: { Authorization: `Bearer ${token}` }
          });

          return next(authReq).pipe(
            catchError((error: HttpErrorResponse) => {
              // 4. Handle 401 manually
              if (error.status === 401) {
                // If we get here, it means the token we thought was valid is actually rejected.
                // We try ONE silent renewal.
                return auth.silentRenew().pipe(
                  switchMap(newToken => {
                    if (newToken) {
                      const retryReq = req.clone({
                        setHeaders: { Authorization: `Bearer ${newToken}` }
                      });
                      return next(retryReq);
                    }
                    
                    // Renewal failed (likely blocked or needs interaction).
                    // We DO NOT force a redirect here if we are not authenticated at all.
                    // But if we WERE authenticated, we should probably inform the user.
                    if (router.url !== '/login' && auth.isAuthenticated()) {
                        // Just fail the request. The UI should show an error or the guard will catch it.
                    }
                    return throwError(() => error);
                  }),
                  catchError(() => throwError(() => error))
                );
              }
              return throwError(() => error);
            })
          );
        })
      );
    })
  );
};
