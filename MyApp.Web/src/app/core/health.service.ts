import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../environments/environment';

export type ApiStatus = 'unknown' | 'up' | 'down';

@Injectable({ providedIn: 'root' })
export class HealthService {
  private readonly http = inject(HttpClient);

  /** GET /health/ready: 200 "Healthy" when the API and its database are reachable. */
  check(): Observable<ApiStatus> {
    return this.http.get(environment.healthUrl, { responseType: 'text' }).pipe(
      map((): ApiStatus => 'up'),
      catchError(() => of<ApiStatus>('down')),
    );
  }
}
