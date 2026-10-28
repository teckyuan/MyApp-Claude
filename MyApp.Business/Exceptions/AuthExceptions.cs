namespace MyApp.Business.Exceptions;

/// <summary>Credentials or token were missing, invalid, expired or revoked.</summary>
public sealed class UnauthorizedException(string message) : Exception(message);

/// <summary>The request conflicts with existing state (e.g. duplicate email).</summary>
public sealed class ConflictException(string message) : Exception(message);
