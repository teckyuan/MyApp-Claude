namespace MyApp.Data.Entities;

public class User : BaseEntity
{
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string Role { get; set; } = Roles.User;
    public bool IsActive { get; set; } = true;
}

public static class Roles
{
    public const string User = "User";
    public const string Admin = "Admin";
}
