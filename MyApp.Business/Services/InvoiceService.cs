using FluentValidation;
using Microsoft.Extensions.Logging;
using MyApp.Business.Exceptions;
using MyApp.Business.Models;
using MyApp.Data.Entities;
using MyApp.Data.Infrastructure;
using MyApp.Data.Repositories;

namespace MyApp.Business.Services;

public sealed class InvoiceService(
    IInvoiceRepository repository,
    IValidator<CreateInvoiceRequest> createValidator,
    ILogger<InvoiceService> logger) : LoggingBase(logger), IInvoiceService
{
    private const string ResourceName = nameof(Invoice);

    public async Task<InvoiceDto> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var invoice = await repository.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException(ResourceName, id);
        return ToDto(invoice);
    }

    public async Task<InvoiceDto> CreateAsync(CreateInvoiceRequest request, CancellationToken cancellationToken = default)
    {
        await createValidator.ValidateAndThrowAsync(request, cancellationToken);

        // Totals are recomputed server-side; the client-supplied values are never trusted.
        var lines = request.Lines
            .Select((l, i) => new InvoiceLine
            {
                LineNo = i + 1,
                Item = (l.Item ?? string.Empty).Trim(),
                Description = (l.Description ?? string.Empty).Trim(),
                Qty = l.Qty,
                Unit = (l.Unit ?? string.Empty).Trim(),
                UnitRate = l.UnitRate,
                Total = Math.Round(l.Qty * l.UnitRate, 2, MidpointRounding.AwayFromZero),
            })
            .ToList();

        var created = await repository.CreateAsync(new Invoice
        {
            BillTo = request.BillTo?.Trim() ?? string.Empty,
            VehicleNo = request.VehicleNo.Trim(),
            ChassisNo = request.ChassisNo?.Trim() ?? string.Empty,
            Mileage = request.Mileage,
            InvoiceDate = request.Date,
            Total = lines.Sum(l => l.Total),
            Lines = lines,
        }, cancellationToken);

        LogInformation("Created invoice {InvoiceId}", created.Id);
        return ToDto(created);
    }

    private static InvoiceDto ToDto(Invoice i) => new(
        i.Id, i.BillTo, i.VehicleNo, i.ChassisNo, i.Mileage, i.InvoiceDate,
        i.Lines.Select(l => new InvoiceLineDto(l.Item, l.Description, l.Qty, l.Unit, l.UnitRate, l.Total)).ToList(),
        i.Total, i.CreatedAtUtc);
}





