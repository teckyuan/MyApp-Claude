using MyApp.Business.Models;

namespace MyApp.Business.Services;

public interface IProductService
{
    Task<PagedResult<ProductDto>> GetPagedAsync(PagingQuery query, CancellationToken cancellationToken = default);

    /// <exception cref="Exceptions.NotFoundException">The product does not exist.</exception>
    Task<ProductDto> GetByIdAsync(int id, CancellationToken cancellationToken = default);

    Task<ProductDto> CreateAsync(CreateProductRequest request, CancellationToken cancellationToken = default);

    /// <exception cref="Exceptions.NotFoundException">The product does not exist.</exception>
    Task UpdateAsync(int id, UpdateProductRequest request, CancellationToken cancellationToken = default);

    /// <exception cref="Exceptions.NotFoundException">The product does not exist.</exception>
    Task DeleteAsync(int id, CancellationToken cancellationToken = default);
}
