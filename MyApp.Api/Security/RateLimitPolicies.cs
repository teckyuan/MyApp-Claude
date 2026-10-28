namespace MyApp.Api.Security;

internal static class RateLimitPolicies
{
    /// <summary>Stricter per-IP limit for credential endpoints to slow brute-force attempts.</summary>
    public const string Auth = "auth";
}
