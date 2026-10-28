import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

/** Auth endpoints that must not carry (or trigger a refresh of) a bearer token. /auth/me is protected. */
const isPublicAuthCall = (url: string): boolean =>
  url.startsWith(`${environment.apiUrl}/auth/`) && !url.endsWith('/auth/me');

/**
 * Adds the bearer token to API calls. On a 401 it refreshes once and replays the request;
 * if that fails the session is dropped and the user is sent to the login page.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);

  if (!req.url.startsWith(environment.apiUrl) || isPublicAuthCall(req.url)) {
    return next(req);
  }

  const send = (token: string | null) =>
    next(token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req);

  return send(auth.accessToken()).pipe(
    catchError((err: unknown) => {
      if (!(err instanceof HttpErrorResponse) || err.status !== 401) {
        return throwError(() => err);
      }
      if (!auth.hasRefreshToken()) {
        auth.expire();
        return throwError(() => err);
      }
      return auth.refresh().pipe(
        switchMap((r) => send(r.accessToken)),
        catchError((refreshErr: unknown) => {
          auth.expire();
          return throwError(() => refreshErr);
        }),
      );
    }),
  );
};
