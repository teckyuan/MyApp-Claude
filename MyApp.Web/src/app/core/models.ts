// Mirrors the API contracts in MyApp.Business/Models (System.Text.Json camelCase).

export interface Product {
  id: number;
  name: string;
  price: number;
  createdAtUtc: string;
  updatedAtUtc: string | null;
}

export interface ProductRequest {
  name: string;
  price: number;
}

export interface InvoiceLine {
  item: string;
  description: string;
  qty: number;
  unit: string;
  unitRate: number;
  /** qty * unitRate, rounded to 2 decimals. */
  total: number;
}

export interface InvoiceRequest {
  billTo: string;
  vehicleNo: string;
  chassisNo: string;
  mileage: number | null;
  /** yyyy-MM-dd */
  date: string;
  lines: InvoiceLine[];
}

export interface Invoice extends InvoiceRequest {
  id: number;
  total: number;
  createdAtUtc: string;
}

export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface Credentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  accessTokenExpiresAtUtc: string;
  refreshToken: string;
  refreshTokenExpiresAtUtc: string;
}

/** Result of GET /auth/me. */
export interface Me {
  id: string | null;
  email: string | null;
  role: string | null;
}

export const MAX_PAGE_SIZE = 100;
export const DEFAULT_PAGE_SIZE = 20;
