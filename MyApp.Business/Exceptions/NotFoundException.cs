namespace MyApp.Business.Exceptions;

public sealed class NotFoundException(string resource, object key)
    : Exception($"{resource} with key '{key}' was not found.")
{
    public string Resource { get; } = resource;
    public object Key { get; } = key;
}
