namespace MyApp.Data.Entities;

public class Invoice : BaseEntity
{
    public string BillTo { get; set; } = string.Empty;
    public string VehicleNo { get; set; } = string.Empty;
    public string ChassisNo { get; set; } = string.Empty;
    public int? Mileage { get; set; }
    public DateOnly InvoiceDate { get; set; }
    public decimal Total { get; set; }
    public List<InvoiceLine> Lines { get; set; } = [];
}

public class InvoiceLine
{
    public int Id { get; set; }
    public int InvoiceId { get; set; }
    public int LineNo { get; set; }
    public string Item { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public decimal Qty { get; set; }
    public string Unit { get; set; } = string.Empty;
    public decimal UnitRate { get; set; }
    public decimal Total { get; set; }
}
