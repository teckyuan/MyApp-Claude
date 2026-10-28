import { ErrorHandler, Injectable, Injector, inject } from '@angular/core';
import { NotificationService } from './notification.service';

/**
 * Catches anything no component handled. Logs it (the hook point for a real telemetry sink)
 * and tells the user something went wrong without leaking internals.
 */
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  // Resolved lazily: the handler is created before the Material overlay services exist.
  private readonly injector = inject(Injector);

  handleError(error: unknown): void {
    console.error('Unhandled error', error);
    this.injector.get(NotificationService).error('Something went wrong. Please try again.');
  }
}
