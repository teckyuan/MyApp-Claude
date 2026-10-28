import { HttpErrorResponse, HttpInterceptorFn, HttpRequest, HttpResponse } from '@angular/common/http';
import { Observable, delay, of, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthResponse, Credentials, Invoice, InvoiceRequest, PagedResult, Product, ProductRequest } from './models';

/**
 * In-memory stand-in for the API, enabled by `environment.useMock` (`npm run start:mock`).
 * State lives only for the page session; any password works, and an email containing "admin" gets the Admin role.
 */

const LATENCY_MS = 250;
const base = environment.apiUrl;

const now = () => new Date().toISOString();
let nextId = 1;
const products: Product[] = Array.from({ length: 45 }, (_, i) => ({
  id: nextId++,
  name: `Sample product ${i + 1}`,
  price: Math.round((5 + ((i * 37) % 200) + ((i * 13) % 100) / 100) * 100) / 100,
  createdAtUtc: new Date(Date.now() - (45 - i) * 3_600_000).toISOString(),
  updatedAtUtc: null,
}));

let nextInvoiceId = 1;
const invoices: Invoice[] = [];

let session: { email: string; role: string } | null = null;

const ok = <T>(req: HttpRequest<unknown>, body: T, status = 200) =>
  of(new HttpResponse<T>({ url: req.url, status, body })).pipe(delay(LATENCY_MS));

const fail = (req: HttpRequest<unknown>, status: number, title: string, errors?: Record<string, string[]>) =>
  throwError(() => new HttpErrorResponse({ url: req.url, status, error: { title, errors } })).pipe(delay(LATENCY_MS));

const b64url = (o: object) => btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

function tokens(email: string): AuthResponse {
  const role = email.toLowerCase().includes('admin') ? 'Admin' : 'User';
  session = { email, role };
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const expiry = new Date(exp * 1000).toISOString();
  return {
    accessToken: `${b64url({ alg: 'none' })}.${b64url({ sub: '1', email, role, exp })}.mock`,
    accessTokenExpiresAtUtc: expiry,
    refreshToken: `mock-refresh-${Date.now()}`,
    refreshTokenExpiresAtUtc: new Date(exp * 1000 + 7 * 86_400_000).toISOString(),
  };
}

function validate(body: Partial<ProductRequest> | null): Record<string, string[]> | null {
  const errors: Record<string, string[]> = {};
  if (!body?.name?.trim()) errors['Name'] = ['Name is required.'];
  else if (body.name.length > 200) errors['Name'] = ['Name must be at most 200 characters.'];
  if (typeof body?.price !== 'number' || body.price < 0) errors['Price'] = ['Price must be zero or greater.'];
  return Object.keys(errors).length ? errors : null;
}

/** After a page reload the in-memory session is gone; recover it from the stored token. */
function restoreSession(): void {
  if (session) return;
  try {
    const stored = JSON.parse(localStorage.getItem('myapp.session') ?? 'null') as AuthResponse | null;
    const claims = JSON.parse(atob(stored!.accessToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    session = { email: claims.email, role: claims.role };
  } catch {
    // No usable stored session.
  }
}

function handle(req: HttpRequest<unknown>): Observable<HttpResponse<unknown>> {
  restoreSession();
  const path = req.url.slice(base.length);
  const method = req.method;

  if (path === '/auth/register' || path === '/auth/login') {
    const c = req.body as Credentials;
    if (!c?.email || !c?.password) {
      return fail(req, 400, 'Validation failed', { Email: ['Email and password are required.'] });
    }
    return ok(req, tokens(c.email));
  }
  if (path === '/auth/refresh') return ok(req, tokens(session?.email ?? 'user@example.com'));
  if (path === '/auth/logout') {
    session = null;
    return ok(req, null, 204);
  }
  if (path === '/auth/me') {
    return ok(req, { id: '1', email: session?.email ?? 'user@example.com', role: session?.role ?? 'User' });
  }

  if (path === '/products' && method === 'GET') {
    const size = Math.min(Math.max(Number(req.params.get('pageSize')) || 20, 1), 100);
    const totalCount = products.length;
    const totalPages = Math.ceil(totalCount / size);
    const page = Math.min(Math.max(Number(req.params.get('page')) || 1, 1), Math.max(totalPages, 1));
    const result: PagedResult<Product> = {
      items: products.slice((page - 1) * size, page * size),
      page,
      pageSize: size,
      totalCount,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
    return ok(req, result);
  }
  if (path === '/products' && method === 'POST') {
    const errors = validate(req.body as ProductRequest);
    if (errors) return fail(req, 400, 'Validation failed', errors);
    const body = req.body as ProductRequest;
    const created: Product = {
      id: nextId++,
      name: body.name.trim(),
      price: body.price,
      createdAtUtc: now(),
      updatedAtUtc: null,
    };
    products.push(created);
    return ok(req, created, 201);
  }

  if (path === '/invoices' && method === 'POST') {
    const body = req.body as InvoiceRequest;
    if (!body?.vehicleNo?.trim()) return fail(req, 400, 'Validation failed', { VehicleNo: ['Vehicle no is required.'] });
    const total = Math.round(body.lines.reduce((s, l) => s + l.total, 0) * 100) / 100;
    const created: Invoice = { ...body, id: nextInvoiceId++, total, createdAtUtc: now() };
    invoices.push(created);
    return ok(req, created, 201);
  }

  const m = /^\/products\/(\d+)$/.exec(path);
  if (m) {
    const index = products.findIndex((p) => p.id === Number(m[1]));
    if (index < 0) return fail(req, 404, 'Product not found');
    if (method === 'GET') return ok(req, products[index]);
    if (method === 'PUT') {
      const errors = validate(req.body as ProductRequest);
      if (errors) return fail(req, 400, 'Validation failed', errors);
      const body = req.body as ProductRequest;
      products[index] = { ...products[index], name: body.name.trim(), price: body.price, updatedAtUtc: now() };
      return ok(req, null, 204);
    }
    if (method === 'DELETE') {
      if (session?.role !== 'Admin') return fail(req, 403, 'Forbidden');
      products.splice(index, 1);
      return ok(req, null, 204);
    }
  }

  return fail(req, 404, `Mock API has no handler for ${method} ${path}`);
}

export const mockApiInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.url === environment.healthUrl) {
    return ok(req, 'Healthy');
  }
  return req.url.startsWith(base) ? handle(req) : next(req);
};
