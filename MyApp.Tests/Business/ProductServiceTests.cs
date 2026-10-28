using FluentValidation;
using Microsoft.Extensions.Logging.Abstractions;
using MyApp.Business.Exceptions;
using MyApp.Business.Models;
using MyApp.Business.Services;
using MyApp.Business.Validators;
using MyApp.Data.Entities;
using MyApp.Data.Repositories;
using NSubstitute;

namespace MyApp.Tests.Business;

public class ProductServiceTests
{
    private readonly IProductRepository _repository = Substitute.For<IProductRepository>();
    private readonly ProductService _sut;

    public ProductServiceTests()
    {
        _sut = new ProductService(
            _repository,
            new CreateProductRequestValidator(),
            new UpdateProductRequestValidator(),
            new PagingQueryValidator(),
            NullLogger<ProductService>.Instance);
    }

    [Fact]
    public async Task GetById_ReturnsDto_WhenProductExists()
    {
        _repository.GetByIdAsync(1, Arg.Any<CancellationToken>())
            .Returns(new Product { Id = 1, Name = "Widget", Price = 9.99m });

        var result = await _sut.GetByIdAsync(1);

        Assert.Equal(1, result.Id);
        Assert.Equal("Widget", result.Name);
        Assert.Equal(9.99m, result.Price);
    }

    [Fact]
    public async Task GetById_Throws_WhenProductMissing()
    {
        _repository.GetByIdAsync(42, Arg.Any<CancellationToken>()).Returns((Product?)null);

        await Assert.ThrowsAsync<NotFoundException>(() => _sut.GetByIdAsync(42));
    }

    [Fact]
    public async Task GetPaged_MapsItemsAndTotals()
    {
        _repository.GetPagedAsync(2, 10, Arg.Any<CancellationToken>())
            .Returns(((IReadOnlyList<Product>)[new Product { Id = 11, Name = "A", Price = 1 }], 25));

        var result = await _sut.GetPagedAsync(new PagingQuery(2, 10));

        Assert.Single(result.Items);
        Assert.Equal(25, result.TotalCount);
        Assert.Equal(3, result.TotalPages);
        Assert.True(result.HasNextPage);
        Assert.True(result.HasPreviousPage);
    }

    [Theory]
    [InlineData(0, 10)]
    [InlineData(1, 0)]
    [InlineData(1, PagingQuery.MaxPageSize + 1)]
    public async Task GetPaged_Throws_OnInvalidPaging(int page, int pageSize)
    {
        await Assert.ThrowsAsync<ValidationException>(() => _sut.GetPagedAsync(new PagingQuery(page, pageSize)));
        await _repository.DidNotReceiveWithAnyArgs().GetPagedAsync(default, default, default);
    }

    [Fact]
    public async Task Create_TrimsNameAndReturnsCreatedProduct()
    {
        _repository.CreateAsync(Arg.Any<Product>(), Arg.Any<CancellationToken>())
            .Returns(call =>
            {
                var p = call.Arg<Product>();
                p.Id = 7;
                return p;
            });

        var result = await _sut.CreateAsync(new CreateProductRequest("  Gadget  ", 5m));

        Assert.Equal(7, result.Id);
        Assert.Equal("Gadget", result.Name);
    }

    [Theory]
    [InlineData("", 1)]
    [InlineData("   ", 1)]
    [InlineData("Valid", -0.01)]
    [InlineData("Valid", 1.234)]
    public async Task Create_Throws_OnInvalidRequest(string name, decimal price)
    {
        await Assert.ThrowsAsync<ValidationException>(() => _sut.CreateAsync(new CreateProductRequest(name, price)));
        await _repository.DidNotReceiveWithAnyArgs().CreateAsync(default!, default);
    }

    [Fact]
    public async Task Update_Throws_WhenProductMissing()
    {
        _repository.UpdateAsync(Arg.Any<Product>(), Arg.Any<CancellationToken>()).Returns(false);

        await Assert.ThrowsAsync<NotFoundException>(() => _sut.UpdateAsync(5, new UpdateProductRequest("X", 1)));
    }

    [Fact]
    public async Task Delete_Throws_WhenProductMissing()
    {
        _repository.DeleteAsync(5, Arg.Any<CancellationToken>()).Returns(false);

        await Assert.ThrowsAsync<NotFoundException>(() => _sut.DeleteAsync(5));
    }

    [Fact]
    public async Task Delete_Succeeds_WhenProductExists()
    {
        _repository.DeleteAsync(5, Arg.Any<CancellationToken>()).Returns(true);

        await _sut.DeleteAsync(5);

        await _repository.Received(1).DeleteAsync(5, Arg.Any<CancellationToken>());
    }
}
