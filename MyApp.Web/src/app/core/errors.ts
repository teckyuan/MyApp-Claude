import { HttpErrorResponse } from '@angular/common/http';

/**
 * Turns an API failure into user-facing messages. The API returns RFC 7807 problem details;
 * validation failures (400) carry an `errors` map of field -> messages.
 */
export function describeError(err: unknown): string[] {
  if (!(err instanceof HttpErrorResponse)) {
    return ['Something went wrong.'];
  }

  switch (err.status) {
    case 0:
      return ['Cannot reach the API. Is it running?'];
    case 429:
      return ['Too many requests. Please wait a moment and try again.'];
    case 403:
      return ['You do not have permission to do that.'];
  }

  const body = err.error as { title?: string; detail?: string; errors?: Record<string, string[]> } | null;

  if (body?.errors) {
    return Object.values(body.errors).flat();
  }
  return [body?.detail ?? body?.title ?? `Request failed (${err.status}).`];
}
