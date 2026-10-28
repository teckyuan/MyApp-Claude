using System.Security.Cryptography;
using System.Text;

namespace MyApp.Business.Auth;

/// <summary>PBKDF2-HMAC-SHA256 hasher. Format: <c>PBKDF2$iterations$salt$hash</c> (base64 salt and hash).</summary>
internal sealed class Pbkdf2PasswordHasher : IPasswordHasher
{
    private const string Prefix = "PBKDF2";
    private const int Iterations = 600_000; // OWASP recommendation for PBKDF2-HMAC-SHA256
    private const int SaltSize = 16;
    private const int KeySize = 32;

    private static readonly Lazy<string> DummyHash = new(() => new Pbkdf2PasswordHasher().Hash("dummy-password"));

    public string Hash(string password)
    {
        var salt = RandomNumberGenerator.GetBytes(SaltSize);
        var key = Derive(password, salt, Iterations);
        return $"{Prefix}${Iterations}${Convert.ToBase64String(salt)}${Convert.ToBase64String(key)}";
    }

    public bool Verify(string? hash, string password)
    {
        var isDummy = hash is null;
        hash ??= DummyHash.Value;

        var parts = hash.Split('$');
        if (parts.Length != 4 || parts[0] != Prefix || !int.TryParse(parts[1], out var iterations))
        {
            return false;
        }

        try
        {
            var salt = Convert.FromBase64String(parts[2]);
            var expected = Convert.FromBase64String(parts[3]);
            var actual = Derive(password, salt, iterations);
            return CryptographicOperations.FixedTimeEquals(actual, expected) && !isDummy;
        }
        catch (FormatException)
        {
            return false;
        }
    }

    private static byte[] Derive(string password, byte[] salt, int iterations) =>
        Rfc2898DeriveBytes.Pbkdf2(Encoding.UTF8.GetBytes(password), salt, iterations, HashAlgorithmName.SHA256, KeySize);
}
