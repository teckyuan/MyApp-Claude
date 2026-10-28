import { Component, inject, signal } from '@angular/core';
import { AuthService } from '../../core/auth.service';
import { describeError } from '../../core/errors';
import { Me } from '../../core/models';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.html',
  styles: `
    dd {
      margin: 0 0 12px;
    }
  `,
})
export class Profile {
  protected readonly me = signal<Me | null>(null);
  protected readonly error = signal('');

  constructor() {
    inject(AuthService)
      .me()
      .subscribe({
        next: (m) => this.me.set(m),
        error: (err: unknown) => this.error.set(describeError(err).join(' ')),
      });
  }
}
