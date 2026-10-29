import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { App } from './app';
import { AuthService } from './core/auth.service';
import { HealthService } from './core/health.service';

describe('App', () => {
  const authenticated = signal(false);
  const logout = vi.fn();
  const check = vi.fn();

  const create = () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: HealthService, useValue: { check } },
        { provide: AuthService, useValue: { isAuthenticated: authenticated, email: () => 'a@b.com', logout } },
      ],
    });
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    return fixture;
  };

  beforeEach(() => {
    vi.useFakeTimers();
    authenticated.set(false);
    logout.mockReset();
    check.mockReset().mockReturnValue(of('up'));
  });
  afterEach(() => vi.useRealTimers());

  it('shows login and register links when signed out', () => {
    const el: HTMLElement = create().nativeElement;
    const hrefs = Array.from(el.querySelectorAll('header a')).map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(['/login', '/register']);
    expect(el.querySelector('app-sidebar')).toBeNull();
  });

  it('shows the user, sidebar and logout when signed in', () => {
    authenticated.set(true);
    const fixture = create();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('a@b.com');
    expect(el.querySelector('app-sidebar')).not.toBeNull();

    el.querySelector<HTMLButtonElement>('header button')!.click();
    expect(logout).toHaveBeenCalled();
  });

  it('polls the API health immediately and every minute', async () => {
    const fixture = create();
    await vi.advanceTimersByTimeAsync(0);
    fixture.detectChanges();
    expect(check).toHaveBeenCalledTimes(1);
    expect((fixture.nativeElement as HTMLElement).querySelector('.status')!.textContent).toContain('up');

    await vi.advanceTimersByTimeAsync(60_000);
    expect(check).toHaveBeenCalledTimes(2);
  });

  it('shows "down" when the health check reports it', async () => {
    check.mockReturnValue(of('down'));
    const fixture = create();
    await vi.advanceTimersByTimeAsync(0);
    fixture.detectChanges();
    const status = (fixture.nativeElement as HTMLElement).querySelector('.status')!;
    expect(status.textContent).toContain('down');
    expect(status.classList).toContain('down');
  });
});
