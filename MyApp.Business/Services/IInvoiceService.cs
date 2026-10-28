using MyApp.Business.Models;

namespace MyApp.Business.Services;

public interface IInvoiceService
{
    /// <exception cref="Exceptions.NotFoundException">The invoice does not exist.</exception>
    Task<InvoiceDto> GetByIdAsync(int id, CancellationToken cancellationToken = default);

    Task<InvoiceDto> CreateAsync(CreateInvoiceRequest request, CancellationToken cancellationToken = default);
}
