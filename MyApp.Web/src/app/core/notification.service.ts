import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

/** Single place for transient user feedback, so wording and timing stay consistent. */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly snackBar = inject(MatSnackBar);

  success(message: string): void {
    this.snackBar.open(message, 'Dismiss', { duration: 4000 });
  }

  error(message: string): void {
    this.snackBar.open(message, 'Dismiss', { duration: 8000 });
  }
}
