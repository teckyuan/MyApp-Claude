import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { authGuard } from './auth.guard';
import { fakeSession } from '../testing/fake-session';

describe('authGuard', () => {
  const run = (): boolean | UrlTree =>
    TestBed.runInInjectionContext(
      () =>
        authGuard({} as ActivatedRouteSnapshot, { url: '/products?x=1' } as RouterStateSnapshot) as boolean | UrlTree,
    );

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
  });

  it('redirects anonymous users to /login with a returnUrl', () => {
    const result = run() as UrlTree;
    expect(TestBed.inject(Router).serializeUrl(result)).toBe('/login?returnUrl=%2Fproducts%3Fx%3D1');
  });

  it('lets authenticated users through', () => {
    localStorage.setItem('myapp.session', JSON.stringify(fakeSession('u@b.com', 'User')));
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    expect(run()).toBe(true);
  });
});
