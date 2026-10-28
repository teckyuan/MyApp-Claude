namespace MyApp.Business.Models;

public sealed record InvoiceLineDto(
    string Item, string Description, decimal Qty, string Unit, decimal UnitRate, decimal Total);

public sealed record CreateInvoiceRequest(
    string? BillTo,
    string VehicleNo,
    string? ChassisNo,
    int? Mileage,
    DateOnly Date,
    IReadOnlyList<InvoiceLineDto> Lines);

public sealed record InvoiceDto(
    int Id,
    string BillTo,
    string VehicleNo,
    string ChassisNo,
    int? Mileage,
    DateOnly Date,
    IReadOnlyList<InvoiceLineDto> Lines,
    decimal Total,
    DateTime CreatedAtUtc);
