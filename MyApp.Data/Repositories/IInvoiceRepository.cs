using MyApp.Data.Entities;

namespace MyApp.Data.Repositories;

public interface IInvoiceRepository
{
    /// <summary>Inserts the invoice and its lines in one transaction and returns it with generated ids.</summary>
    Task<Invoice> CreateAsync(Invoice invoice, CancellationToken cancellationToken = default);

    Task<Invoice?> GetByIdAsync(int id, CancellationToken cancellationToken = default);
}
