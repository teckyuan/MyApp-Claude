import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { fakeSession } from '../testing/fake-session';

describe('AuthService', () => {
  let http: HttpTestingController;

  const create = (): AuthService => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([{ path: 'login', children: [] }])],
    });
    http = TestBed.inject(HttpTestingController);
    return TestBed.inject(AuthService);
  };

  beforeEach(() => localStorage.clear());
  afterEach(() => http.verify());

  it('starts anonymous', () => {
    const auth = create();
    expect(auth.isAuthenticated()).toBe(false);
    expect(auth.accessToken()).toBeNull();
  });

  it('stores the session on login and exposes claims', () => {
    const auth = create();
    auth.login({ email: 'a@b.com', password: 'pw' }).subscribe();
    http.expectOne(`${environment.apiUrl}/auth/login`).flush(fakeSession('a@b.com', 'Admin'));

    expect(auth.isAuthenticated()).toBe(true);
    expect(auth.email()).toBe('a@b.com');
    expect(auth.isAdmin()).toBe(true);
    expect(localStorage.getItem('myapp.session')).toContain('refresh-1');
  });

  it('does not treat a normal user as admin', () => {
    const auth = create();
    auth.login({ email: 'u@b.com', password: 'pw' }).subscribe();
    http.expectOne(`${environment.apiUrl}/auth/login`).flush(fakeSession('u@b.com', 'User'));
    expect(auth.isAdmin()).toBe(false);
  });

  it('restores a stored session after reload', () => {
    localStorage.setItem('myapp.session', JSON.stringify(fakeSession('x@y.com', 'User')));
    const auth = create();
    expect(auth.isAuthenticated()).toBe(true);
    expect(auth.email()).toBe('x@y.com');
  });

  it('ignores a corrupt stored session', () => {
    localStorage.setItem('myapp.session', '{not json');
    expect(create().isAuthenticated()).toBe(false);
  });

  it('shares one in-flight refresh between concurrent callers', () => {
    localStorage.setItem('myapp.session', JSON.stringify(fakeSession('x@y.com', 'User')));
    const auth = create();
    auth.refresh().subscribe();
    auth.refresh().subscribe();
    http.expectOne(`${environment.apiUrl}/auth/refresh`).flush(fakeSession('x@y.com', 'User'));
  });

  it('clears the session on logout and revokes the refresh token', () => {
    localStorage.setItem('myapp.session', JSON.stringify(fakeSession('x@y.com', 'User')));
    const auth = create();
    auth.logout();
    const req = http.expectOne(`${environment.apiUrl}/auth/logout`);
    expect(req.request.body).toEqual({ refreshToken: 'refresh-1' });
    req.flush(null);

    expect(auth.isAuthenticated()).toBe(false);
    expect(localStorage.getItem('myapp.session')).toBeNull();
  });
});
