using System.Diagnostics;
using System.Runtime.CompilerServices;
using Microsoft.Extensions.Logging;

namespace MyApp.Data.Infrastructure;

/// <summary>
/// Common logging for the data and business layers. Derive from it and pass the typed
/// <see cref="ILogger{TCategoryName}"/> so entries are categorised by the concrete class.
/// Never log secrets or personal data (passwords, hashes, tokens, emails) through these helpers.
/// </summary>
public abstract partial class LoggingBase
{
    // A field (not just a property) because the LoggerMessage generator looks for one.
    private readonly ILogger _logger;

    protected LoggingBase(ILogger logger) => _logger = logger;

    protected ILogger Logger => _logger;

    // These helpers deliberately forward a caller-supplied template, so the per-call-site
    // analyzers (CA1848 / CA2254) cannot apply to the forwarding lines.
#pragma warning disable CA1848, CA2254
    protected void LogDebug(string message, params object?[] args) =>
        Logger.LogDebug(message, args);

    protected void LogInformation(string message, params object?[] args) =>
        Logger.LogInformation(message, args);

    protected void LogWarning(string message, params object?[] args) =>
        Logger.LogWarning(message, args);

    protected void LogError(Exception exception, string message, params object?[] args) =>
        Logger.LogError(exception, message, args);
#pragma warning restore CA1848, CA2254

    /// <summary>
    /// Runs <paramref name="action"/> and logs its start, duration and any failure (rethrown unchanged).
    /// The operation name defaults to the calling method.
    /// </summary>
    protected async Task<T> TraceAsync<T>(Func<Task<T>> action, [CallerMemberName] string operation = "")
    {
        var started = Stopwatch.GetTimestamp();
        LogOperationStarted(operation);
        try
        {
            var result = await action();

            //LogOperationCompleted(operation, Stopwatch.GetElapsedTime(started).TotalMilliseconds);
            return result;
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            LogOperationFailed(ex, operation, Stopwatch.GetElapsedTime(started).TotalMilliseconds);
            throw;
        }
    }

    /// <inheritdoc cref="TraceAsync{T}(Func{Task{T}}, string)"/>
    protected async Task TraceAsync(Func<Task> action, [CallerMemberName] string operation = "")
    {
        await TraceAsync<object?>(async () =>
        {
            await action();
            return null;
        }, operation);
    }

    [LoggerMessage(Level = LogLevel.Debug, Message = "{Operation} started")]
    private partial void LogOperationStarted(string operation);

    [LoggerMessage(Level = LogLevel.Debug, Message = "{Operation} completed in {ElapsedMs} ms")]
    private partial void LogOperationCompleted(string operation, double elapsedMs);

    [LoggerMessage(Level = LogLevel.Error, Message = "{Operation} failed after {ElapsedMs} ms")]
    private partial void LogOperationFailed(Exception exception, string operation, double elapsedMs);
}
