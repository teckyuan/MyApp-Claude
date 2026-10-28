using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.OpenApi;
using Microsoft.OpenApi.Any;
using Microsoft.OpenApi.Models;

namespace MyApp.Api.OpenApi;

internal static class OpenApiSetup
{
    private const string BearerScheme = "Bearer";

    /// <summary>OpenAPI document with a JWT "Authorize" button, marking only the endpoints that need a token.</summary>
    public static IServiceCollection AddOpenApiDocs(this IServiceCollection services) =>
        services.AddOpenApi(options =>
        {
            options.AddDocumentTransformer((document, _, _) =>
            {
                document.Info.Title = "MyApp API";
                document.Info.Version = "v1";
                document.Components ??= new OpenApiComponents();
                document.Components.SecuritySchemes[BearerScheme] = new OpenApiSecurityScheme
                {
                    Type = SecuritySchemeType.Http,
                    Scheme = "bearer",
                    BearerFormat = "JWT",
                    Description = "Paste the access token from POST /api/v1/auth/login (no 'Bearer ' prefix)."
                };
                return Task.CompletedTask;
            });

            options.AddOperationTransformer((operation, context, _) =>
            {
                var metadata = context.Description.ActionDescriptor.EndpointMetadata;
                var needsAuth = metadata.OfType<IAuthorizeData>().Any() && !metadata.OfType<IAllowAnonymous>().Any();
                if (needsAuth)
                {
                    operation.Security.Add(new OpenApiSecurityRequirement
                    {
                        [new OpenApiSecurityScheme
                        {
                            Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = BearerScheme }
                        }] = []
                    });
                }

                // The URL-segment version is always 1.0 here; prefill it so "Try it out" works without typing it.
                foreach (var parameter in operation.Parameters.Where(p => p.Name == "version"))
                {
                    parameter.Schema.Default = new OpenApiString("1.0");
                }

                return Task.CompletedTask;
            });
        });
}
