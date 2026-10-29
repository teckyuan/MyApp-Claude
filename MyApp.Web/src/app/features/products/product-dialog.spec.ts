import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, of } from 'rxjs';
import { NotificationService } from '../../core/notification.service';
import { Product } from '../../core/models';
import { ProductsService } from '../../core/products.service';
import { internals } from '../../testing/internals';
import { ProductDialog } from './product-dialog';

describe('ProductDialog', () => {
  const api = { create: vi.fn(), update: vi.fn() };
  const notify = { success: vi.fn() };
  const ref = { close: vi.fn() };
  const existing: Product = { id: 5, name: 'Oil', price: 9, createdAtUtc: '2026-01-01T00:00:00Z', updatedAtUtc: null };

  const create = (product: Product | null) => {
    TestBed.configureTestingModule({
      providers: [
        { provide: ProductsService, useValue: api },
        { provide: NotificationService, useValue: notify },
        { provide: MatDialogRef, useValue: ref },
        { provide: MAT_DIALOG_DATA, useValue: { product } },
      ],
    });
    const fixture = TestBed.createComponent(ProductDialog);
    fixture.detectChanges();
    return internals(fixture.componentInstance);
  };

  beforeEach(() => {
    Object.values(api).forEach((f) => f.mockReset());
    notify.success.mockReset();
    ref.close.mockReset();
  });

  it('starts blank when adding', () => {
    expect(create(null).form.getRawValue()).toEqual({ name: '', price: 0 });
  });

  it('prefills the form when editing', () => {
    expect(create(existing).form.getRawValue()).toEqual({ name: 'Oil', price: 9 });
  });

  it('validates name and price', () => {
    const c = create(null);
    expect(c.form.invalid).toBe(true);
    c.form.setValue({ name: 'x'.repeat(201), price: 1 });
    expect(c.form.controls.name.hasError('maxlength')).toBe(true);
    c.form.setValue({ name: 'ok', price: -1 });
    expect(c.form.controls.price.hasError('min')).toBe(true);
  });

  it('does not save an invalid form', () => {
    create(null).save();
    expect(api.create).not.toHaveBeenCalled();
  });

  it('creates a new product and closes with true', () => {
    api.create.mockReturnValue(of({}));
    const c = create(null);
    c.form.setValue({ name: 'Filter', price: 4.5 });
    c.save();
    expect(api.create).toHaveBeenCalledWith({ name: 'Filter', price: 4.5 });
    expect(notify.success).toHaveBeenCalledWith('Product added.');
    expect(ref.close).toHaveBeenCalledWith(true);
  });

  it('updates an existing product', () => {
    api.update.mockReturnValue(of(undefined));
    const c = create(existing);
    c.form.setValue({ name: 'Oil 5W', price: 11 });
    c.save();
    expect(api.update).toHaveBeenCalledWith(5, { name: 'Oil 5W', price: 11 });
    expect(notify.success).toHaveBeenCalledWith('Product updated.');
    expect(ref.close).toHaveBeenCalledWith(true);
  });

  it('keeps the dialog open and shows errors when saving fails', () => {
    const result = new Subject<unknown>();
    api.create.mockReturnValue(result);
    const c = create(null);
    c.form.setValue({ name: 'Filter', price: 4.5 });
    c.save();
    expect(c.saving()).toBe(true);

    result.error(new HttpErrorResponse({ status: 400, error: { errors: { Name: ['Duplicate.'] } } }));
    expect(c.saving()).toBe(false);
    expect(c.errors()).toEqual(['Duplicate.']);
    expect(ref.close).not.toHaveBeenCalled();
  });
});
