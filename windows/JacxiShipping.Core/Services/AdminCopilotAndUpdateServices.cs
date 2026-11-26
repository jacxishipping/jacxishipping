using System.Text;
using System.Text.Json;
using JacxiShipping.WindowsApp.Models;

namespace JacxiShipping.WindowsApp.Services;

public interface IAdminCopilotService
{
    Task<string> AskAsync(string prompt);
}

public class AdminCopilotService : IAdminCopilotService
{
    private readonly IAdminStoreService _store;
    private readonly IJacxiCloudClient _cloud;

    public AdminCopilotService(IAdminStoreService store, IJacxiCloudClient cloud)
    {
        _store = store;
        _cloud = cloud;
    }

    public async Task<string> AskAsync(string prompt)
    {
        if (_store.Session.IsCloudConnected && !string.IsNullOrWhiteSpace(_store.Session.BearerToken))
        {
            var cloudReply = await _cloud.AskGeminiCopilotAsync(_store.Session.ServerUrl, _store.Session.BearerToken, prompt);
            if (!string.IsNullOrWhiteSpace(cloudReply))
            {
                _store.AddAiInteraction(new AiInteractionRecord
                {
                    Feature = "ADMIN_COPILOT_CLOUD",
                    Provider = "JACXI Cloud Gemini",
                    Prompt = prompt,
                    Response = cloudReply
                });
                return cloudReply;
            }
        }

        var localReply = AnswerLocally(prompt);
        _store.AddAiInteraction(new AiInteractionRecord
        {
            Feature = "ADMIN_COPILOT_LOCAL",
            Provider = "JACXI Operations Engine",
            Prompt = prompt,
            Response = localReply
        });
        return localReply;
    }

    private string AnswerLocally(string prompt)
    {
        var q = (prompt ?? string.Empty).Trim().ToLowerInvariant();
        var stats = _store.GetDashboardStats();
        var sb = new StringBuilder();

        if (q.Contains("overdue") || q.Contains("invoice") || q.Contains("unpaid") || q.Contains("receivable"))
        {
            var overdue = _store.GetInvoices().Where(i => i.Status == UserInvoiceStatus.OVERDUE || i.Status == UserInvoiceStatus.PENDING).ToList();
            sb.AppendLine($"Pending & Overdue Receivables: {stats.PendingInvoicesFormatted} across {overdue.Count} invoices.");
            foreach (var inv in overdue)
            {
                sb.AppendLine($"• {inv.InvoiceNumber} ({inv.CustomerName}) — {inv.AmountRemainingFormatted} remaining [{inv.StatusLabel}]");
            }
            return sb.ToString().Trim();
        }

        if (q.Contains("container") || q.Contains("vessel") || q.Contains("capacity"))
        {
            var containers = _store.GetContainers();
            sb.AppendLine($"Active Containers: {stats.ActiveContainersCount} of {containers.Count} total.");
            foreach (var c in containers)
            {
                sb.AppendLine($"• {c.ContainerNumber} ({c.VesselName}) — {c.CapacityDisplay} · {c.StatusLabel} ({c.Progress}%) → {c.DestinationPort}");
            }
            return sb.ToString().Trim();
        }

        if (q.Contains("customs") || q.Contains("hold") || q.Contains("gate"))
        {
            var holds = _store.GetShipments().Where(s => s.Status == ShipmentStatus.CustomsHold).ToList();
            var gps = _store.GetGatePassRequests().Where(g => g.Status != "COMPLETED").ToList();
            sb.AppendLine($"Customs Holds: {holds.Count} | Pending Gate Passes: {gps.Count}");
            foreach (var s in holds) sb.AppendLine($"• Hold: {s.TrackingNumber} ({s.Vehicle.FullDescription}) — {s.Vehicle.TitleStatus}");
            foreach (var g in gps) sb.AppendLine($"• Gate Pass: {g.VehicleLabel} (Token {g.ReleaseToken})");
            return sb.ToString().Trim();
        }

        if (q.Contains("profit") || q.Contains("revenue") || q.Contains("expense") || q.Contains("finance"))
        {
            sb.AppendLine("JACXI Financial Snapshot:");
            sb.AppendLine($"• Gross Billable Value: {stats.TotalRevenueFormatted}");
            sb.AppendLine($"• Collected Cash: {stats.CollectedRevenueFormatted}");
            sb.AppendLine($"• Pending Receivables: {stats.PendingInvoicesFormatted}");
            sb.AppendLine($"• Office Operating Expenses: {stats.OfficeExpensesFormatted}");
            sb.AppendLine($"• Estimated Net Profit: {stats.GrossProfitFormatted}");
            return sb.ToString().Trim();
        }

        sb.AppendLine("JACXI Admin Summary:");
        sb.AppendLine($"• Active Shipments: {stats.ActiveShipmentsCount} ({stats.TotalShipments} total)");
        sb.AppendLine($"• Active Containers: {stats.ActiveContainersCount}");
        sb.AppendLine($"• Open Receivables: {stats.PendingInvoicesFormatted} ({stats.OverdueInvoicesCount} overdue)");
        sb.AppendLine($"• Pending Gate Passes: {stats.PendingGatePassesCount}");
        sb.AppendLine("Ask me about 'overdue invoices', 'containers', 'customs holds', or 'profit & revenue'.");
        return sb.ToString().Trim();
    }
}

public interface IAutoUpdateService
{
    Task<AppUpdateCheckResult> CheckForUpdatesAsync(string currentVersion = "3.0.0");
}

public class AutoUpdateService : IAutoUpdateService
{
    private static readonly HttpClient Http = new() { Timeout = TimeSpan.FromSeconds(10) };

    public async Task<AppUpdateCheckResult> CheckForUpdatesAsync(string currentVersion = "3.0.0")
    {
        try
        {
            using var req = new HttpRequestMessage(HttpMethod.Get, "https://api.github.com/repos/jacxishipping/jacxishipping/releases/latest");
            req.Headers.UserAgent.ParseAdd("JacxiShipping-WindowsAdmin/3.0");
            using var resp = await Http.SendAsync(req);
            if (!resp.IsSuccessStatusCode)
            {
                return new AppUpdateCheckResult
                {
                    CurrentVersion = currentVersion,
                    LatestTag = $"v{currentVersion}-windows-admin",
                    UpdateAvailable = false,
                    Message = $"Running latest verified build v{currentVersion}."
                };
            }

            using var doc = JsonDocument.Parse(await resp.Content.ReadAsStringAsync());
            var tag = doc.RootElement.TryGetProperty("tag_name", out var t) ? t.GetString() ?? "" : "";
            var htmlUrl = doc.RootElement.TryGetProperty("html_url", out var u) ? u.GetString() ?? "" : "https://github.com/jacxishipping/jacxishipping/releases";

            var isNewer = !string.IsNullOrWhiteSpace(tag) && !tag.Contains(currentVersion, StringComparison.OrdinalIgnoreCase);
            return new AppUpdateCheckResult
            {
                CurrentVersion = currentVersion,
                LatestTag = tag,
                ReleaseUrl = htmlUrl,
                UpdateAvailable = isNewer,
                Message = isNewer
                    ? $"New release {tag} available on GitHub!"
                    : $"Up to date (v{currentVersion})."
            };
        }
        catch
        {
            return new AppUpdateCheckResult
            {
                CurrentVersion = currentVersion,
                LatestTag = $"v{currentVersion}-windows-admin",
                UpdateAvailable = false,
                Message = $"Running v{currentVersion} (Offline check skipped)."
            };
        }
    }
}
