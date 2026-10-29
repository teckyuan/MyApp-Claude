import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, of } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { internals } from '../../testing/internals';
import { Login } from './login';

describe('Login', () => {
  const login = vi.fn();
  const navigateByUrl = vi.fn();

  const create = (returnUrl: string | null = null) => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { login } },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { get: () => returnUrl } } } },
      ],
    });
    vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockImplementation(navigateByUrl);
    const fixture = TestBed.createComponent(Login);
    fixture.detectChanges();
    return internals(fixture.componentInstance);
  };

  beforeEach(() => {
    login.mockReset();
    navigateByUrl.mockReset();
  });

  it('does not submit an invalid form', () => {
    const c = create();
    c.submit();
    expect(login).not.toHaveBeenCalled();
  });

  it('validates email format', () => {
    const c = create();
    c.form.setValue({ email: 'nope', password: 'pw' });
    expect(c.form.invalid).toBe(true);
    c.form.setValue({ email: 'a@b.com', password: 'pw' });
    expect(c.form.valid).toBe(true);
  });

  it('logs in and goes to /products by default', () => {
    login.mockReturnValue(of({}));
    const c = create();
    c.form.setValue({ email: 'a@b.com', password: 'pw' });
    c.submit();
    expect(login).toHaveBeenCalledWith({ email: 'a@b.com', password: 'pw' });
    expect(navigateByUrl).toHaveBeenCalledWith('/products');
  });

  it('follows a same-app returnUrl', () => {
    login.mockReturnValue(of({}));
    const c = create('/invoices/new');
    c.form.setValue({ email: 'a@b.com', password: 'pw' });
    c.submit();
    expect(navigateByUrl).toHaveBeenCalledWith('/invoices/new');
  });

  it.each(['https://evil.com', '//evil.com'])('ignores the unsafe returnUrl %s', (url) => {
    login.mockReturnValue(of({}));
    const c = create(url);
    c.form.setValue({ email: 'a@b.com', password: 'pw' });
    c.submit();
    expect(navigateByUrl).toHaveBeenCalledWith('/products');
  });

  it('shows errors and clears busy when login fails', () => {
    const result = new Subject<unknown>();
    login.mockReturnValue(result);
    const c = create();
    c.form.setValue({ email: 'a@b.com', password: 'pw' });
    c.submit();
    expect(c.busy()).toBe(true);

    result.error(new HttpErrorResponse({ status: 403 }));
    expect(c.busy()).toBe(false);
    expect(c.errors()).toEqual(['You do not have permission to do that.']);
    expect(navigateByUrl).not.toHaveBeenCalled();
  });
});
