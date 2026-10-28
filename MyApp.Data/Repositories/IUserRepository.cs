using MyApp.Data.Entities;

namespace MyApp.Data.Repositories;

public interface IUserRepository
{
    Task<User?> GetByEmailAsync(string email, CancellationToken cancellationToken = default);
    Task<User?> GetByIdAsync(int id, CancellationToken cancellationToken = default);

    /// <returns>The created user, or <c>null</c> if the email is already registered.</returns>
    Task<User?> CreateAsync(User user, CancellationToken cancellationToken = default);

    Task AddRefreshTokenAsync(RefreshToken token, CancellationToken cancellationToken = default);
    Task<RefreshToken?> GetRefreshTokenAsync(string tokenHash, CancellationToken cancellationToken = default);

    /// <summary>Atomically revokes a token that is still active.</summary>
    /// <returns><c>false</c> if the token does not exist or was already revoked.</returns>
    Task<bool> RevokeRefreshTokenAsync(string tokenHash, string? replacedByTokenHash, CancellationToken cancellationToken = default);

    Task RevokeAllRefreshTokensAsync(int userId, CancellationToken cancellationToken = default);
}
