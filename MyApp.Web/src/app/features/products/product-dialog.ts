import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Observable } from 'rxjs';
import { describeError } from '../../core/errors';
import { Product } from '../../core/models';
import { NotificationService } from '../../core/notification.service';
import { ProductsService } from '../../core/products.service';

/** Pass a product to edit it; pass nothing to add a new one. Closes with `true` once saved. */
export interface ProductDialogData {
  product: Product | null;
}

@Component({
  selector: 'app-product-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  templateUrl: './product-dialog.html',
  styles: `
    .full {
      width: 100%;
      min-width: 320px;
    }
  `,
})
export class ProductDialog {
  private readonly api = inject(ProductsService);
  private readonly notify = inject(NotificationService);
  private readonly ref = inject<MatDialogRef<ProductDialog, boolean>>(MatDialogRef);
  protected readonly product = inject<ProductDialogData>(MAT_DIALOG_DATA).product;

  protected readonly saving = signal(false);
  protected readonly errors = signal<string[]>([]);
  protected readonly form = inject(FormBuilder).nonNullable.group({
    name: [this.product?.name ?? '', [Validators.required, Validators.maxLength(200)]],
    price: [this.product?.price ?? 0, [Validators.required, Validators.min(0)]],
  });

  protected save(): void {
    if (this.form.invalid) {
      return;
    }
    const request = this.form.getRawValue();
    const call: Observable<unknown> = this.product
      ? this.api.update(this.product.id, request)
      : this.api.create(request);

    this.saving.set(true);
    this.errors.set([]);
    call.subscribe({
      next: () => {
        this.notify.success(this.product ? 'Product updated.' : 'Product added.');
        this.ref.close(true);
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.errors.set(describeError(err));
      },
    });
  }
}
