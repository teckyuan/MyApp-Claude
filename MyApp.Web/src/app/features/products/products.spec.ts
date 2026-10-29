import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { Subject, of } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { PagedResult, Product } from '../../core/models';
import { NotificationService } from '../../core/notification.service';
import { ProductsService } from '../../core/products.service';
import { internals } from '../../testing/internals';
import { Products } from './products';

const product = (id: number): Product => ({
  id,
  name: `P${id}`,
  price: id,
  createdAtUtc: '2026-01-01T00:00:00Z',
  updatedAtUtc: null,
});

const pageOf = (ids: number[], page = 1, pageSize = 20): PagedResult<Product> => ({
  items: ids.map(product),
  page,
  pageSize,
  totalCount: ids.length,
  totalPages: 1,
  hasNextPage: false,
  hasPreviousPage: page > 1,
});

describe('Products', () => {
  const api = { getPage: vi.fn(), delete: vi.fn() };
  const notify = { success: vi.fn() };
  const dialog = { open: vi.fn() };

  const create = () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: ProductsService, useValue: api },
        { provide: NotificationService, useValue: notify },
        { provide: MatDialog, useValue: dialog },
        { provide: AuthService, useValue: { isAdmin: () => true } },
      ],
    });
    const fixture = TestBed.createComponent(Products);
    fixture.detectChanges();
    return internals(fixture.componentInstance);
  };

  beforeEach(() => {
    api.getPage.mockReset().mockReturnValue(of(pageOf([1, 2])));
    api.delete.mockReset();
    notify.success.mockReset();
    dialog.open.mockReset();
    vi.stubGlobal(
      'confirm',
      vi.fn(() => true),
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  it('loads the first page on creation', () => {
    const c = create();
    expect(api.getPage).toHaveBeenCalledWith(1, 20);
    expect(c.result().items).toHaveLength(2);
  });

  it('shows an error when loading fails', () => {
    const failing = new Subject<PagedResult<Product>>();
    api.getPage.mockReturnValue(failing);
    const c = create();
    failing.error(new HttpErrorResponse({ status: 429 }));
    expect(c.errors()).toEqual(['Too many requests. Please wait a moment and try again.']);
  });

  it('moves to the requested page', () => {
    const c = create();
    c.onPage({ pageIndex: 2, pageSize: 20, length: 100 });
    expect(c.page()).toBe(3);
    expect(api.getPage).toHaveBeenLastCalledWith(3, 20);
  });

  it('resets to page 1 when the page size changes', () => {
    const c = create();
    c.onPage({ pageIndex: 3, pageSize: 20, length: 100 });
    c.onPage({ pageIndex: 3, pageSize: 50, length: 100 });
    expect(c.page()).toBe(1);
    expect(api.getPage).toHaveBeenLastCalledWith(1, 50);
  });

  it('does not delete when the user cancels the confirmation', () => {
    vi.stubGlobal(
      'confirm',
      vi.fn(() => false),
    );
    const c = create();
    c.remove(product(1));
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('deletes, notifies and reloads', () => {
    api.delete.mockReturnValue(of(undefined));
    const c = create();
    api.getPage.mockClear();
    c.remove(product(1));
    expect(api.delete).toHaveBeenCalledWith(1);
    expect(notify.success).toHaveBeenCalledWith('Product deleted.');
    expect(api.getPage).toHaveBeenCalledTimes(1);
  });

  it('steps back a page when the last row of a later page is deleted', () => {
    api.delete.mockReturnValue(of(undefined));
    api.getPage.mockReturnValue(of(pageOf([21], 2)));
    const c = create();
    c.page.set(2);
    c.result.set(pageOf([21], 2));
    c.remove(product(21));
    expect(c.page()).toBe(1);
    expect(api.getPage).toHaveBeenLastCalledWith(1, 20);
  });

  it('shows an error when delete is forbidden', () => {
    const failing = new Subject<void>();
    api.delete.mockReturnValue(failing);
    const c = create();
    c.remove(product(1));
    failing.error(new HttpErrorResponse({ status: 403 }));
    expect(c.errors()).toEqual(['You do not have permission to do that.']);
  });

  it('reloads after the dialog closes with a save', () => {
    dialog.open.mockReturnValue({ afterClosed: () => of(true) });
    const c = create();
    api.getPage.mockClear();
    c.openDialog();
    expect(api.getPage).toHaveBeenCalledTimes(1);
  });

  it('does not reload when the dialog is dismissed', () => {
    dialog.open.mockReturnValue({ afterClosed: () => of(undefined) });
    const c = create();
    api.getPage.mockClear();
    c.openDialog(product(1));
    expect(api.getPage).not.toHaveBeenCalled();
    expect(dialog.open.mock.calls[0][1].data).toEqual({ product: product(1) });
  });

  it('opens the editor on row double-click but ignores button double-clicks', () => {
    dialog.open.mockReturnValue({ afterClosed: () => of(false) });
    const c = create();
    const button = document.createElement('button');
    const cell = document.createElement('td');
    c.onRowDblClick({ target: button } as unknown as MouseEvent, product(1));
    expect(dialog.open).not.toHaveBeenCalled();
    c.onRowDblClick({ target: cell } as unknown as MouseEvent, product(1));
    expect(dialog.open).toHaveBeenCalledTimes(1);
  });
});
