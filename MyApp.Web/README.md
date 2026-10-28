# MyApp.Web

Angular 20 front end (standalone components, signals, reactive forms) for the MyApp API.

## Run

Requires Node.js 20.19+ (or 22.12+).

```powershell
cd MyApp.Web
npm install
npm start          # http://localhost:4200
```

Start the API first (`https` launch profile, `https://localhost:7249`). `ng serve` proxies `/api` and `/health`
to it using [proxy.conf.json](proxy.conf.json), so no CORS setup is needed in development. If your API runs on a
different URL, change the `target` there.

## What it covers

| API                                    | Where                                                                                          |
| -------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `POST /api/v1/auth/register`, `/login` | Register / Login pages                                                                         |
| `POST /api/v1/auth/refresh`            | `AuthInterceptor`: on a 401 it refreshes once (single-flight) and replays the request          |
| `POST /api/v1/auth/logout`             | Log out button (revokes the refresh token)                                                     |
| `GET /api/v1/auth/me`                  | Profile page                                                                                   |
| `GET/POST/PUT/DELETE /api/v1/products` | Products page: paging, create, edit, delete (Delete shown to admins only; the API enforces it) |
| `GET /health/ready`                    | API status badge in the header                                                                 |

## Layout

- `src/app/core`: models mirroring the API DTOs, `AuthService`, interceptor, route guard, API services, error mapping.
- `src/app/features`: `auth` (login, register), `products`, `profile`.
- `src/environments/environment.ts`: API base URLs. For a deployed build, set `apiUrl`/`healthUrl` to the API origin and
  add the web origin to `Cors:AllowedOrigins` in the API.

## Notes

- Tokens are stored in `localStorage` so sessions survive reloads. That is readable by any XSS, so avoid rendering
  untrusted HTML.
- Validation errors (400) from the API are shown as a list; 401/403/409/429 get friendly messages.
