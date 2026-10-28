namespace MyApp.Business.Models;

public sealed record ProductDto(int Id, string Name, decimal Price, DateTime CreatedAtUtc, DateTime? UpdatedAtUtc);

public sealed record CreateProductRequest(string Name, decimal Price);

public sealed record UpdateProductRequest(string Name, decimal Price);
