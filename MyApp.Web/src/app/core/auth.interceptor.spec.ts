import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../environments/environment';
import { authInterceptor } from './auth.interceptor';
import { fakeSession } from '../testing/fake-session';

describe('authInterceptor', () => {
  let client: HttpClient;
  let http: HttpTestingController;
  const url = `${environment.apiUrl}/products`;

  const setup = (stored: boolean): void => {
    localStorage.clear();
    if (stored) {
      localStorage.setItem('myapp.session', JSON.stringify(fakeSession('u@b.com', 'User')));
    }
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([{ path: 'login', children: [] }]),
      ],
    });
    client = TestBed.inject(HttpClient);
    http = TestBed.inject(HttpTestingController);
  };

  afterEach(() => http.verify());

  it('adds the bearer token to API calls', () => {
    setup(true);
    client.get(url).subscribe();
    const req = http.expectOne(url);
    expect(req.request.headers.get('Authorization')).toMatch(/^Bearer .+/);
    req.flush([]);
  });

  it('leaves public auth calls and foreign URLs untouched', () => {
    setup(true);
    client.post(`${environment.apiUrl}/auth/login`, {}).subscribe();
    client.get('https://example.com/x').subscribe();
    expect(http.expectOne(`${environment.apiUrl}/auth/login`).request.headers.has('Authorization')).toBe(false);
    expect(http.expectOne('https://example.com/x').request.headers.has('Authorization')).toBe(false);
  });

  it('refreshes once on 401 and replays the request with the new token', () => {
    setup(true);
    let body: unknown;
    client.get(url).subscribe((b) => (body = b));
    http.expectOne(url).flush({}, { status: 401, statusText: 'Unauthorized' });

    const renewed = fakeSession('u@b.com', 'User');
    renewed.accessToken += 'NEW';
    http.expectOne(`${environment.apiUrl}/auth/refresh`).flush(renewed);

    const replay = http.expectOne(url);
    expect(replay.request.headers.get('Authorization')).toContain('NEW');
    replay.flush({ ok: true });
    expect(body).toEqual({ ok: true });
  });

  it('drops the session when the refresh fails', () => {
    setup(true);
    let failed = false;
    client.get(url).subscribe({ error: () => (failed = true) });
    http.expectOne(url).flush({}, { status: 401, statusText: 'Unauthorized' });
    http.expectOne(`${environment.apiUrl}/auth/refresh`).flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(failed).toBe(true);
    expect(localStorage.getItem('myapp.session')).toBeNull();
  });

  it('passes non-401 errors straight through', () => {
    setup(true);
    let status = 0;
    client.get(url).subscribe({ error: (e) => (status = e.status) });
    http.expectOne(url).flush({}, { status: 500, statusText: 'Server Error' });
    expect(status).toBe(500);
  });
});
