import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Invoice, InvoiceRequest } from './models';

@Injectable({ providedIn: 'root' })
export class InvoicesService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/invoices`;

  create(request: InvoiceRequest): Observable<Invoice> {
    return this.http.post<Invoice>(this.url, request);
  }
}
