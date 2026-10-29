import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { ProductsService } from './products.service';

describe('ProductsService', () => {
  let service: ProductsService;
  let http: HttpTestingController;
  const url = `${environment.apiUrl}/products`;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(ProductsService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('requests a page with page and pageSize params', () => {
    service.getPage(2, 50).subscribe();
    const req = http.expectOne((r) => r.url === url);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('pageSize')).toBe('50');
    req.flush({});
  });

  it('gets one product by id', () => {
    service.get(7).subscribe();
    const req = http.expectOne(`${url}/7`);
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('creates a product with POST', () => {
    service.create({ name: 'Oil', price: 9.5 }).subscribe();
    const req = http.expectOne(url);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ name: 'Oil', price: 9.5 });
    req.flush({});
  });

  it('updates a product with PUT', () => {
    service.update(3, { name: 'Oil', price: 10 }).subscribe();
    const req = http.expectOne(`${url}/3`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ name: 'Oil', price: 10 });
    req.flush(null);
  });

  it('deletes a product with DELETE', () => {
    service.delete(3).subscribe();
    const req = http.expectOne(`${url}/3`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
