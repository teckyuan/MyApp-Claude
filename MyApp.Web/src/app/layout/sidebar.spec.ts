import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { internals } from '../testing/internals';
import { NAV_MODULES, Sidebar } from './sidebar';

describe('Sidebar', () => {
  const create = () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(Sidebar);
    fixture.detectChanges();
    return fixture;
  };

  it('renders a link for every module and child', () => {
    const el: HTMLElement = create().nativeElement;
    const hrefs = Array.from(el.querySelectorAll('a')).map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(['/products', '/invoices/new', '/profile']);
  });

  it('starts with grouped modules open', () => {
    const c = internals(create().componentInstance);
    expect(c.isOpen('invoices')).toBe(true);
    expect(c.isOpen('products')).toBe(false);
  });

  it('toggles a group open and closed', () => {
    const c = internals(create().componentInstance);
    c.toggle('invoices');
    expect(c.isOpen('invoices')).toBe(false);
    c.toggle('invoices');
    expect(c.isOpen('invoices')).toBe(true);
  });

  it('collapses and expands from the toggle button', () => {
    const fixture = create();
    const el: HTMLElement = fixture.nativeElement;
    const button = el.querySelector<HTMLButtonElement>('button.toggle')!;
    expect(button.getAttribute('aria-label')).toBe('Collapse sidebar');

    button.click();
    fixture.detectChanges();
    expect(button.getAttribute('aria-label')).toBe('Expand sidebar');
    expect(el.querySelector('nav')!.classList).toContain('collapsed');
  });

  it('exposes the default navigation modules', () => {
    expect(NAV_MODULES.map((m) => m.id)).toEqual(['products', 'invoices', 'account']);
  });
});
