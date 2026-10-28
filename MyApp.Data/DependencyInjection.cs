using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using MyApp.Data.Infrastructure;
using MyApp.Data.Repositories;

namespace MyApp.Data;

public static class DependencyInjection
{
    public static IServiceCollection AddDataLayer(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddOptions<DatabaseOptions>()
            .Bind(configuration.GetSection(DatabaseOptions.SectionName))
            .ValidateDataAnnotations()
            .ValidateOnStart();

        services.AddSingleton<IDbConnectionFactory, SqlConnectionFactory>();
        services.AddScoped<IProductRepository, ProductRepository>();
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IInvoiceRepository, InvoiceRepository>();

        return services;
    }

    public static IHealthChecksBuilder AddDatabaseHealthCheck(this IHealthChecksBuilder builder) =>
        builder.Add(new HealthCheckRegistration(
            "database",
            sp => ActivatorUtilities.CreateInstance<DatabaseHealthCheck>(sp),
            failureStatus: null,
            tags: ["ready"]));
}
