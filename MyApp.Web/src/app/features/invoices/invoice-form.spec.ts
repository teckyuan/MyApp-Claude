import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Subject, of } from 'rxjs';
import { InvoicesService } from '../../core/invoices.service';
import { NotificationService } from '../../core/notification.service';
import { internals } from '../../testing/internals';
import { InvoiceForm } from './invoice-form';

describe('InvoiceForm', () => {
  const api = { create: vi.fn() };
  const notify = { success: vi.fn() };

  const create = () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: InvoicesService, useValue: api },
        { provide: NotificationService, useValue: notify },
      ],
    });
    const fixture = TestBed.createComponent(InvoiceForm);
    fixture.detectChanges();
    return internals(fixture.componentInstance);
  };

  const fill = (c: ReturnType<typeof create>) => {
    c.form.patchValue({ vehicleNo: '  ABC 123 ', billTo: ' ACME ', date: new Date(2026, 0, 5) });
    c.lines.at(0).patchValue({ item: ' Oil ', description: '', qty: 2, unit: 'pcs', unitRate: 10.555 });
  };

  beforeEach(() => {
    api.create.mockReset();
    notify.success.mockReset();
  });

  it('starts with one empty line and today as the date', () => {
    const c = create();
    expect(c.lines.length).toBe(1);
    expect(c.form.value.date).toBeInstanceOf(Date);
  });

  it('requires a non-blank vehicle number', () => {
    const c = create();
    expect(c.form.controls.vehicleNo.hasError('required')).toBe(true);
    c.form.controls.vehicleNo.setValue('   ');
    expect(c.form.controls.vehicleNo.hasError('pattern')).toBe(true);
    c.form.controls.vehicleNo.setValue('ABC');
    expect(c.form.controls.vehicleNo.valid).toBe(true);
  });

  it('computes line and grand totals rounded to 2 decimals', () => {
    const c = create();
    c.lines.at(0).patchValue({ qty: 3, unitRate: 0.1 });
    c.addLine();
    c.lines.at(1).patchValue({ qty: 1, unitRate: 1.005 });
    expect(c.lineTotal(0)).toBe(0.3);
    expect(c.lineTotal(1)).toBe(1.01);
    expect(c.grandTotal()).toBe(1.31);
  });

  it('adds lines and always keeps at least one', () => {
    const c = create();
    c.addLine();
    expect(c.lines.length).toBe(2);
    c.removeLine(0);
    c.removeLine(0);
    expect(c.lines.length).toBe(1);
  });

  it('does not save an invalid form', () => {
    const c = create();
    c.save();
    expect(api.create).not.toHaveBeenCalled();
    expect(c.form.touched).toBe(true);
  });

  it('sends a trimmed request with a local yyyy-MM-dd date and drops blank lines', () => {
    api.create.mockReturnValue(of({ id: 9 }));
    const c = create();
    fill(c);
    c.addLine(); // left blank on purpose
    c.save();

    expect(api.create).toHaveBeenCalledWith({
      billTo: 'ACME',
      vehicleNo: 'ABC 123',
      chassisNo: '',
      mileage: null,
      date: '2026-01-05',
      lines: [{ item: 'Oil', description: '', qty: 2, unit: 'pcs', unitRate: 10.555, total: 21.11 }],
    });
  });

  it('notifies and resets the form after saving', () => {
    api.create.mockReturnValue(of({ id: 9 }));
    const c = create();
    fill(c);
    c.addLine();
    c.save();

    expect(notify.success).toHaveBeenCalledWith('Invoice #9 saved.');
    expect(c.saving()).toBe(false);
    expect(c.lines.length).toBe(1);
    expect(c.form.value.vehicleNo).toBe('');
    expect(c.lines.at(0).value.qty).toBe(1);
  });

  it('shows errors and keeps the data when saving fails', () => {
    const result = new Subject<unknown>();
    api.create.mockReturnValue(result);
    const c = create();
    fill(c);
    c.save();
    expect(c.saving()).toBe(true);

    result.error(new HttpErrorResponse({ status: 400, error: { errors: { VehicleNo: ['Bad.'] } } }));
    expect(c.saving()).toBe(false);
    expect(c.errors()).toEqual(['Bad.']);
    expect(c.form.value.billTo).toBe(' ACME ');
  });
});
