import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { InvoicesService } from './invoices.service';
import { InvoiceRequest } from './models';

describe('InvoicesService', () => {
  it('creates an invoice with POST', () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const http = TestBed.inject(HttpTestingController);
    const request: InvoiceRequest = {
      billTo: 'ACME',
      vehicleNo: 'ABC123',
      chassisNo: '',
      mileage: null,
      date: '2026-01-02',
      lines: [],
    };

    TestBed.inject(InvoicesService).create(request).subscribe();

    const req = http.expectOne(`${environment.apiUrl}/invoices`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    req.flush({});
    http.verify();
  });
});
