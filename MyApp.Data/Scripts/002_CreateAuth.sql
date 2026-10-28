USE MyAppDb;
GO

IF OBJECT_ID('dbo.Users') IS NULL
CREATE TABLE dbo.Users (
    Id           INT IDENTITY(1,1) CONSTRAINT PK_Users PRIMARY KEY,
    Email        NVARCHAR(256)  NOT NULL,
    PasswordHash NVARCHAR(512)  NOT NULL,
    Role         NVARCHAR(50)   NOT NULL CONSTRAINT DF_Users_Role DEFAULT 'User',
    IsActive     BIT            NOT NULL CONSTRAINT DF_Users_IsActive DEFAULT 1,
    CreatedAtUtc DATETIME2(3)   NOT NULL CONSTRAINT DF_Users_CreatedAtUtc DEFAULT SYSUTCDATETIME(),
    UpdatedAtUtc DATETIME2(3)   NULL,
    CONSTRAINT UQ_Users_Email UNIQUE (Email)
);
GO

IF OBJECT_ID('dbo.RefreshTokens') IS NULL
CREATE TABLE dbo.RefreshTokens (
    Id                  INT IDENTITY(1,1) CONSTRAINT PK_RefreshTokens PRIMARY KEY,
    UserId              INT           NOT NULL CONSTRAINT FK_RefreshTokens_Users REFERENCES dbo.Users (Id) ON DELETE CASCADE,
    TokenHash           CHAR(64)      NOT NULL,
    CreatedAtUtc        DATETIME2(3)  NOT NULL CONSTRAINT DF_RefreshTokens_CreatedAtUtc DEFAULT SYSUTCDATETIME(),
    ExpiresAtUtc        DATETIME2(3)  NOT NULL,
    RevokedAtUtc        DATETIME2(3)  NULL,
    ReplacedByTokenHash CHAR(64)      NULL,
    CONSTRAINT UQ_RefreshTokens_TokenHash UNIQUE (TokenHash)
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_RefreshTokens_UserId')
CREATE INDEX IX_RefreshTokens_UserId ON dbo.RefreshTokens (UserId);
GO

-- Promote a registered user to administrator (Admin role is required to delete products):
-- UPDATE dbo.Users SET Role = 'Admin' WHERE Email = 'someone@example.com';
