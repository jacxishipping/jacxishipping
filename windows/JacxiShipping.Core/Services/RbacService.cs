namespace JacxiShipping.WindowsApp.Services;

public static class RbacService
{
    private static readonly Dictionary<string, HashSet<string>> RolePermissions = new(StringComparer.OrdinalIgnoreCase)
    {
        ["admin"] = new(StringComparer.OrdinalIgnoreCase)
        {
            "dashboard:view", "analytics:view", "users:manage", "customers:view", "customers:manage",
            "shipments:view", "shipments:read_all", "shipments:manage", "containers:view", "containers:read_all",
            "containers:manage", "finance:view", "finance:manage", "invoices:view", "invoices:manage",
            "documents:view", "documents:manage", "transits:manage", "dispatches:manage", "workflow:move",
            "expenses:post", "tracking:view", "ai:view"
        },
        ["manager"] = new(StringComparer.OrdinalIgnoreCase)
        {
            "dashboard:view", "analytics:view", "customers:view", "customers:manage",
            "shipments:view", "shipments:read_all", "shipments:manage", "containers:view", "containers:read_all",
            "containers:manage", "finance:view", "invoices:view", "invoices:manage",
            "documents:view", "documents:manage", "transits:manage", "dispatches:manage", "workflow:move",
            "expenses:post", "tracking:view", "ai:view"
        },
        ["finance"] = new(StringComparer.OrdinalIgnoreCase)
        {
            "dashboard:view", "analytics:view", "customers:view", "shipments:view", "shipments:read_all",
            "containers:view", "containers:read_all", "finance:view", "finance:manage", "invoices:view",
            "invoices:manage", "expenses:post", "tracking:view"
        },
        ["operations"] = new(StringComparer.OrdinalIgnoreCase)
        {
            "dashboard:view", "customers:view", "shipments:view", "shipments:read_all", "shipments:manage",
            "containers:view", "containers:read_all", "containers:manage", "documents:view", "documents:manage",
            "invoices:view", "transits:manage", "dispatches:manage", "workflow:move", "tracking:view"
        },
        ["customer_service"] = new(StringComparer.OrdinalIgnoreCase)
        {
            "dashboard:view", "customers:view", "customers:manage", "shipments:view", "shipments:read_all",
            "shipments:manage", "invoices:view", "tracking:view"
        },
        ["user"] = new(StringComparer.OrdinalIgnoreCase)
        {
            "dashboard:view", "shipments:view", "invoices:view", "tracking:view", "documents:view", "finance:view"
        }
    };

    public static bool HasPermission(string? role, string permission)
    {
        var key = (role ?? "user").Trim().ToLowerInvariant();
        if (!RolePermissions.TryGetValue(key, out var perms))
            perms = RolePermissions["user"];
        return perms.Contains(permission);
    }
}
