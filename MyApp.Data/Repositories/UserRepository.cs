using Dapper;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Logging;
using MyApp.Data.Entities;
using MyApp.Data.Infrastructure;

namespace MyApp.Data.Repositories;

public sealed class UserRepository(IDbConnectionFactory connectionFactory, ILogger<UserRepository> logger)
    : LoggingBase(logger), IUserRepository
{
    private const int UniqueIndexViolation = 2601;
    private const int UniqueConstraintViolation = 2627;

    private const string UserColumns = "Id, Email, PasswordHash, Role, IsActive, CreatedAtUtc, UpdatedAtUtc";

    public Task<User?> GetByEmailAsync(string email, CancellationToken cancellationToken = default) =>
        TraceAsync<User?>(async () =>
        {
            await using var db = await connectionFactory.OpenConnectionAsync(cancellationToken);
            return await db.QuerySingleOrDefaultAsync<User>(
                Command($"SELECT {UserColumns} FROM dbo.Users WHERE Email = @email", new { email }, cancellationToken));
        });

    public Task<User?> GetByIdAsync(int id, CancellationToken cancellationToken = default) =>
        TraceAsync<User?>(async () =>
        {
            await using var db = await connectionFactory.OpenConnectionAsync(cancellationToken);
            return await db.QuerySingleOrDefaultAsync<User>(
                Command($"SELECT {UserColumns} FROM dbo.Users WHERE Id = @id", new { id }, cancellationToken));
        });

    public Task<User?> CreateAsync(User user, CancellationToken cancellationToken = default) =>
        TraceAsync<User?>(async () =>
        {
            const string sql = """
                INSERT INTO dbo.Users (Email, PasswordHash, Role, IsActive)
                OUTPUT INSERTED.Id, INSERTED.CreatedAtUtc
                VALUES (@Email, @PasswordHash, @Role, @IsActive)
                """;

            await using var db = await connectionFactory.OpenConnectionAsync(cancellationToken);
            try
            {
                var inserted = await db.QuerySingleAsync<(int Id, DateTime CreatedAtUtc)>(Command(sql, user, cancellationToken));
                user.Id = inserted.Id;
                user.CreatedAtUtc = inserted.CreatedAtUtc;
                return user;
            }
            catch (SqlException ex) when (ex.Number is UniqueIndexViolation or UniqueConstraintViolation)
            {
                return null;
            }
        });

    public Task AddRefreshTokenAsync(RefreshToken token, CancellationToken cancellationToken = default) =>
        TraceAsync(async () =>
        {
            const string sql = """
                INSERT INTO dbo.RefreshTokens (UserId, TokenHash, ExpiresAtUtc)
                VALUES (@UserId, @TokenHash, @ExpiresAtUtc)
                """;

            await using var db = await connectionFactory.OpenConnectionAsync(cancellationToken);
            await db.ExecuteAsync(Command(sql, token, cancellationToken));
        });

    public Task<RefreshToken?> GetRefreshTokenAsync(string tokenHash, CancellationToken cancellationToken = default) =>
        TraceAsync<RefreshToken?>(async () =>
        {
            const string sql = """
                SELECT Id, UserId, TokenHash, CreatedAtUtc, ExpiresAtUtc, RevokedAtUtc, ReplacedByTokenHash
                FROM dbo.RefreshTokens WHERE TokenHash = @tokenHash
                """;

            await using var db = await connectionFactory.OpenConnectionAsync(cancellationToken);
            return await db.QuerySingleOrDefaultAsync<RefreshToken>(Command(sql, new { tokenHash }, cancellationToken));
        });

    public Task<bool> RevokeRefreshTokenAsync(
        string tokenHash, string? replacedByTokenHash, CancellationToken cancellationToken = default) =>
        TraceAsync(async () =>
        {
            const string sql = """
                UPDATE dbo.RefreshTokens
                SET RevokedAtUtc = SYSUTCDATETIME(), ReplacedByTokenHash = @replacedByTokenHash
                WHERE TokenHash = @tokenHash AND RevokedAtUtc IS NULL
                """;

            await using var db = await connectionFactory.OpenConnectionAsync(cancellationToken);
            return await db.ExecuteAsync(Command(sql, new { tokenHash, replacedByTokenHash }, cancellationToken)) > 0;
        });

    public Task RevokeAllRefreshTokensAsync(int userId, CancellationToken cancellationToken = default) =>
        TraceAsync(async () =>
        {
            const string sql = """
                UPDATE dbo.RefreshTokens SET RevokedAtUtc = SYSUTCDATETIME()
                WHERE UserId = @userId AND RevokedAtUtc IS NULL
                """;

            await using var db = await connectionFactory.OpenConnectionAsync(cancellationToken);
            await db.ExecuteAsync(Command(sql, new { userId }, cancellationToken));
        });

    private CommandDefinition Command(string sql, object parameters, CancellationToken cancellationToken) =>
        new(sql, parameters, commandTimeout: connectionFactory.CommandTimeoutSeconds, cancellationToken: cancellationToken);
}
