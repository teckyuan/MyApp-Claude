import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { ApiStatus, HealthService } from './health.service';

describe('HealthService', () => {
  let http: HttpTestingController;
  let service: HealthService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    service = TestBed.inject(HealthService);
  });
  afterEach(() => http.verify());

  it('reports "up" when the API answers', () => {
    let status: ApiStatus | undefined;
    service.check().subscribe((s) => (status = s));
    http.expectOne(environment.healthUrl).flush('Healthy');
    expect(status).toBe('up');
  });

  it('reports "down" when the API fails', () => {
    let status: ApiStatus | undefined;
    service.check().subscribe((s) => (status = s));
    http.expectOne(environment.healthUrl).flush('nope', { status: 503, statusText: 'Unavailable' });
    expect(status).toBe('down');
  });
});
