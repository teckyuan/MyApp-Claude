using System.Threading.RateLimiting;
using Asp.Versioning;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.Http.Features;
using MyApp.Api.Middleware;
using MyApp.Api.OpenApi;
using MyApp.Api.Security;
using MyApp.Business;
using MyApp.Data;
using NLog;
using NLog.Web;

// Bootstrap logger so startup failures (bad config, failed options validation) reach NLog.
var startupLogger = LogManager.GetCurrentClassLogger();

try
{
    var builder = WebApplication.CreateBuilder(args);

    builder.Logging.ClearProviders();
    builder.Host.UseNLog();

    // Tiers
    builder.Services.AddBusinessLayer(builder.Configuration);
    builder.Services.AddJwtAuthentication();

    // Web API
    builder.Services.AddControllers();
    builder.Services.AddOpenApiDocs();
    builder.Services.AddApiVersioning(options =>
    {
        options.DefaultApiVersion = new ApiVersion(1, 0);
        options.AssumeDefaultVersionWhenUnspecified = true;
        options.ReportApiVersions = true;
        options.ApiVersionReader = new UrlSegmentApiVersionReader();
    }).AddMvc();

    // Errors: every failure is returned as RFC 7807 problem details with a trace id.
    builder.Services.AddProblemDetails(options =>
        options.CustomizeProblemDetails = ctx =>
        {
            ctx.ProblemDetails.Extensions["traceId"] =
                ctx.HttpContext.Features.Get<IHttpActivityFeature>()?.Activity.Id ?? ctx.HttpContext.TraceIdentifier;
        });
    builder.Services.AddExceptionHandler<GlobalExceptionHandler>();

    // Cross-cutting
    builder.Services.AddResponseCompression();
    builder.Services.AddHealthChecks().AddDatabaseHealthCheck();
    builder.Services.AddRateLimiter(options =>
    {
        options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
        options.AddPolicy(RateLimitPolicies.Auth, ctx =>
            RateLimitPartition.GetFixedWindowLimiter(
                ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = builder.Configuration.GetValue("RateLimiting:AuthPermitLimit", 10),
                    Window = TimeSpan.FromMinutes(1),
                    QueueLimit = 0
                }));
        options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(ctx =>
            RateLimitPartition.GetFixedWindowLimiter(
                ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = builder.Configuration.GetValue("RateLimiting:PermitLimit", 100),
                    Window = TimeSpan.FromMinutes(1),
                    QueueLimit = 0
                }));
    });
    builder.Services.AddCors(options => options.AddDefaultPolicy(policy =>
    {
        var origins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
        if (origins.Length > 0)
        {
            policy.WithOrigins(origins).AllowAnyHeader().AllowAnyMethod();
        }
    }));

    var app = builder.Build();

    app.UseExceptionHandler();
    app.UseStatusCodePages();
    app.UseResponseCompression();

    app.Use(async (context, next) =>
    {
        context.Response.Headers.XContentTypeOptions = "nosniff";
        context.Response.Headers["Referrer-Policy"] = "no-referrer";
        context.Response.Headers.XFrameOptions = "DENY";
        await next();
    });

    if (app.Environment.IsDevelopment())
    {
        app.MapOpenApi().AllowAnonymous();
        app.UseSwaggerUI(options =>
        {
            options.SwaggerEndpoint("/openapi/v1.json", "MyApp API v1");
            options.EnablePersistAuthorization(); // keep the token across page refreshes
        });
    }
    else
    {
        app.UseHsts();
    }

    app.UseHttpsRedirection();
    app.UseCors();
    app.UseRateLimiter();
    app.UseAuthentication();
    app.UseAuthorization();

    app.MapControllers();
    app.MapHealthChecks("/health/live", new HealthCheckOptions { Predicate = _ => false }).AllowAnonymous();
    app.MapHealthChecks("/health/ready", new HealthCheckOptions { Predicate = check => check.Tags.Contains("ready") }).AllowAnonymous();

    app.Run();
}
catch (Exception ex)
{
    startupLogger.Fatal(ex, "Application terminated unexpectedly during startup or run");
    throw;
}
finally
{
    LogManager.Shutdown(); // flush async targets
}

// Exposed so integration tests can use WebApplicationFactory<Program>.
public partial class Program;
