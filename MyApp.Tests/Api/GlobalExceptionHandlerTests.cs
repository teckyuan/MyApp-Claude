using FluentValidation;
using FluentValidation.Results;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using MyApp.Api.Middleware;
using MyApp.Business.Exceptions;

namespace MyApp.Tests.Api;

public class GlobalExceptionHandlerTests
{
    private static async Task<(int Status, string Body)> HandleAsync(Exception exception)
    {
        var services = new ServiceCollection().AddLogging().AddProblemDetails().BuildServiceProvider();
        var handler = new GlobalExceptionHandler(
            services.GetRequiredService<IProblemDetailsService>(),
            NullLogger<GlobalExceptionHandler>.Instance);

        var context = new DefaultHttpContext { RequestServices = services };
        context.Response.Body = new MemoryStream();

        var handled = await handler.TryHandleAsync(context, exception, CancellationToken.None);

        Assert.True(handled);
        context.Response.Body.Position = 0;
        return (context.Response.StatusCode, await new StreamReader(context.Response.Body).ReadToEndAsync());
    }

    [Fact]
    public async Task NotFound_Maps_To404()
    {
        var (status, body) = await HandleAsync(new NotFoundException("Product", 3));

        Assert.Equal(StatusCodes.Status404NotFound, status);
        Assert.Contains("Product with key '3' was not found.", body);
    }

    [Fact]
    public async Task ValidationException_Maps_To400_WithErrors()
    {
        var exception = new ValidationException([new ValidationFailure("Name", "'Name' must not be empty.")]);

        var (status, body) = await HandleAsync(exception);

        Assert.Equal(StatusCodes.Status400BadRequest, status);
        Assert.Contains("'Name' must not be empty.", body);
    }

    [Fact]
    public async Task UnknownException_Maps_To500_WithoutLeakingDetails()
    {
        var (status, body) = await HandleAsync(new InvalidOperationException("secret connection string"));

        Assert.Equal(StatusCodes.Status500InternalServerError, status);
        Assert.DoesNotContain("secret", body);
    }
}
