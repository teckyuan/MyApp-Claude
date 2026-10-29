import { ErrorHandler } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { GlobalErrorHandler } from './global-error-handler';
import { NotificationService } from './notification.service';

describe('GlobalErrorHandler', () => {
  it('logs the error and shows a generic message', () => {
    const error = vi.fn();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    TestBed.configureTestingModule({
      providers: [
        { provide: ErrorHandler, useClass: GlobalErrorHandler },
        { provide: NotificationService, useValue: { error } },
      ],
    });
    const boom = new Error('secret internals');

    TestBed.inject(ErrorHandler).handleError(boom);

    expect(consoleError).toHaveBeenCalledWith('Unhandled error', boom);
    expect(error).toHaveBeenCalledWith('Something went wrong. Please try again.');
    consoleError.mockRestore();
  });
});
