using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using JacxiShipping.WindowsApp.Models;

namespace JacxiShipping.WindowsApp.Services;

public class CloudAuthResult
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public string? Token { get; set; }
    public AdminUser? User { get; set; }
}

public class CloudSyncSummary
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public int ShipmentsPulled { get; set; }
    public int ContainersPulled { get; set; }
    public int InvoicesPulled { get; set; }
}

public interface IJacxiCloudClient
{
    Task<CloudAuthResult> SignInAsync(string serverUrl, string email, string password);
    Task<CloudAuthResult> SignInWithCodeAsync(string serverUrl, string loginCode);
    Task<string> TestConnectionAndSyncAsync(string serverUrl, string bearerToken);
    Task<CloudSyncSummary> PullLiveOperationsAsync(string serverUrl, string bearerToken);
    Task<CloudSyncPayload> PullLiveOperationsFullAsync(string serverUrl, string bearerToken);
    Task<bool> PushShipmentStatusAsync(string serverUrl, string bearerToken, string shipmentId, ShipmentSimpleStatus status);
    Task<bool> DispatchCommunicationAsync(string serverUrl, string bearerToken, CommunicationDispatchRecord dispatch);
    Task<string?> AskGeminiCopilotAsync(string serverUrl, string bearerToken, string prompt);
    Task<AdminUser?> FetchProfileAsync(string serverUrl, string bearerToken);
    Task<(bool Success, string Message)> UpdateProfileAsync(string serverUrl, string bearerToken, AdminUser profile);
    Task<(bool Success, string Message)> UpdatePasswordAsync(string serverUrl, string bearerToken, string currentPassword, string newPassword);
    Task<McpServerConfig?> FetchMcpConfigAsync(string serverUrl, string bearerToken);
    Task<CallAgentConfigModel?> FetchCallAgentConfigAsync(string serverUrl, string bearerToken);
    Task ListenNotificationStreamAsync(string serverUrl, string bearerToken, Action<AdminNotificationItem> onNotification, CancellationToken ct);
}

public class JacxiCloudClient : IJacxiCloudClient
{
    private static readonly HttpClient Http = new() { Timeout = TimeSpan.FromSeconds(15) };

    public async Task<CloudAuthResult> SignInAsync(string serverUrl, string email, string password)
    {
        try
        {
            var baseUrl = NormalizeUrl(serverUrl);
            var payload = JsonSerializer.Serialize(new { email, password });
            using var content = new StringContent(payload, Encoding.UTF8, "application/json");
            using var resp = await Http.PostAsync($"{baseUrl}/api/auth/signin", content);
            var body = await resp.Content.ReadAsStringAsync();

            if (!resp.IsSuccessStatusCode)
                return new CloudAuthResult { Success = false, Message = $"Server returned {(int)resp.StatusCode}: {body}" };

            using var doc = JsonDocument.Parse(body);
            var token = GetStr(doc.RootElement, "token");
            AdminUser? adminUser = null;
            if (doc.RootElement.TryGetProperty("user", out var usrEl))
            {
                adminUser = ParseAdminUser(usrEl, email);
            }

            return new CloudAuthResult
            {
                Success = !string.IsNullOrWhiteSpace(token),
                Token = token,
                User = adminUser,
                Message = $"Connected to {baseUrl}."
            };
        }
        catch (Exception ex)
        {
            return new CloudAuthResult { Success = false, Message = $"Connection failed: {ex.Message}" };
        }
    }

    public async Task<CloudAuthResult> SignInWithCodeAsync(string serverUrl, string loginCode)
    {
        try
        {
            var baseUrl = NormalizeUrl(serverUrl);
            var payload = JsonSerializer.Serialize(new { loginCode });
            using var content = new StringContent(payload, Encoding.UTF8, "application/json");
            using var resp = await Http.PostAsync($"{baseUrl}/api/mobile-auth/signin-code", content);
            var body = await resp.Content.ReadAsStringAsync();

            if (!resp.IsSuccessStatusCode)
                return new CloudAuthResult { Success = false, Message = $"Code login failed ({(int)resp.StatusCode})." };

            using var doc = JsonDocument.Parse(body);
            var token = GetStr(doc.RootElement, "token");
            AdminUser? adminUser = doc.RootElement.TryGetProperty("user", out var u) ? ParseAdminUser(u, "") : null;
            return new CloudAuthResult { Success = !string.IsNullOrWhiteSpace(token), Token = token, User = adminUser, Message = $"Authenticated with Login Code on {baseUrl}." };
        }
        catch (Exception ex)
        {
            return new CloudAuthResult { Success = false, Message = $"Connection failed: {ex.Message}" };
        }
    }

    public async Task<string> TestConnectionAndSyncAsync(string serverUrl, string bearerToken)
    {
        try
        {
            var baseUrl = NormalizeUrl(serverUrl);
            using var req = CreateAuthorizedRequest(HttpMethod.Get, $"{baseUrl}/api/mobile-auth/me", bearerToken);
            using var resp = await Http.SendAsync(req);
            return resp.IsSuccessStatusCode
                ? $"Verified live cloud session at {DateTime.Now:HH:mm:ss}."
                : $"Sync check failed: HTTP {(int)resp.StatusCode}";
        }
        catch (Exception ex)
        {
            return $"Cloud unreachable: {ex.Message}";
        }
    }

    public async Task<CloudSyncSummary> PullLiveOperationsAsync(string serverUrl, string bearerToken)
    {
        var full = await PullLiveOperationsFullAsync(serverUrl, bearerToken);
        return new CloudSyncSummary
        {
            Success = full.Success,
            Message = full.Message,
            ShipmentsPulled = full.Shipments.Count,
            ContainersPulled = full.Containers.Count,
            InvoicesPulled = full.Invoices.Count
        };
    }

    public async Task<CloudSyncPayload> PullLiveOperationsFullAsync(string serverUrl, string bearerToken)
    {
        var result = new CloudSyncPayload();
        try
        {
            var baseUrl = NormalizeUrl(serverUrl);

            using (var sReq = CreateAuthorizedRequest(HttpMethod.Get, $"{baseUrl}/api/shipments?limit=100", bearerToken))
            using (var sResp = await Http.SendAsync(sReq))
            {
                if (sResp.IsSuccessStatusCode)
                {
                    using var doc = JsonDocument.Parse(await sResp.Content.ReadAsStringAsync());
                    if (doc.RootElement.TryGetProperty("shipments", out var arr) && arr.ValueKind == JsonValueKind.Array)
                    {
                        foreach (var el in arr.EnumerateArray())
                        {
                            result.Shipments.Add(ParseShipment(el));
                        }
                    }
                }
            }

            using (var cReq = CreateAuthorizedRequest(HttpMethod.Get, $"{baseUrl}/api/containers?limit=100", bearerToken))
            using (var cResp = await Http.SendAsync(cReq))
            {
                if (cResp.IsSuccessStatusCode)
                {
                    using var doc = JsonDocument.Parse(await cResp.Content.ReadAsStringAsync());
                    if (doc.RootElement.TryGetProperty("containers", out var arr) && arr.ValueKind == JsonValueKind.Array)
                    {
                        foreach (var el in arr.EnumerateArray())
                        {
                            result.Containers.Add(ParseContainer(el));
                        }
                    }
                }
            }

            using (var iReq = CreateAuthorizedRequest(HttpMethod.Get, $"{baseUrl}/api/invoices?limit=100", bearerToken))
            using (var iResp = await Http.SendAsync(iReq))
            {
                if (iResp.IsSuccessStatusCode)
                {
                    using var doc = JsonDocument.Parse(await iResp.Content.ReadAsStringAsync());
                    if (doc.RootElement.TryGetProperty("invoices", out var arr) && arr.ValueKind == JsonValueKind.Array)
                    {
                        foreach (var el in arr.EnumerateArray())
                        {
                            result.Invoices.Add(ParseInvoice(el));
                        }
                    }
                }
            }

            result.Success = true;
            result.Message = $"Synced with {baseUrl}: {result.Shipments.Count} shipments, {result.Containers.Count} containers, {result.Invoices.Count} invoices.";
            return result;
        }
        catch (Exception ex)
        {
            result.Success = false;
            result.Message = $"Cloud sync error: {ex.Message}";
            return result;
        }
    }

    public async Task<bool> PushShipmentStatusAsync(string serverUrl, string bearerToken, string shipmentId, ShipmentSimpleStatus status)
    {
        try
        {
            var baseUrl = NormalizeUrl(serverUrl);
            var payload = JsonSerializer.Serialize(new { status = status.ToString() });
            using var req = CreateAuthorizedRequest(HttpMethod.Patch, $"{baseUrl}/api/shipments/{shipmentId}", bearerToken);
            req.Content = new StringContent(payload, Encoding.UTF8, "application/json");
            using var resp = await Http.SendAsync(req);
            return resp.IsSuccessStatusCode;
        }
        catch
        {
            return false;
        }
    }

    public async Task<bool> DispatchCommunicationAsync(string serverUrl, string bearerToken, CommunicationDispatchRecord dispatch)
    {
        try
        {
            var baseUrl = NormalizeUrl(serverUrl);
            var payload = JsonSerializer.Serialize(new
            {
                channel = dispatch.Channel.ToLowerInvariant(),
                to = dispatch.Recipient,
                subject = dispatch.Subject,
                message = dispatch.Body
            });
            using var req = CreateAuthorizedRequest(HttpMethod.Post, $"{baseUrl}/api/communications/dispatch", bearerToken);
            req.Content = new StringContent(payload, Encoding.UTF8, "application/json");
            using var resp = await Http.SendAsync(req);
            return resp.IsSuccessStatusCode;
        }
        catch
        {
            return false;
        }
    }

    public async Task<string?> AskGeminiCopilotAsync(string serverUrl, string bearerToken, string prompt)
    {
        try
        {
            var baseUrl = NormalizeUrl(serverUrl);
            var payload = JsonSerializer.Serialize(new { prompt });
            using var req = CreateAuthorizedRequest(HttpMethod.Post, $"{baseUrl}/api/gemini", bearerToken);
            req.Content = new StringContent(payload, Encoding.UTF8, "application/json");
            using var resp = await Http.SendAsync(req);
            if (!resp.IsSuccessStatusCode) return null;
            var json = await resp.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);
            return GetStr(doc.RootElement, "response") ?? GetStr(doc.RootElement, "text");
        }
        catch
        {
            return null;
        }
    }

    public async Task<AdminUser?> FetchProfileAsync(string serverUrl, string bearerToken)
    {
        try
        {
            var baseUrl = NormalizeUrl(serverUrl);
            using var req = CreateAuthorizedRequest(HttpMethod.Get, $"{baseUrl}/api/profile", bearerToken);
            using var resp = await Http.SendAsync(req);
            if (!resp.IsSuccessStatusCode) return null;
            using var doc = JsonDocument.Parse(await resp.Content.ReadAsStringAsync());
            if (!doc.RootElement.TryGetProperty("user", out var u)) return null;
            return ParseAdminUser(u, "");
        }
        catch
        {
            return null;
        }
    }

    public async Task<(bool Success, string Message)> UpdateProfileAsync(string serverUrl, string bearerToken, AdminUser profile)
    {
        try
        {
            var baseUrl = NormalizeUrl(serverUrl);
            var payload = JsonSerializer.Serialize(new
            {
                name = profile.Name,
                phone = profile.Phone,
                address = profile.Address,
                city = profile.City,
                country = profile.Country
            });
            using var req = CreateAuthorizedRequest(HttpMethod.Put, $"{baseUrl}/api/profile", bearerToken);
            req.Content = new StringContent(payload, Encoding.UTF8, "application/json");
            using var resp = await Http.SendAsync(req);
            return resp.IsSuccessStatusCode
                ? (true, $"Synced profile update to {baseUrl}.")
                : (false, $"Cloud profile update failed: HTTP {(int)resp.StatusCode}");
        }
        catch (Exception ex)
        {
            return (false, $"Cloud profile update error: {ex.Message}");
        }
    }

    public async Task<(bool Success, string Message)> UpdatePasswordAsync(string serverUrl, string bearerToken, string currentPassword, string newPassword)
    {
        try
        {
            var baseUrl = NormalizeUrl(serverUrl);
            var payload = JsonSerializer.Serialize(new { currentPassword, newPassword });
            using var req = CreateAuthorizedRequest(HttpMethod.Put, $"{baseUrl}/api/profile/password", bearerToken);
            req.Content = new StringContent(payload, Encoding.UTF8, "application/json");
            using var resp = await Http.SendAsync(req);
            return resp.IsSuccessStatusCode
                ? (true, "Password updated on JACXI Cloud.")
                : (false, $"Password update returned HTTP {(int)resp.StatusCode}");
        }
        catch (Exception ex)
        {
            return (false, $"Password update failed: {ex.Message}");
        }
    }

    public async Task<McpServerConfig?> FetchMcpConfigAsync(string serverUrl, string bearerToken)
    {
        try
        {
            var baseUrl = NormalizeUrl(serverUrl);
            using var req = CreateAuthorizedRequest(HttpMethod.Get, $"{baseUrl}/api/mcp/admin", bearerToken);
            using var resp = await Http.SendAsync(req);
            if (!resp.IsSuccessStatusCode) return null;
            using var doc = JsonDocument.Parse(await resp.Content.ReadAsStringAsync());
            var cfg = new McpServerConfig { EndpointUrl = $"{baseUrl}/api/mcp" };
            if (doc.RootElement.TryGetProperty("serverInfo", out var info))
            {
                cfg.ServerName = GetStr(info, "name") ?? cfg.ServerName;
                cfg.Version = GetStr(info, "version") ?? cfg.Version;
                cfg.ProtocolVersion = GetStr(info, "protocolVersion") ?? cfg.ProtocolVersion;
            }
            if (doc.RootElement.TryGetProperty("settings", out var s))
            {
                cfg.Enabled = !s.TryGetProperty("enabled", out var en) || en.GetBoolean();
                cfg.ApiKey = GetStr(s, "apiKey") ?? cfg.ApiKey;
                cfg.AuthMode = GetStr(s, "authMode") ?? cfg.AuthMode;
                cfg.DataSource = GetStr(s, "dataSource") ?? cfg.DataSource;
            }
            return cfg;
        }
        catch
        {
            return null;
        }
    }

    public async Task<CallAgentConfigModel?> FetchCallAgentConfigAsync(string serverUrl, string bearerToken)
    {
        try
        {
            var baseUrl = NormalizeUrl(serverUrl);
            using var req = CreateAuthorizedRequest(HttpMethod.Get, $"{baseUrl}/api/settings/call-agent", bearerToken);
            using var resp = await Http.SendAsync(req);
            if (!resp.IsSuccessStatusCode) return null;
            using var doc = JsonDocument.Parse(await resp.Content.ReadAsStringAsync());
            var model = new CallAgentConfigModel { PreferredBaseUrl = baseUrl };
            if (doc.RootElement.TryGetProperty("urls", out var urls))
            {
                model.WebhookUrl = GetStr(urls, "webhookUrl") ?? model.WebhookUrl;
                model.WebsocketUrl = GetStr(urls, "websocketUrl") ?? model.WebsocketUrl;
            }
            if (doc.RootElement.TryGetProperty("status", out var status))
            {
                model.GeminiStandardConfigured = status.TryGetProperty("geminiStandardConfigured", out var gs) && gs.GetBoolean();
                model.GeminiLiveConfigured = status.TryGetProperty("geminiLiveConfigured", out var gl) && gl.GetBoolean();
                model.TwilioConfigured = status.TryGetProperty("twilioConfigured", out var tw) && tw.GetBoolean();
                model.VoiceWebhookTokenConfigured = status.TryGetProperty("voiceWebhookTokenConfigured", out var vw) && vw.GetBoolean();
                model.GeminiVoiceModel = GetStr(status, "geminiVoiceModel") ?? model.GeminiVoiceModel;
                model.GeminiLiveModel = GetStr(status, "geminiLiveModel") ?? model.GeminiLiveModel;
            }
            return model;
        }
        catch
        {
            return null;
        }
    }

    public async Task ListenNotificationStreamAsync(string serverUrl, string bearerToken, Action<AdminNotificationItem> onNotification, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(bearerToken)) return;

        var baseUrl = NormalizeUrl(serverUrl);
        using var streamClient = new HttpClient { Timeout = Timeout.InfiniteTimeSpan };
        using var req = CreateAuthorizedRequest(HttpMethod.Get, $"{baseUrl}/api/notifications/stream", bearerToken);
        req.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("text/event-stream"));

        using var resp = await streamClient.SendAsync(req, HttpCompletionOption.ResponseHeadersRead, ct);
        if (!resp.IsSuccessStatusCode) return;

        await using var stream = await resp.Content.ReadAsStreamAsync(ct);
        using var reader = new StreamReader(stream);

        string? currentEvent = null;
        while (!ct.IsCancellationRequested)
        {
            var line = await reader.ReadLineAsync(ct);
            if (line == null) break;

            if (line.StartsWith("event:", StringComparison.OrdinalIgnoreCase))
            {
                currentEvent = line["event:".Length..].Trim();
            }
            else if (line.StartsWith("data:", StringComparison.OrdinalIgnoreCase) &&
                     string.Equals(currentEvent, "notification", StringComparison.OrdinalIgnoreCase))
            {
                var json = line["data:".Length..].Trim();
                try
                {
                    using var doc = JsonDocument.Parse(json);
                    var title = GetStr(doc.RootElement, "title") ?? "Live Cloud Event";
                    var desc = GetStr(doc.RootElement, "message") ?? GetStr(doc.RootElement, "description") ?? json;
                    var type = (GetStr(doc.RootElement, "type") ?? "INFO").ToUpperInvariant();
                    onNotification(new AdminNotificationItem
                    {
                        Title = title,
                        Description = desc,
                        Type = type,
                        Timestamp = DateTime.Now.ToString("HH:mm")
                    });
                }
                catch
                {
                    // Ignore malformed SSE payload frames
                }
            }
        }
    }

    private static HttpRequestMessage CreateAuthorizedRequest(HttpMethod method, string url, string bearerToken)
    {
        var req = new HttpRequestMessage(method, url);
        if (!string.IsNullOrWhiteSpace(bearerToken))
        {
            req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", bearerToken);
        }
        return req;
    }

    private static AdminUser ParseAdminUser(JsonElement el, string fallbackEmail) => new()
    {
        Id = GetStr(el, "id") ?? $"adm-{Guid.NewGuid().ToString("N")[..6]}",
        Name = GetStr(el, "name") ?? fallbackEmail,
        Email = GetStr(el, "email") ?? fallbackEmail,
        Role = (GetStr(el, "role") ?? "admin").ToLowerInvariant(),
        Phone = GetStr(el, "phone") ?? string.Empty,
        Address = GetStr(el, "address") ?? string.Empty,
        City = GetStr(el, "city") ?? string.Empty,
        Country = GetStr(el, "country") ?? string.Empty,
        LoginCode = GetStr(el, "loginCode") ?? string.Empty
    };

    private static Shipment ParseShipment(JsonElement el)
    {
        var statusRaw = GetStr(el, "status") ?? "ON_HAND";
        var simpleStatus = Enum.TryParse<ShipmentSimpleStatus>(statusRaw, true, out var ss)
            ? ss
            : ShipmentSimpleStatus.ON_HAND;

        var mappedStatus = simpleStatus switch
        {
            ShipmentSimpleStatus.ON_HAND => ShipmentStatus.VehicleReceived,
            ShipmentSimpleStatus.DISPATCHING => ShipmentStatus.Booked,
            ShipmentSimpleStatus.IN_TRANSIT => ShipmentStatus.InTransit,
            ShipmentSimpleStatus.RELEASED => ShipmentStatus.CustomsCleared,
            ShipmentSimpleStatus.IN_TRANSIT_TO_DESTINATION => ShipmentStatus.InTransit,
            ShipmentSimpleStatus.DELIVERED => ShipmentStatus.Delivered,
            _ => ShipmentStatus.Booked
        };

        var vin = GetStr(el, "vehicleVIN") ?? string.Empty;
        var containerNum = string.Empty;
        var vessel = "MSC MEDITERRANEAN V";
        var destPort = "Port of Mersin, Turkey";

        if (el.TryGetProperty("container", out var cEl) && cEl.ValueKind == JsonValueKind.Object)
        {
            containerNum = GetStr(cEl, "containerNumber") ?? "";
            vessel = GetStr(cEl, "vesselName") ?? vessel;
            destPort = GetStr(cEl, "destinationPort") ?? destPort;
        }

        var custName = "JACXI Client";
        var custEmail = "";
        if (el.TryGetProperty("user", out var uEl) && uEl.ValueKind == JsonValueKind.Object)
        {
            custName = GetStr(uEl, "name") ?? custName;
            custEmail = GetStr(uEl, "email") ?? "";
        }

        var price = GetDec(el, "price");
        var id = GetStr(el, "id") ?? Guid.NewGuid().ToString("N")[..12];

        return new Shipment
        {
            Id = id,
            TrackingNumber = vin.Length >= 8 ? $"JCX-{vin[^6..]}" : $"JCX-{id[..Math.Min(8, id.Length)].ToUpperInvariant()}",
            ContainerId = GetStr(el, "containerId"),
            ContainerNumber = containerNum,
            SimpleStatus = simpleStatus,
            Status = mappedStatus,
            ServiceType = string.Equals(GetStr(el, "serviceType"), "PURCHASE_AND_SHIPPING", StringComparison.OrdinalIgnoreCase)
                ? ServiceType.PURCHASE_AND_SHIPPING
                : ServiceType.SHIPPING_ONLY,
            CustomerName = custName,
            CustomerEmail = custEmail,
            VesselName = vessel,
            DestinationPort = destPort,
            OceanFreightCost = price > 0 ? price * 0.75m : 1450m,
            InlandTowingCost = price > 0 ? price * 0.18m : 350m,
            DocumentationFee = price > 0 ? price * 0.07m : 150m,
            PurchasePrice = GetNullableDec(el, "purchasePrice"),
            CompanyGatePassRequested = el.TryGetProperty("companyGatePassRequested", out var gp) && gp.ValueKind == JsonValueKind.True,
            Vehicle = new VehicleInspection
            {
                Vin = vin,
                Year = GetInt(el, "vehicleYear", 2023),
                Make = GetStr(el, "vehicleMake") ?? "Vehicle",
                Model = GetStr(el, "vehicleModel") ?? "",
                LotNumber = GetStr(el, "lotNumber") ?? "",
                AuctionYard = GetStr(el, "auctionName") ?? "Auction Yard"
            }
        };
    }

    private static ContainerRecord ParseContainer(JsonElement el)
    {
        var stRaw = GetStr(el, "status") ?? "CREATED";
        var st = Enum.TryParse<ContainerLifecycleStatus>(stRaw, true, out var parsed)
            ? parsed
            : ContainerLifecycleStatus.CREATED;

        return new ContainerRecord
        {
            Id = GetStr(el, "id") ?? Guid.NewGuid().ToString("N")[..8],
            ContainerNumber = GetStr(el, "containerNumber") ?? string.Empty,
            TrackingNumber = GetStr(el, "trackingNumber") ?? string.Empty,
            VesselName = GetStr(el, "vesselName") ?? string.Empty,
            VoyageNumber = GetStr(el, "voyageNumber") ?? string.Empty,
            ShippingLine = GetStr(el, "shippingLine") ?? "MSC",
            LoadingPort = GetStr(el, "loadingPort") ?? "Port of Newark, NJ",
            DestinationPort = GetStr(el, "destinationPort") ?? "Port of Mersin, Turkey",
            CurrentLocation = GetStr(el, "currentLocation") ?? "Terminal",
            Status = st,
            Progress = GetInt(el, "progress", 15),
            MaxCapacity = GetInt(el, "maxCapacity", 4),
            CurrentCount = GetInt(el, "currentCount", 0)
        };
    }

    private static UserInvoiceRecord ParseInvoice(JsonElement el)
    {
        var stRaw = GetStr(el, "status") ?? "PENDING";
        var st = Enum.TryParse<UserInvoiceStatus>(stRaw, true, out var parsed)
            ? parsed
            : UserInvoiceStatus.PENDING;

        var custName = "JACXI Client";
        var custEmail = "";
        if (el.TryGetProperty("user", out var uEl) && uEl.ValueKind == JsonValueKind.Object)
        {
            custName = GetStr(uEl, "name") ?? custName;
            custEmail = GetStr(uEl, "email") ?? "";
        }

        return new UserInvoiceRecord
        {
            Id = GetStr(el, "id") ?? Guid.NewGuid().ToString("N")[..8],
            InvoiceNumber = GetStr(el, "invoiceNumber") ?? $"INV-{Random.Shared.Next(1000, 9999)}",
            UserId = GetStr(el, "userId") ?? "usr-001",
            CustomerName = custName,
            CustomerEmail = custEmail,
            ShipmentId = GetStr(el, "shipmentId"),
            Status = st,
            Subtotal = GetDec(el, "subtotal", GetDec(el, "total")),
            AmountPaid = GetDec(el, "paidAmount"),
            PaymentMethod = GetStr(el, "paymentMethod")
        };
    }

    private static string? GetStr(JsonElement el, string prop)
        => el.TryGetProperty(prop, out var v) && v.ValueKind == JsonValueKind.String ? v.GetString() : null;

    private static int GetInt(JsonElement el, string prop, int fallback = 0)
        => el.TryGetProperty(prop, out var v) && v.ValueKind == JsonValueKind.Number && v.TryGetInt32(out var i) ? i : fallback;

    private static decimal GetDec(JsonElement el, string prop, decimal fallback = 0m)
        => el.TryGetProperty(prop, out var v) && v.ValueKind == JsonValueKind.Number && v.TryGetDecimal(out var d) ? d : fallback;

    private static decimal? GetNullableDec(JsonElement el, string prop)
        => el.TryGetProperty(prop, out var v) && v.ValueKind == JsonValueKind.Number && v.TryGetDecimal(out var d) ? d : null;

    private static string NormalizeUrl(string url)
    {
        var trimmed = (url ?? "https://jacxishipping.com").Trim().TrimEnd('/');
        if (!trimmed.StartsWith("http://", StringComparison.OrdinalIgnoreCase) &&
            !trimmed.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
        {
            trimmed = "https://" + trimmed;
        }
        return trimmed;
    }
}
