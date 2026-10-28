using FluentValidation;
using Microsoft.Extensions.Logging;
using MyApp.Business.Exceptions;
using MyApp.Business.Models;
using MyApp.Data.Entities;
using MyApp.Data.Infrastructure;
using MyApp.Data.Repositories;

namespace MyApp.Business.Services;

public sealed class ProductService(
    IProductRepository repository,
    IValidator<CreateProductRequest> createValidator,
    IValidator<UpdateProductRequest> updateValidator,
    IValidator<PagingQuery> pagingValidator,
    ILogger<ProductService> logger) : LoggingBase(logger), IProductService
{
    private const string ResourceName = nameof(Product);

    public async Task<PagedResult<ProductDto>> GetPagedAsync(PagingQuery query, CancellationToken cancellationToken = default)
    {
        await pagingValidator.ValidateAndThrowAsync(query, cancellationToken);

        var (items, total) = await repository.GetPagedAsync(query.Page, query.PageSize, cancellationToken);
        return new PagedResult<ProductDto>(items.Select(ToDto).ToList(), query.Page, query.PageSize, total);
    }

    public async Task<ProductDto> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var product = await repository.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException(ResourceName, id);
        return ToDto(product);
    }

    public async Task<ProductDto> CreateAsync(CreateProductRequest request, CancellationToken cancellationToken = default)
    {
        await createValidator.ValidateAndThrowAsync(request, cancellationToken);

        var created = await repository.CreateAsync(
            new Product { Name = request.Name.Trim(), Price = request.Price }, cancellationToken);

        LogInformation("Created product {ProductId}", created.Id);
        return ToDto(created);
    }

    public async Task UpdateAsync(int id, UpdateProductRequest request, CancellationToken cancellationToken = default)
    {
        await updateValidator.ValidateAndThrowAsync(request, cancellationToken);

        var updated = await repository.UpdateAsync(
            new Product { Id = id, Name = request.Name.Trim(), Price = request.Price }, cancellationToken);
        if (!updated)
        {
            throw new NotFoundException(ResourceName, id);
        }

        LogInformation("Updated product {ProductId}", id);
    }

    public async Task DeleteAsync(int id, CancellationToken cancellationToken = default)
    {
        if (!await repository.DeleteAsync(id, cancellationToken))
        {
            throw new NotFoundException(ResourceName, id);
        }

        LogInformation("Deleted product {ProductId}", id);
    }

    private static ProductDto ToDto(Product p) => new(p.Id, p.Name, p.Price, p.CreatedAtUtc, p.UpdatedAtUtc);
}
