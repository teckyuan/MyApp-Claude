import { CurrencyPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { describeError } from '../../core/errors';
import { InvoiceLine, InvoiceRequest } from '../../core/models';
import { InvoicesService } from '../../core/invoices.service';
import { NotificationService } from '../../core/notification.service';

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

const today = () => new Date();

/** Local calendar date as yyyy-MM-dd (toISOString would shift it to UTC and can change the day). */
function toIsoDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

@Component({
  selector: 'app-invoice-form',
  imports: [
    ReactiveFormsModule,
    CurrencyPipe,
    MatButtonModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './invoice-form.html',
  styles: `
    .details {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      column-gap: 16px;
    }
    .details .wide {
      grid-column: 1 / -1;
    }
    .lines-wrap {
      overflow-x: auto;
    }
    .lines th.num,
    .lines td.num {
      text-align: right;
    }
    .lines input {
      min-width: 70px;
    }
    .lines td.item input {
      min-width: 130px;
    }
    .lines td.desc input {
      min-width: 200px;
    }
    .lines td.num input {
      text-align: right;
    }
    .lines .total {
      white-space: nowrap;
      font-variant-numeric: tabular-nums;
    }
    tfoot td {
      font-weight: 500;
    }
  `,
})
export class InvoiceForm {
  private readonly api = inject(InvoicesService);
  private readonly notify = inject(NotificationService);
  private readonly fb = inject(FormBuilder).nonNullable;

  protected readonly saving = signal(false);
  protected readonly errors = signal<string[]>([]);
  protected readonly unitSuggestions = ['pcs', 'hr', 'set', 'litre', 'job'];

  protected readonly lines = this.fb.array([this.newLine()]);
  protected readonly form = this.fb.group({
    billTo: ['', [Validators.maxLength(200)]],
    vehicleNo: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(30)]],
    chassisNo: ['', [Validators.maxLength(50)]],
    mileage: this.fb.control<number | null>(null, [Validators.min(0)]),
    date: this.fb.control<Date | null>(today(), [Validators.required]),
    lines: this.lines,
  });

  protected lineTotal(index: number): number {
    const { qty, unitRate } = this.lines.at(index).getRawValue();
    return round2((Number(qty) || 0) * (Number(unitRate) || 0));
  }

  protected grandTotal(): number {
    return round2(this.lines.controls.reduce((sum, _, i) => sum + this.lineTotal(i), 0));
  }

  protected addLine(): void {
    this.lines.push(this.newLine());
  }

  protected removeLine(index: number): void {
    this.lines.removeAt(index);
    // Always keep one row to type into.
    if (this.lines.length === 0) {
      this.addLine();
    }
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    const lines: InvoiceLine[] = raw.lines
      .map((l, i) => ({ ...l, item: l.item.trim(), description: l.description.trim(), total: this.lineTotal(i) }))
      // Rows left completely blank are dropped rather than saved as empty lines.
      .filter((l) => l.item || l.description);

    const request: InvoiceRequest = {
      billTo: raw.billTo.trim(),
      vehicleNo: raw.vehicleNo.trim(),
      chassisNo: raw.chassisNo.trim(),
      mileage: raw.mileage,
      date: toIsoDate(raw.date!),
      lines,
    };

    this.saving.set(true);
    this.errors.set([]);
    this.api.create(request).subscribe({
      next: (invoice) => {
        this.saving.set(false);
        this.notify.success(`Invoice #${invoice.id} saved.`);
        this.reset();
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.errors.set(describeError(err));
      },
    });
  }

  private reset(): void {
    this.lines.clear();
    this.addLine();
    this.form.reset({ billTo: '', vehicleNo: '', chassisNo: '', mileage: null, date: today() });
  }

  private newLine() {
    return this.fb.group({
      item: [''],
      description: [''],
      qty: [1, [Validators.required, Validators.min(0)]],
      unit: [''],
      unitRate: [0, [Validators.required, Validators.min(0)]],
    });
  }
}
