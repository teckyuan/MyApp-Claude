import { Component, input, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

export interface NavLink {
  label: string;
  route: string;
}

export interface NavModule {
  id: string;
  label: string;
  /** A module with children renders as an expandable group; otherwise as a plain link. */
  route?: string;
  children?: NavLink[];
}

/** Add a module here and it shows up in the sidebar. */
export const NAV_MODULES: NavModule[] = [
  { id: 'products', label: 'Products', route: '/products' },
  {
    id: 'invoices',
    label: 'Invoices',
    children: [{ label: 'New invoice', route: '/invoices/new' }],
  },
  {
    id: 'account',
    label: 'Account',
    children: [{ label: 'Profile', route: '/profile' }],
  },
];

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="sidebar" aria-label="Main navigation" [class.collapsed]="collapsed()">
      <button
        type="button"
        class="toggle"
        (click)="collapsed.set(!collapsed())"
        [attr.aria-expanded]="!collapsed()"
        aria-controls="sidebar-list"
        [attr.aria-label]="collapsed() ? 'Expand sidebar' : 'Collapse sidebar'"
      >
        {{ collapsed() ? '»' : '«' }}
      </button>

      <ul id="sidebar-list" [hidden]="collapsed()">
        @for (m of modules(); track m.id) {
          <li>
            @if (m.children) {
              <button
                type="button"
                class="group"
                (click)="toggle(m.id)"
                [attr.aria-expanded]="isOpen(m.id)"
                [attr.aria-controls]="'nav-' + m.id"
              >
                <span>{{ m.label }}</span>
                <span class="chevron" aria-hidden="true" [class.open]="isOpen(m.id)">›</span>
              </button>
              <ul class="children" [id]="'nav-' + m.id" [hidden]="!isOpen(m.id)">
                @for (c of m.children; track c.route) {
                  <li>
                    <a [routerLink]="c.route" routerLinkActive="active">{{ c.label }}</a>
                  </li>
                }
              </ul>
            } @else {
              <a class="top" [routerLink]="m.route" routerLinkActive="active">{{ m.label }}</a>
            }
          </li>
        }
      </ul>
    </nav>
  `,
  styles: `
    :host {
      display: block;
    }
    .sidebar {
      width: 220px;
      height: 100%;
      background: var(--surface);
      border-right: 1px solid var(--border);
      padding: 8px;
    }
    .sidebar.collapsed {
      width: 52px;
    }
    ul {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .toggle {
      width: 100%;
      margin-bottom: 8px;
    }
    .group,
    a {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      padding: 10px 12px;
      border: 0;
      border-radius: 0 24px 24px 0;
      background: transparent;
      color: var(--text);
      font: inherit;
      text-align: left;
      text-decoration: none;
      cursor: pointer;
    }
    .group:hover,
    a:hover {
      background: var(--bg);
    }
    .children a {
      padding-left: 28px;
      font-size: 0.92rem;
    }
    a.active {
      font-weight: 500;
      color: var(--primary);
      background: var(--primary-soft);
    }
    .chevron {
      transition: transform 0.15s;
      font-size: 1.2rem;
      line-height: 1;
    }
    .chevron.open {
      transform: rotate(90deg);
    }
    @media (prefers-reduced-motion: reduce) {
      .chevron {
        transition: none;
      }
    }
  `,
})
export class Sidebar {
  readonly modules = input<NavModule[]>(NAV_MODULES);
  protected readonly collapsed = signal(false);
  private readonly open = signal<ReadonlySet<string>>(new Set(['invoices', 'account']));

  protected isOpen(id: string): boolean {
    return this.open().has(id);
  }

  protected toggle(id: string): void {
    const next = new Set(this.open());
    if (!next.delete(id)) {
      next.add(id);
    }
    this.open.set(next);
  }
}
