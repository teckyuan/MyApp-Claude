import { HttpClient, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { mockApiInterceptor } from './mock-api.interceptor';
import { AuthResponse, Invoice, PagedResult, Product } from './models';

describe('mockApiInterceptor', () => {
  let http: HttpClient;
  const api = environment.apiUrl;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient(withInterceptors([mockApiInterceptor]))] });
    http = TestBed.inject(HttpClient);
  });

  const login = (email: string) =>
    firstValueFrom(http.post<AuthResponse>(`${api}/auth/login`, { email, password: 'x' }));
  const claimsOf = (token: string) => JSON.parse(atob(token.split('.')[1])) as { email: string; role: string };

  it('answers the health check', async () => {
    expect(await firstValueFrom(http.get(environment.healthUrl, { responseType: 'text' }))).toBe('Healthy');
  });

  it('logs in and gives Admin role to emails containing "admin"', async () => {
    expect(claimsOf((await login('boss@admin.com')).accessToken).role).toBe('Admin');
    expect(claimsOf((await login('joe@x.com')).accessToken).role).toBe('User');
  });

  it('rejects login without credentials with a 400', async () => {
    const err = await firstValueFrom(http.post(`${api}/auth/login`, {})).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(HttpErrorResponse);
    expect((err as HttpErrorResponse).status).toBe(400);
  });

  it('pages products', async () => {
    const page = await firstValueFrom(
      http.get<PagedResult<Product>>(`${api}/products`, { params: { page: 2, pageSize: 10 } }),
    );
    expect(page.page).toBe(2);
    expect(page.items).toHaveLength(10);
    expect(page.hasPreviousPage).toBe(true);
  });

  it('creates a product and validates input', async () => {
    const created = await firstValueFrom(http.post<Product>(`${api}/products`, { name: ' Brake pad ', price: 12 }));
    expect(created.name).toBe('Brake pad');

    const err = (await firstValueFrom(http.post(`${api}/products`, { name: '', price: -1 })).catch(
      (e: unknown) => e,
    )) as HttpErrorResponse;
    expect(err.status).toBe(400);
    expect(Object.keys(err.error.errors)).toEqual(['Name', 'Price']);
  });

  it('forbids delete for non-admins and allows it for admins', async () => {
    await login('joe@x.com');
    const err = (await firstValueFrom(http.delete(`${api}/products/1`)).catch((e: unknown) => e)) as HttpErrorResponse;
    expect(err.status).toBe(403);

    await login('root@admin.com');
    await expect(firstValueFrom(http.delete(`${api}/products/1`))).resolves.toBeNull();
  });

  it('returns 404 for unknown products and routes', async () => {
    const missing = (await firstValueFrom(http.get(`${api}/products/99999`)).catch(
      (e: unknown) => e,
    )) as HttpErrorResponse;
    expect(missing.status).toBe(404);
    const unknown = (await firstValueFrom(http.get(`${api}/nope`)).catch((e: unknown) => e)) as HttpErrorResponse;
    expect(unknown.status).toBe(404);
  });

  it('creates invoices with a rounded total and requires a vehicle number', async () => {
    const line = { item: 'a', description: '', qty: 1, unit: 'pcs', unitRate: 1, total: 0.1 };
    const body = {
      billTo: '',
      vehicleNo: 'V1',
      chassisNo: '',
      mileage: null,
      date: '2026-01-01',
      lines: [line, line, line],
    };
    const invoice = await firstValueFrom(http.post<Invoice>(`${api}/invoices`, body));
    expect(invoice.total).toBe(0.3);

    const err = (await firstValueFrom(http.post(`${api}/invoices`, { ...body, vehicleNo: ' ' })).catch(
      (e: unknown) => e,
    )) as HttpErrorResponse;
    expect(err.status).toBe(400);
  });
});
