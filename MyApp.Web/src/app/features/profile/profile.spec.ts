import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { throwError, of } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { internals } from '../../testing/internals';
import { Profile } from './profile';

describe('Profile', () => {
  const create = (me: unknown) => {
    TestBed.configureTestingModule({ providers: [{ provide: AuthService, useValue: { me: () => me } }] });
    const fixture = TestBed.createComponent(Profile);
    fixture.detectChanges();
    return internals(fixture.componentInstance);
  };

  it('loads the current user', () => {
    const me = { id: '1', email: 'a@b.com', role: 'User' };
    const c = create(of(me));
    expect(c.me()).toEqual(me);
    expect(c.error()).toBe('');
  });

  it('shows an error message when loading fails', () => {
    const c = create(throwError(() => new HttpErrorResponse({ status: 0 })));
    expect(c.me()).toBeNull();
    expect(c.error()).toBe('Cannot reach the API. Is it running?');
  });
});
