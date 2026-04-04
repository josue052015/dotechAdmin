import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { GoogleAuthService } from '../services/google-auth.service';
import { catchError, switchMap, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(GoogleAuthService);

  // Only intercept requests to Google APIs
  if (!req.url.includes('googleapis.com')) {
    return next(req);
  }

  return authService.ensureValidAccessToken().pipe(
    switchMap(token => {
      if (!token) {
        return next(req);
      }

      const authReq = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });

      return next(authReq).pipe(
        catchError((error: HttpErrorResponse) => {
          if (error.status === 401) {
            console.warn('[Interceptor] 401 detected, attempting silent renew and retry...');
            return authService.silentRenew().pipe(
              switchMap(newToken => {
                if (newToken) {
                  const retryReq = req.clone({
                    setHeaders: {
                      Authorization: `Bearer ${newToken}`
                    }
                  });
                  return next(retryReq);
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
};
