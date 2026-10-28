import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { AuthService } from '../../core/auth.service';
import { describeError } from '../../core/errors';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, PagedResult, Product } from '../../core/models';
import { NotificationService } from '../../core/notification.service';
import { ProductsService } from '../../core/products.service';
import { ProductDialog, ProductDialogData } from './product-dialog';

@Component({
  selector: 'app-products',
  imports: [CurrencyPipe, DatePipe, MatButtonModule, MatPaginatorModule, MatTableModule],
  templateUrl: './products.html',
})
export class Products {
  private readonly api = inject(ProductsService);
  protected readonly auth = inject(AuthService);
  private readonly notify = inject(NotificationService);
  private readonly dialog = inject(MatDialog);

  protected readonly pageSizes = [10, DEFAULT_PAGE_SIZE, 50, MAX_PAGE_SIZE];
  protected readonly result = signal<PagedResult<Product> | null>(null);
  protected readonly errors = signal<string[]>([]);
  protected readonly page = signal(1);
  protected readonly pageSize = signal(DEFAULT_PAGE_SIZE);

  constructor() {
    this.load();
  }

  protected readonly columns = ['id', 'name', 'price', 'created', 'updated', 'actions'];

  protected trackById(_: number, p: Product): number {
    return p.id;
  }

  protected onPage(e: PageEvent): void {
    // Changing the page size resets to the first page.
    this.page.set(e.pageSize !== this.pageSize() ? 1 : e.pageIndex + 1);
    this.pageSize.set(e.pageSize);
    this.load();
  }

  protected onRowDblClick(event: MouseEvent, product: Product): void {
    // Double-clicking a row button (Edit/Delete) is not a request to edit the row.
    if ((event.target as HTMLElement).closest('button')) {
      return;
    }
    this.openDialog(product);
  }

  /** Opens the popout to add a product, or to edit `product` when given. */
  protected openDialog(product: Product | null = null): void {
    this.dialog
      .open<ProductDialog, ProductDialogData, boolean>(ProductDialog, { data: { product }, autoFocus: 'input' })
      .afterClosed()
      .subscribe((saved) => {
        if (saved) {
          this.load();
        }
      });
  }

  protected remove(product: Product): void {
    if (!confirm(`Delete "${product.name}"?`)) {
      return;
    }
    this.errors.set([]);
    this.api.delete(product.id).subscribe({
      next: () => {
        this.notify.success('Product deleted.');
        // Deleting the last row of a page would leave an empty page; step back one.
        const onlyItem = this.result()?.items.length === 1;
        if (onlyItem && this.page() > 1) {
          this.page.update((p) => p - 1);
        }
        this.load();
      },
      error: (err: unknown) => this.errors.set(describeError(err)),
    });
  }

  private load(): void {
    this.errors.set([]);
    this.api.getPage(this.page(), this.pageSize()).subscribe({
      next: (r) => this.result.set(r),
      error: (err: unknown) => this.errors.set(describeError(err)),
    });
  }
}
