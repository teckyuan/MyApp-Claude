# MyApp

3-tier ASP.NET Core Web API (.NET 9).

```
MyApp.Api        Presentation  controllers, middleware, composition root (Program.cs)
MyApp.Business   Business      services, DTOs, FluentValidation validators, domain exceptions
MyApp.Data       Data          Dapper repositories, connection factory, SQL scripts
MyApp.Tests      xUnit tests
```

Dependencies flow one way: `Api -> Business -> Data`. Each tier exposes one `Add…Layer()` extension for DI registration; repositories and services are `internal` where possible.

## Run locally

1. Run the scripts in `MyApp.Data/Scripts` in order against your SQL Server (`001` creates `MyAppDb`).
2. Set the connection string and JWT signing key (Development defaults to LocalDB and a throwaway dev key in `appsettings.Development.json`):
   ```
   dotnet user-secrets set "Database:ConnectionString" "<connection string>" --project MyApp.Api
   dotnet user-secrets set "Jwt:SigningKey" "<random string, 32+ chars>" --project MyApp.Api
   ```
   In other environments use the env vars `Database__ConnectionString` and `Jwt__SigningKey`. The app refuses to start without them.
3. `dotnet run --project MyApp.Api`
4. OpenAPI document (Development only): `/openapi/v1.json`

## Endpoints

| Method | Route | Notes |
|---|---|---|
| POST | `/api/v1/auth/register` | anonymous; returns tokens; 409 if email taken |
| POST | `/api/v1/auth/login` | anonymous; returns tokens |
| POST | `/api/v1/auth/refresh` | anonymous; rotates the refresh token |
| POST | `/api/v1/auth/logout` | anonymous; revokes the refresh token |
| GET | `/api/v1/auth/me` | token required |
| GET | `/api/v1/products?page=1&pageSize=20` | token required; paged, max page size 100 |
| GET | `/api/v1/products/{id}` | token required; 404 if missing |
| POST | `/api/v1/products` | token required; 201 + Location |
| PUT | `/api/v1/products/{id}` | token required; 204 |
| DELETE | `/api/v1/products/{id}` | **Admin** role required; 204 |
| GET | `/health/live` | anonymous; process is up |
| GET | `/health/ready` | anonymous; database reachable |

Send `Authorization: Bearer <accessToken>`. Every endpoint requires authentication unless it is marked `[AllowAnonymous]`.

## Authentication

- Self-issued JWTs (HMAC-SHA256), 15-minute access tokens; opaque refresh tokens (7 days) stored only as SHA-256 hashes.
- Refresh tokens rotate on every use. Presenting an already-used token is treated as theft and revokes all of that user's sessions.
- Passwords are hashed with PBKDF2-SHA256 (600k iterations); minimum length 12. Login timing does not reveal whether an email exists.
- `/auth/*` has a stricter rate limit (10/min/IP, `RateLimiting:AuthPermitLimit`).
- New users get the `User` role. Promote an admin in SQL: `UPDATE dbo.Users SET Role = 'Admin' WHERE Email = '...'`.
- To use an external identity provider (Entra ID, Auth0, ...) instead, drop `AuthController` / `AuthService` and point `AddJwtBearer` at the provider's authority.

Errors are RFC 7807 problem details (with `traceId`; validation failures include an `errors` map).

## Build, test, containerise

```
dotnet build
dotnet test
docker build -t myapp .
docker run -p 8080:8080 -e Database__ConnectionString="<connection string>" myapp
```

## Configuration

| Key | Purpose |
|---|---|
| `Database:ConnectionString` / `CommandTimeoutSeconds` | validated at startup |
| `RateLimiting:PermitLimit` | requests per minute per IP (default 100) |
| `Cors:AllowedOrigins` | empty = no cross-origin access |
| `nlog.config` | NLog targets (console, rolling file in `logs/`) and level rules |

## Conventions

- Package versions live in `Directory.Packages.props`; shared build settings (nullable, warnings-as-errors, analyzers) in `Directory.Build.props`.
- New API versions: add a `Controllers/V2` folder and `[ApiVersion("2.0")]`.
- Schema changes: add a numbered script in `MyApp.Data/Scripts`.
