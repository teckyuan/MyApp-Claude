import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink, RouterOutlet } from '@angular/router';
import { switchMap, timer } from 'rxjs';
import { AuthService } from './core/auth.service';
import { ApiStatus, HealthService } from './core/health.service';
import { Sidebar } from './layout/sidebar';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, MatButtonModule, Sidebar],
  template: `
    <a class="skip-link" href="#main">Skip to content</a>
    <header class="bar">
      <div class="container row between">
        <div class="row">
          <strong>MyApp Auto Workshop</strong>
        </div>
        <div class="row">
          <span
            class="status"
            role="status"
            [class.up]="status() === 'up'"
            [class.down]="status() === 'down'"
            [title]="'API: ' + status()"
          >
            API {{ status() }}
          </span>
          @if (auth.isAuthenticated()) {
            <span class="muted">{{ auth.email() }}</span>
            <button mat-stroked-button type="button" (click)="auth.logout()">Log out</button>
          } @else {
            <a routerLink="/login">Log in</a>
            <a routerLink="/register">Register</a>
          }
        </div>
      </div>
    </header>
    <div class="shell">
      @if (auth.isAuthenticated()) {
        <app-sidebar />
      }
      <main id="main" class="container" tabindex="-1">
        <router-outlet />
      </main>
    </div>
  `,
  styles: `
    .bar {
      background: var(--surface);
      border-bottom: 1px solid var(--border);
    }
    .bar strong {
      font-size: 1.375rem;
      font-weight: 400;
      color: var(--muted);
    }
    .bar .container {
      padding-top: 12px;
      padding-bottom: 12px;
    }
    .shell {
      display: flex;
      align-items: stretch;
      min-height: calc(100vh - 62px);
    }
    .shell main {
      flex: 1 1 0;
      min-width: 0;
      margin: 0;
    }
    @media (max-width: 640px) {
      .shell {
        flex-direction: column;
      }
    }
    .skip-link {
      position: absolute;
      left: -9999px;
      top: 0;
      background: var(--primary);
      color: var(--primary-text);
      padding: 8px 12px;
      z-index: 1000;
    }
    .skip-link:focus {
      left: 0;
    }
    main:focus {
      outline: none;
    }
    .status {
      font-size: 0.8rem;
      color: var(--muted);
    }
    .status.up {
      color: var(--ok);
    }
    .status.down {
      color: var(--danger);
    }
  `,
})
export class App {
  protected readonly auth = inject(AuthService);
  private readonly health = inject(HealthService);
  protected readonly status = signal<ApiStatus>('unknown');

  constructor() {
    // Poll the readiness endpoint gently (the API rate-limits per IP).
    timer(0, 60_000)
      .pipe(
        switchMap(() => this.health.check()),
        takeUntilDestroyed(inject(DestroyRef)),
      )
      .subscribe((s) => this.status.set(s));
  }
}
