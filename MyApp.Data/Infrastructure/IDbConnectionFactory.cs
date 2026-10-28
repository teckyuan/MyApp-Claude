using System.Data.Common;

namespace MyApp.Data.Infrastructure;

public interface IDbConnectionFactory
{
    int CommandTimeoutSeconds { get; }

    /// <summary>Creates and opens a new connection. The caller owns and must dispose it.</summary>
    Task<DbConnection> OpenConnectionAsync(CancellationToken cancellationToken = default);
}
