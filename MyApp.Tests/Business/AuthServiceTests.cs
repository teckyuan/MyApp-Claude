using FluentValidation;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using MyApp.Business.Auth;
using MyApp.Business.Exceptions;
using MyApp.Business.Models;
using MyApp.Business.Validators;
using MyApp.Data.Entities;
using MyApp.Data.Repositories;
using NSubstitute;

namespace MyApp.Tests.Business;

public class AuthServiceTests
{
    private const string Password = "correct horse battery";

    private readonly IUserRepository _users = Substitute.For<IUserRepository>();
    private readonly Pbkdf2PasswordHasher _hasher = new();
    private readonly JwtTokenService _tokens;
    private readonly JwtOptions _jwt = new()
    {
        Issuer = "test-issuer",
        Audience = "test-audience",
        SigningKey = "unit-test-signing-key-0123456789-abcdef"
    };
    private readonly AuthService _sut;

    public AuthServiceTests()
    {
        var options = Options.Create(_jwt);
        _tokens = new JwtTokenService(options, TimeProvider.System);
        _sut = new AuthService(
            _users, _hasher, _tokens, options, TimeProvider.System,
            new RegisterRequestValidator(), new LoginRequestValidator(), new RefreshTokenRequestValidator(),
            NullLogger<AuthService>.Instance);
    }

    private User MakeUser(bool active = true) => new()
    {
        Id = 5,
        Email = "a@example.com",
        PasswordHash = _hasher.Hash(Password),
        Role = Roles.User,
        IsActive = active
    };

    [Fact]
    public async Task Register_StoresHashedPasswordAndNormalizedEmail_AndReturnsTokens()
    {
        User? saved = null;
        _users.CreateAsync(Arg.Do<User>(u => saved = u), Arg.Any<CancellationToken>())
            .Returns(call => { var u = call.Arg<User>(); u.Id = 9; return u; });

        var response = await _sut.RegisterAsync(new RegisterRequest("  New@Example.COM ", Password));

        Assert.NotNull(saved);
        Assert.Equal("new@example.com", saved.Email);
        Assert.NotEqual(Password, saved.PasswordHash);
        Assert.StartsWith("PBKDF2$", saved.PasswordHash, StringComparison.Ordinal);
        Assert.Equal(Roles.User, saved.Role);
        Assert.False(string.IsNullOrEmpty(response.AccessToken));
        Assert.False(string.IsNullOrEmpty(response.RefreshToken));
        await _users.Received(1).AddRefreshTokenAsync(
            Arg.Is<RefreshToken>(t => t.UserId == 9 && t.TokenHash == _tokens.HashRefreshToken(response.RefreshToken)),
            Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Register_Throws_WhenEmailTaken()
    {
        _users.CreateAsync(Arg.Any<User>(), Arg.Any<CancellationToken>()).Returns((User?)null);

        await Assert.ThrowsAsync<ConflictException>(() => _sut.RegisterAsync(new RegisterRequest("a@example.com", Password)));
    }

    [Theory]
    [InlineData("not-an-email", "correct horse battery")]
    [InlineData("a@example.com", "short")]
    public async Task Register_Throws_OnInvalidInput(string email, string password)
    {
        await Assert.ThrowsAsync<ValidationException>(() => _sut.RegisterAsync(new RegisterRequest(email, password)));
        await _users.DidNotReceiveWithAnyArgs().CreateAsync(default!, default);
    }

    [Fact]
    public async Task Login_ReturnsValidJwt_OnCorrectCredentials()
    {
        _users.GetByEmailAsync("a@example.com", Arg.Any<CancellationToken>()).Returns(MakeUser());

        var response = await _sut.LoginAsync(new LoginRequest("A@Example.com", Password));

        var result = await new JsonWebTokenHandler().ValidateTokenAsync(response.AccessToken, new TokenValidationParameters
        {
            ValidIssuer = _jwt.Issuer,
            ValidAudience = _jwt.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(System.Text.Encoding.UTF8.GetBytes(_jwt.SigningKey)),
            RoleClaimType = "role"
        });

        Assert.True(result.IsValid);
        Assert.Equal("5", result.Claims["sub"]);
        Assert.Equal(Roles.User, result.Claims["role"]);
    }

    [Fact]
    public async Task Login_Throws_OnWrongPassword()
    {
        _users.GetByEmailAsync("a@example.com", Arg.Any<CancellationToken>()).Returns(MakeUser());

        await Assert.ThrowsAsync<UnauthorizedException>(() => _sut.LoginAsync(new LoginRequest("a@example.com", "wrong password!!")));
    }

    [Fact]
    public async Task Login_Throws_OnUnknownEmail()
    {
        _users.GetByEmailAsync(Arg.Any<string>(), Arg.Any<CancellationToken>()).Returns((User?)null);

        await Assert.ThrowsAsync<UnauthorizedException>(() => _sut.LoginAsync(new LoginRequest("ghost@example.com", Password)));
    }

    [Fact]
    public async Task Login_Throws_WhenAccountInactive()
    {
        _users.GetByEmailAsync("a@example.com", Arg.Any<CancellationToken>()).Returns(MakeUser(active: false));

        await Assert.ThrowsAsync<UnauthorizedException>(() => _sut.LoginAsync(new LoginRequest("a@example.com", Password)));
    }

    [Fact]
    public async Task Refresh_RotatesToken_WhenValid()
    {
        const string raw = "old-refresh-token";
        var oldHash = _tokens.HashRefreshToken(raw);
        _users.GetRefreshTokenAsync(oldHash, Arg.Any<CancellationToken>())
            .Returns(new RefreshToken { UserId = 5, TokenHash = oldHash, ExpiresAtUtc = DateTime.UtcNow.AddDays(1) });
        _users.GetByIdAsync(5, Arg.Any<CancellationToken>()).Returns(MakeUser());
        _users.RevokeRefreshTokenAsync(oldHash, Arg.Any<string?>(), Arg.Any<CancellationToken>()).Returns(true);

        var response = await _sut.RefreshAsync(new RefreshTokenRequest(raw));

        Assert.NotEqual(raw, response.RefreshToken);
        await _users.Received(1).RevokeRefreshTokenAsync(
            oldHash, _tokens.HashRefreshToken(response.RefreshToken), Arg.Any<CancellationToken>());
        await _users.Received(1).AddRefreshTokenAsync(
            Arg.Is<RefreshToken>(t => t.TokenHash == _tokens.HashRefreshToken(response.RefreshToken)),
            Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Refresh_RevokesAllSessions_WhenRevokedTokenIsReused()
    {
        const string raw = "stolen-token";
        var hash = _tokens.HashRefreshToken(raw);
        _users.GetRefreshTokenAsync(hash, Arg.Any<CancellationToken>())
            .Returns(new RefreshToken { UserId = 5, TokenHash = hash, ExpiresAtUtc = DateTime.UtcNow.AddDays(1), RevokedAtUtc = DateTime.UtcNow });

        await Assert.ThrowsAsync<UnauthorizedException>(() => _sut.RefreshAsync(new RefreshTokenRequest(raw)));

        await _users.Received(1).RevokeAllRefreshTokensAsync(5, Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Refresh_RevokesAllSessions_WhenConcurrentRotationLost()
    {
        const string raw = "raced-token";
        var hash = _tokens.HashRefreshToken(raw);
        _users.GetRefreshTokenAsync(hash, Arg.Any<CancellationToken>())
            .Returns(new RefreshToken { UserId = 5, TokenHash = hash, ExpiresAtUtc = DateTime.UtcNow.AddDays(1) });
        _users.GetByIdAsync(5, Arg.Any<CancellationToken>()).Returns(MakeUser());
        _users.RevokeRefreshTokenAsync(hash, Arg.Any<string?>(), Arg.Any<CancellationToken>()).Returns(false);

        await Assert.ThrowsAsync<UnauthorizedException>(() => _sut.RefreshAsync(new RefreshTokenRequest(raw)));

        await _users.Received(1).RevokeAllRefreshTokensAsync(5, Arg.Any<CancellationToken>());
        await _users.DidNotReceiveWithAnyArgs().AddRefreshTokenAsync(default!, default);
    }

    [Fact]
    public async Task Refresh_Throws_WhenExpiredOrUnknown()
    {
        const string expired = "expired-token";
        var hash = _tokens.HashRefreshToken(expired);
        _users.GetRefreshTokenAsync(hash, Arg.Any<CancellationToken>())
            .Returns(new RefreshToken { UserId = 5, TokenHash = hash, ExpiresAtUtc = DateTime.UtcNow.AddMinutes(-1) });
        _users.GetRefreshTokenAsync(Arg.Is<string>(h => h != hash), Arg.Any<CancellationToken>()).Returns((RefreshToken?)null);

        await Assert.ThrowsAsync<UnauthorizedException>(() => _sut.RefreshAsync(new RefreshTokenRequest(expired)));
        await Assert.ThrowsAsync<UnauthorizedException>(() => _sut.RefreshAsync(new RefreshTokenRequest("unknown")));
    }

    [Fact]
    public async Task Logout_RevokesPresentedToken()
    {
        const string raw = "logout-token";

        await _sut.LogoutAsync(new RefreshTokenRequest(raw));

        await _users.Received(1).RevokeRefreshTokenAsync(_tokens.HashRefreshToken(raw), null, Arg.Any<CancellationToken>());
    }
}
