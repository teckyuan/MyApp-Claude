using MyApp.Business.Auth;

namespace MyApp.Tests.Business;

public class PasswordHasherTests
{
    private readonly Pbkdf2PasswordHasher _sut = new();

    [Fact]
    public void Verify_Succeeds_ForCorrectPassword_AndFailsForWrongOne()
    {
        var hash = _sut.Hash("s3cret-passphrase");

        Assert.True(_sut.Verify(hash, "s3cret-passphrase"));
        Assert.False(_sut.Verify(hash, "s3cret-passphrasE"));
    }

    [Fact]
    public void Hash_UsesRandomSalt()
    {
        Assert.NotEqual(_sut.Hash("same"), _sut.Hash("same"));
    }

    [Fact]
    public void Verify_ReturnsFalse_ForNullOrMalformedHash()
    {
        Assert.False(_sut.Verify(null, "anything"));
        Assert.False(_sut.Verify("garbage", "anything"));
        Assert.False(_sut.Verify("PBKDF2$abc$!!$!!", "anything"));
    }
}
