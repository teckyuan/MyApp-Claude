namespace MyApp.Business.Auth;

public interface IPasswordHasher
{
    string Hash(string password);

    /// <summary>
    /// Verifies <paramref name="password"/> against <paramref name="hash"/>. When <paramref name="hash"/> is
    /// <c>null</c> (unknown user) a dummy hash is checked so the response time does not reveal whether the account exists.
    /// </summary>
    bool Verify(string? hash, string password);
}
