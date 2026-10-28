using FluentValidation;
using MyApp.Business.Models;

namespace MyApp.Business.Validators;

public sealed class CreateInvoiceRequestValidator : AbstractValidator<CreateInvoiceRequest>
{
    public CreateInvoiceRequestValidator()
    {
        RuleFor(x => x.BillTo).MaximumLength(200);
        RuleFor(x => x.VehicleNo).NotEmpty().MaximumLength(30);
        RuleFor(x => x.ChassisNo).MaximumLength(50);
        RuleFor(x => x.Mileage).GreaterThanOrEqualTo(0);
        RuleFor(x => x.Date).NotEqual(default(DateOnly));
        RuleFor(x => x.Lines).NotNull();
        RuleForEach(x => x.Lines).SetValidator(new InvoiceLineDtoValidator());
    }
}

public sealed class InvoiceLineDtoValidator : AbstractValidator<InvoiceLineDto>
{
    public InvoiceLineDtoValidator()
    {
        RuleFor(x => x.Item).MaximumLength(200);
        RuleFor(x => x.Description).MaximumLength(500);
        RuleFor(x => x.Unit).MaximumLength(30);
        RuleFor(x => x.Qty).GreaterThanOrEqualTo(0).PrecisionScale(18, 2, ignoreTrailingZeros: true);
        RuleFor(x => x.UnitRate).GreaterThanOrEqualTo(0).PrecisionScale(18, 2, ignoreTrailingZeros: true);
    }
}
