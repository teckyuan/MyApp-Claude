using MyApp.Business.Models;

namespace MyApp.Business.Auth;

public interface IAuthService
{
    /// <exception cref="Exceptions.ConflictException">The email is already registered.</exception>
    Task<AuthResponse> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken = default);

    /// <exception cref="Exceptions.UnauthorizedException">Invalid credentials or inactive account.</exception>
    Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default);

    /// <summary>Exchanges a refresh token for a new token pair; the presented token is revoked (rotation).</summary>
    /// <exception cref="Exceptions.UnauthorizedException">Token unknown, expired, or already used.</exception>
    Task<AuthResponse> RefreshAsync(RefreshTokenRequest request, CancellationToken cancellationToken = default);

    /// <summary>Revokes the refresh token. Unknown tokens are ignored.</summary>
    Task LogoutAsync(RefreshTokenRequest request, CancellationToken cancellationToken = default);
}
