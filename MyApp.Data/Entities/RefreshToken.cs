namespace MyApp.Data.Entities;

public class RefreshToken
{
    public int Id { get; set; }
    public int UserId { get; set; }

    /// <summary>SHA-256 (hex) of the token; the raw token is never stored.</summary>
    public string TokenHash { get; set; } = string.Empty;

    public DateTime CreatedAtUtc { get; set; }
    public DateTime ExpiresAtUtc { get; set; }
    public DateTime? RevokedAtUtc { get; set; }
    public string? ReplacedByTokenHash { get; set; }
}
