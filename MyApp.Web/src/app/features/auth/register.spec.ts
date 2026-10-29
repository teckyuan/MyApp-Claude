import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Subject, of } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { internals } from '../../testing/internals';
import { Register } from './register';

describe('Register', () => {
  const register = vi.fn();
  const navigateByUrl = vi.fn();

  const create = () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: { register } }],
    });
    vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockImplementation(navigateByUrl);
    const fixture = TestBed.createComponent(Register);
    fixture.detectChanges();
    return internals(fixture.componentInstance);
  };

  beforeEach(() => {
    register.mockReset();
    navigateByUrl.mockReset();
  });

  it('requires a password of at least 12 characters', () => {
    const c = create();
    c.form.setValue({ email: 'a@b.com', password: 'short' });
    expect(c.form.controls.password.hasError('minlength')).toBe(true);
    c.form.setValue({ email: 'a@b.com', password: 'long-enough-pw' });
    expect(c.form.valid).toBe(true);
  });

  it('does not submit an invalid form', () => {
    const c = create();
    c.submit();
    expect(register).not.toHaveBeenCalled();
  });

  it('registers and navigates to /products', () => {
    register.mockReturnValue(of({}));
    const c = create();
    c.form.setValue({ email: 'a@b.com', password: 'long-enough-pw' });
    c.submit();
    expect(register).toHaveBeenCalledWith({ email: 'a@b.com', password: 'long-enough-pw' });
    expect(navigateByUrl).toHaveBeenCalledWith('/products');
  });

  it('shows API validation errors', () => {
    const result = new Subject<unknown>();
    register.mockReturnValue(result);
    const c = create();
    c.form.setValue({ email: 'a@b.com', password: 'long-enough-pw' });
    c.submit();

    result.error(new HttpErrorResponse({ status: 400, error: { errors: { Email: ['Already taken.'] } } }));
    expect(c.errors()).toEqual(['Already taken.']);
    expect(c.busy()).toBe(false);
  });
});
