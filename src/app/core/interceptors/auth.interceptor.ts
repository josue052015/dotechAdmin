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
                    // If we are authenticated and not on the login page, we force a redirect
                    // to avoid the "blank screen" caused by failed data requests.
                    if (router.url !== '/login' && auth.isAuthenticated()) {
                        console.warn('[Auth] Token expired and silent renewal failed. Redirecting to login.');
                        auth.logoutManual();
                    }
                    return throwError(() => error);
                  }),
                  catchError((renewalErr) => {
                    // Even if silentRenew errors out, we should consider logout if on a protected route
                    if (router.url !== '/login' && auth.isAuthenticated()) {
                        auth.logoutManual();
                    }
                    return throwError(() => error);
                  })
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
