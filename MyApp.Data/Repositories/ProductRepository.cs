using Dapper;
using Microsoft.Extensions.Logging;
using MyApp.Data.Entities;
using MyApp.Data.Infrastructure;

namespace MyApp.Data.Repositories;

public sealed class ProductRepository(IDbConnectionFactory connectionFactory, ILogger<ProductRepository> logger)
    : LoggingBase(logger), IProductRepository
{
    public Task<(IReadOnlyList<Product> Items, int TotalCount)> GetPagedAsync(
        int page, int pageSize, CancellationToken cancellationToken = default) =>
        TraceAsync<(IReadOnlyList<Product> Items, int TotalCount)>(async () =>
        {
            const string sql = """
                SELECT COUNT(*) FROM dbo.Products;

                SELECT Id, Name, Price, CreatedAtUtc, UpdatedAtUtc
                FROM dbo.Products
                ORDER BY Id
                OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY;
                """;

            await using var db = await connectionFactory.OpenConnectionAsync(cancellationToken);
            using var multi = await db.QueryMultipleAsync(Command(sql, new { Offset = (page - 1) * pageSize, PageSize = pageSize }, cancellationToken));
            var total = await multi.ReadSingleAsync<int>();
            var items = (await multi.ReadAsync<Product>()).AsList();
            return (items, total);
        });

    public Task<Product?> GetByIdAsync(int id, CancellationToken cancellationToken = default) =>
        TraceAsync<Product?>(async () =>
        {
            const string sql = """
                SELECT Id, Name, Price, CreatedAtUtc, UpdatedAtUtc
                FROM dbo.Products WHERE Id = @id
                """;

            await using var db = await connectionFactory.OpenConnectionAsync(cancellationToken);
            return await db.QuerySingleOrDefaultAsync<Product>(Command(sql, new { id }, cancellationToken));
        });

    public Task<Product> CreateAsync(Product product, CancellationToken cancellationToken = default) =>
        TraceAsync(async () =>
        {
            const string sql = """
                INSERT INTO dbo.Products (Name, Price, CreatedAtUtc)
                OUTPUT INSERTED.Id, INSERTED.CreatedAtUtc
                VALUES (@Name, @Price, SYSUTCDATETIME())
                """;

            await using var db = await connectionFactory.OpenConnectionAsync(cancellationToken);
            var inserted = await db.QuerySingleAsync<(int Id, DateTime CreatedAtUtc)>(Command(sql, product, cancellationToken));
            product.Id = inserted.Id;
            product.CreatedAtUtc = inserted.CreatedAtUtc;
            return product;
        });

    public Task<bool> UpdateAsync(Product product, CancellationToken cancellationToken = default) =>
        TraceAsync(async () =>
        {
            const string sql = """
                UPDATE dbo.Products
                SET Name = @Name, Price = @Price, UpdatedAtUtc = SYSUTCDATETIME()
                WHERE Id = @Id
                """;

            await using var db = await connectionFactory.OpenConnectionAsync(cancellationToken);
            return await db.ExecuteAsync(Command(sql, product, cancellationToken)) > 0;
        });

    public Task<bool> DeleteAsync(int id, CancellationToken cancellationToken = default) =>
        TraceAsync(async () =>
        {
            await using var db = await connectionFactory.OpenConnectionAsync(cancellationToken);
            return await db.ExecuteAsync(Command("DELETE FROM dbo.Products WHERE Id = @id", new { id }, cancellationToken)) > 0;
        });

    private CommandDefinition Command(string sql, object parameters, CancellationToken cancellationToken) =>
        new(sql, parameters, commandTimeout: connectionFactory.CommandTimeoutSeconds, cancellationToken: cancellationToken);
}
