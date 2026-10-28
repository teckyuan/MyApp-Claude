import { AuthResponse } from '../core/models';

const b64 = (o: object): string => btoa(JSON.stringify(o)).replace(/=+$/, '');

/** An unsigned JWT-shaped session; the app only decodes the payload client-side. */
export const fakeSession = (email: string, role: string): AuthResponse => ({
  accessToken: `${b64({ alg: 'none' })}.${b64({ email, role })}.sig`,
  accessTokenExpiresAtUtc: '2099-01-01T00:00:00Z',
  refreshToken: 'refresh-1',
  refreshTokenExpiresAtUtc: '2099-01-01T00:00:00Z',
});
