using Dapper;
using Microsoft.Extensions.Logging;
using MyApp.Data.Entities;
using MyApp.Data.Infrastructure;

namespace MyApp.Data.Repositories;

public sealed class InvoiceRepository(IDbConnectionFactory connectionFactory, ILogger<InvoiceRepository> logger)
    : LoggingBase(logger), IInvoiceRepository
{
    public Task<Invoice> CreateAsync(Invoice invoice, CancellationToken cancellationToken = default) =>
        TraceAsync(async () =>
        {
            const string insertInvoice = """
                INSERT INTO dbo.Invoices (BillTo, VehicleNo, ChassisNo, Mileage, InvoiceDate, Total, CreatedAtUtc)
                OUTPUT INSERTED.Id, INSERTED.CreatedAtUtc
                VALUES (@BillTo, @VehicleNo, @ChassisNo, @Mileage, @InvoiceDate, @Total, SYSUTCDATETIME())
                """;

            const string insertLine = """
                INSERT INTO dbo.InvoiceLines (InvoiceId, LineNo, Item, Description, Qty, Unit, UnitRate, Total)
                VALUES (@InvoiceId, @LineNo, @Item, @Description, @Qty, @Unit, @UnitRate, @Total)
                """;

            await using var db = await connectionFactory.OpenConnectionAsync(cancellationToken);
            await using var tx = await db.BeginTransactionAsync(cancellationToken);

            var inserted = await db.QuerySingleAsync<(int Id, DateTime CreatedAtUtc)>(
                Command(insertInvoice, invoice, tx, cancellationToken));
            invoice.Id = inserted.Id;
            invoice.CreatedAtUtc = inserted.CreatedAtUtc;

            foreach (var line in invoice.Lines)
            {
                line.InvoiceId = invoice.Id;
            }

            if (invoice.Lines.Count > 0)
            {
                await db.ExecuteAsync(Command(insertLine, invoice.Lines, tx, cancellationToken));
            }

            await tx.CommitAsync(cancellationToken);
            return invoice;
        });

    public Task<Invoice?> GetByIdAsync(int id, CancellationToken cancellationToken = default) =>
        TraceAsync<Invoice?>(async () =>
        {
            const string sql = """
                SELECT Id, BillTo, VehicleNo, ChassisNo, Mileage, InvoiceDate, Total, CreatedAtUtc, UpdatedAtUtc
                FROM dbo.Invoices WHERE Id = @id;

                SELECT Id, InvoiceId, LineNo, Item, Description, Qty, Unit, UnitRate, Total
                FROM dbo.InvoiceLines WHERE InvoiceId = @id ORDER BY LineNo;
                """;

            await using var db = await connectionFactory.OpenConnectionAsync(cancellationToken);
            using var multi = await db.QueryMultipleAsync(Command(sql, new { id }, null, cancellationToken));
            var invoice = await multi.ReadSingleOrDefaultAsync<Invoice>();
            if (invoice is not null)
            {
                invoice.Lines = (await multi.ReadAsync<InvoiceLine>()).AsList();
            }

            return invoice;
        });

    private CommandDefinition Command(
        string sql, object parameters, System.Data.Common.DbTransaction? transaction, CancellationToken cancellationToken) =>
        new(sql, parameters, transaction, connectionFactory.CommandTimeoutSeconds, cancellationToken: cancellationToken);
}
