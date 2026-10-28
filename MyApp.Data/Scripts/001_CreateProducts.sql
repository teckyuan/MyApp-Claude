IF DB_ID('MyAppDb') IS NULL CREATE DATABASE MyAppDb;
GO
USE MyAppDb;
GO
IF OBJECT_ID('dbo.Products') IS NULL
CREATE TABLE dbo.Products (
    Id           INT IDENTITY(1,1) CONSTRAINT PK_Products PRIMARY KEY,
    Name         NVARCHAR(200)  NOT NULL,
    Price        DECIMAL(18,2)  NOT NULL CONSTRAINT CK_Products_Price CHECK (Price >= 0),
    CreatedAtUtc DATETIME2(3)   NOT NULL CONSTRAINT DF_Products_CreatedAtUtc DEFAULT SYSUTCDATETIME(),
    UpdatedAtUtc DATETIME2(3)   NULL
);
GO
