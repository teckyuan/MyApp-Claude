USE MyAppDb;
GO
IF OBJECT_ID('dbo.Invoices') IS NULL
CREATE TABLE dbo.Invoices (
    Id           INT IDENTITY(1,1) CONSTRAINT PK_Invoices PRIMARY KEY,
    BillTo       NVARCHAR(200)  NOT NULL CONSTRAINT DF_Invoices_BillTo DEFAULT '',
    VehicleNo    NVARCHAR(30)   NOT NULL,
    ChassisNo    NVARCHAR(50)   NOT NULL CONSTRAINT DF_Invoices_ChassisNo DEFAULT '',
    Mileage      INT            NULL CONSTRAINT CK_Invoices_Mileage CHECK (Mileage >= 0),
    InvoiceDate  DATE           NOT NULL,
    Total        DECIMAL(18,2)  NOT NULL CONSTRAINT CK_Invoices_Total CHECK (Total >= 0),
    CreatedAtUtc DATETIME2(3)   NOT NULL CONSTRAINT DF_Invoices_CreatedAtUtc DEFAULT SYSUTCDATETIME(),
    UpdatedAtUtc DATETIME2(3)   NULL
);
GO
IF OBJECT_ID('dbo.InvoiceLines') IS NULL
CREATE TABLE dbo.InvoiceLines (
    Id          INT IDENTITY(1,1) CONSTRAINT PK_InvoiceLines PRIMARY KEY,
    InvoiceId   INT            NOT NULL CONSTRAINT FK_InvoiceLines_Invoices REFERENCES dbo.Invoices(Id) ON DELETE CASCADE,
    LineNo      INT            NOT NULL,
    Item        NVARCHAR(200)  NOT NULL CONSTRAINT DF_InvoiceLines_Item DEFAULT '',
    Description NVARCHAR(500)  NOT NULL CONSTRAINT DF_InvoiceLines_Description DEFAULT '',
    Qty         DECIMAL(18,2)  NOT NULL CONSTRAINT CK_InvoiceLines_Qty CHECK (Qty >= 0),
    Unit        NVARCHAR(30)   NOT NULL CONSTRAINT DF_InvoiceLines_Unit DEFAULT '',
    UnitRate    DECIMAL(18,2)  NOT NULL CONSTRAINT CK_InvoiceLines_UnitRate CHECK (UnitRate >= 0),
    Total       DECIMAL(18,2)  NOT NULL
);
GO
