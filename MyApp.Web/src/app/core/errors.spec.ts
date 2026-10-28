import { HttpErrorResponse } from '@angular/common/http';
import { describeError } from './errors';

const http = (status: number, error: unknown = null) => new HttpErrorResponse({ status, error });

describe('describeError', () => {
  it('returns a generic message for non-HTTP errors', () => {
    expect(describeError(new Error('boom'))).toEqual(['Something went wrong.']);
  });

  it('explains an unreachable API (status 0)', () => {
    expect(describeError(http(0))).toEqual(['Cannot reach the API. Is it running?']);
  });

  it('maps 403 and 429 to friendly messages', () => {
    expect(describeError(http(403))[0]).toMatch(/permission/);
    expect(describeError(http(429))[0]).toMatch(/Too many requests/);
  });

  it('flattens validation errors from problem details', () => {
    const err = http(400, { errors: { Name: ['Name is required.'], Price: ['Too low.', 'Not a number.'] } });
    expect(describeError(err)).toEqual(['Name is required.', 'Too low.', 'Not a number.']);
  });

  it('falls back to detail, then title, then the status code', () => {
    expect(describeError(http(409, { detail: 'Duplicate', title: 'Conflict' }))).toEqual(['Duplicate']);
    expect(describeError(http(409, { title: 'Conflict' }))).toEqual(['Conflict']);
    expect(describeError(http(500))).toEqual(['Request failed (500).']);
  });
});
