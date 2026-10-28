using FluentValidation;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using MyApp.Business.Exceptions;
using MyApp.Business.Models;
using MyApp.Data.Entities;
using MyApp.Data.Infrastructure;
using MyApp.Data.Repositories;

namespace MyApp.Business.Auth;

public sealed class AuthService(
    IUserRepository users,
    IPasswordHasher passwordHasher,
    ITokenService tokenService,
    IOptions<JwtOptions> jwtOptions,
    TimeProvider timeProvider,
    IValidator<RegisterRequest> registerValidator,
    IValidator<LoginRequest> loginValidator,
    IValidator<RefreshTokenRequest> refreshValidator,
    ILogger<AuthService> logger) : LoggingBase(logger), IAuthService
{
    private const string InvalidCredentials = "Invalid email or password.";
    private const string InvalidRefreshToken = "Invalid refresh token.";

    public async Task<AuthResponse> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken = default)
    {
        await registerValidator.ValidateAndThrowAsync(request, cancellationToken);

        var user = await users.CreateAsync(new User
        {
            Email = Normalize(request.Email),
            PasswordHash = passwordHasher.Hash(request.Password),
            Role = Roles.User,
            IsActive = true
        }, cancellationToken) ?? throw new ConflictException("Email is already registered.");

        LogInformation("Registered user {UserId}", user.Id);
        return await IssueTokensAsync(user, cancellationToken);
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default)
    {
        await loginValidator.ValidateAndThrowAsync(request, cancellationToken);

        var user = await users.GetByEmailAsync(Normalize(request.Email), cancellationToken);

        // Always verify (against a dummy hash for unknown users) so timing does not reveal account existence.
        var passwordValid = passwordHasher.Verify(user?.PasswordHash, request.Password);
        if (user is null || !passwordValid || !user.IsActive)
        {
            LogWarning("Failed login attempt");
            throw new UnauthorizedException(InvalidCredentials);
        }

        return await IssueTokensAsync(user, cancellationToken);
    }

    public async Task<AuthResponse> RefreshAsync(RefreshTokenRequest request, CancellationToken cancellationToken = default)
    {
        await refreshValidator.ValidateAndThrowAsync(request, cancellationToken);

        var oldHash = tokenService.HashRefreshToken(request.RefreshToken);
        var stored = await users.GetRefreshTokenAsync(oldHash, cancellationToken)
            ?? throw new UnauthorizedException(InvalidRefreshToken);

        if (stored.RevokedAtUtc is not null)
        {
            await HandleReuseAsync(stored.UserId, cancellationToken);
            throw new UnauthorizedException(InvalidRefreshToken);
        }

        if (stored.ExpiresAtUtc <= timeProvider.GetUtcNow().UtcDateTime)
        {
            throw new UnauthorizedException(InvalidRefreshToken);
        }

        var user = await users.GetByIdAsync(stored.UserId, cancellationToken);
        if (user is not { IsActive: true })
        {
            throw new UnauthorizedException(InvalidRefreshToken);
        }

        var newRefreshToken = tokenService.CreateRefreshToken();

        // Atomic: only one concurrent caller can win; a loser is treated as token reuse.
        if (!await users.RevokeRefreshTokenAsync(oldHash, tokenService.HashRefreshToken(newRefreshToken), cancellationToken))
        {
            await HandleReuseAsync(stored.UserId, cancellationToken);
            throw new UnauthorizedException(InvalidRefreshToken);
        }

        return await IssueTokensAsync(user, cancellationToken, newRefreshToken);
    }

    public async Task LogoutAsync(RefreshTokenRequest request, CancellationToken cancellationToken = default)
    {
        await refreshValidator.ValidateAndThrowAsync(request, cancellationToken);
        await users.RevokeRefreshTokenAsync(tokenService.HashRefreshToken(request.RefreshToken), null, cancellationToken);
    }

    private async Task HandleReuseAsync(int userId, CancellationToken cancellationToken)
    {
        // A revoked token being presented again suggests theft: invalidate every session for the user.
        await users.RevokeAllRefreshTokensAsync(userId, cancellationToken);
        LogWarning("Refresh token reuse detected for user {UserId}; all sessions revoked", userId);
    }

    private async Task<AuthResponse> IssueTokensAsync(User user, CancellationToken cancellationToken, string? refreshToken = null)
    {
        var (accessToken, accessExpires) = tokenService.CreateAccessToken(user);

        refreshToken ??= tokenService.CreateRefreshToken();
        var refreshExpires = timeProvider.GetUtcNow().UtcDateTime.AddDays(jwtOptions.Value.RefreshTokenDays);

        await users.AddRefreshTokenAsync(new RefreshToken
        {
            UserId = user.Id,
            TokenHash = tokenService.HashRefreshToken(refreshToken),
            ExpiresAtUtc = refreshExpires
        }, cancellationToken);

        return new AuthResponse(accessToken, accessExpires, refreshToken, refreshExpires);
    }

    private static string Normalize(string email) => email.Trim().ToLowerInvariant();
}
