using MyApp.Data.Entities;

namespace MyApp.Business.Auth;

public interface ITokenService
{
    (string Token, DateTime ExpiresAtUtc) CreateAccessToken(User user);

    /// <summary>Generates a cryptographically random opaque refresh token.</summary>
    string CreateRefreshToken();

    /// <summary>SHA-256 hex digest used to store and look up refresh tokens.</summary>
    string HashRefreshToken(string token);
}
