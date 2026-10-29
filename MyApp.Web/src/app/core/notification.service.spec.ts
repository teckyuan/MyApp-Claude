import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  const open = vi.fn();
  let service: NotificationService;

  beforeEach(() => {
    open.mockClear();
    TestBed.configureTestingModule({ providers: [{ provide: MatSnackBar, useValue: { open } }] });
    service = TestBed.inject(NotificationService);
  });

  it('shows success messages for 4 seconds', () => {
    service.success('Saved');
    expect(open).toHaveBeenCalledWith('Saved', 'Dismiss', { duration: 4000 });
  });

  it('shows error messages for 8 seconds', () => {
    service.error('Failed');
    expect(open).toHaveBeenCalledWith('Failed', 'Dismiss', { duration: 8000 });
  });
});
