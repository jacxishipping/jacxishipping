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
    Task<bool> PushShipmentStatusAsync(string serverUrl, string bearerToken, string shipmentId, ShipmentSimpleStatus status);
    Task<bool> DispatchCommunicationAsync(string serverUrl, string bearerToken, CommunicationDispatchRecord dispatch);
    Task<string?> AskGeminiCopilotAsync(string serverUrl, string bearerToken, string prompt);
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
            var token = doc.RootElement.TryGetProperty("token", out var tokEl) ? tokEl.GetString() : null;
            AdminUser? adminUser = null;
            if (doc.RootElement.TryGetProperty("user", out var usrEl))
            {
                adminUser = new AdminUser
                {
                    Id = usrEl.TryGetProperty("id", out var idEl) ? idEl.GetString() ?? "adm" : "adm",
                    Name = usrEl.TryGetProperty("name", out var nEl) ? nEl.GetString() ?? email : email,
                    Email = usrEl.TryGetProperty("email", out var eEl) ? eEl.GetString() ?? email : email,
                    Role = usrEl.TryGetProperty("role", out var rEl) ? rEl.GetString() ?? "admin" : "admin",
                    LoginCode = usrEl.TryGetProperty("loginCode", out var cEl) ? cEl.GetString() ?? "" : ""
                };
            }

            return new CloudAuthResult
            {
                Success = !string.IsNullOrWhiteSpace(token),
                Token = token,
                User = adminUser,
                Message = "Connected to JACXI Cloud API."
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
            var token = doc.RootElement.TryGetProperty("token", out var tokEl) ? tokEl.GetString() : null;
            return new CloudAuthResult { Success = !string.IsNullOrWhiteSpace(token), Token = token, Message = "Authenticated with Login Code." };
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
            using var req = new HttpRequestMessage(HttpMethod.Get, $"{baseUrl}/api/mobile-auth/me");
            req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", bearerToken);
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
        try
        {
            var baseUrl = NormalizeUrl(serverUrl);
            int sCount = 0, cCount = 0, iCount = 0;

            using var sReq = new HttpRequestMessage(HttpMethod.Get, $"{baseUrl}/api/shipments?limit=50");
            sReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", bearerToken);
            using var sResp = await Http.SendAsync(sReq);
            if (sResp.IsSuccessStatusCode)
            {
                using var doc = JsonDocument.Parse(await sResp.Content.ReadAsStringAsync());
                if (doc.RootElement.TryGetProperty("shipments", out var arr) && arr.ValueKind == JsonValueKind.Array)
                    sCount = arr.GetArrayLength();
            }

            using var cReq = new HttpRequestMessage(HttpMethod.Get, $"{baseUrl}/api/containers?limit=50");
            cReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", bearerToken);
            using var cResp = await Http.SendAsync(cReq);
            if (cResp.IsSuccessStatusCode)
            {
                using var doc = JsonDocument.Parse(await cResp.Content.ReadAsStringAsync());
                if (doc.RootElement.TryGetProperty("containers", out var arr) && arr.ValueKind == JsonValueKind.Array)
                    cCount = arr.GetArrayLength();
            }

            using var iReq = new HttpRequestMessage(HttpMethod.Get, $"{baseUrl}/api/invoices?limit=50");
            iReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", bearerToken);
            using var iResp = await Http.SendAsync(iReq);
            if (iResp.IsSuccessStatusCode)
            {
                using var doc = JsonDocument.Parse(await iResp.Content.ReadAsStringAsync());
                if (doc.RootElement.TryGetProperty("invoices", out var arr) && arr.ValueKind == JsonValueKind.Array)
                    iCount = arr.GetArrayLength();
            }

            return new CloudSyncSummary
            {
                Success = true,
                ShipmentsPulled = sCount,
                ContainersPulled = cCount,
                InvoicesPulled = iCount,
                Message = $"Synced with {baseUrl}: {sCount} shipments, {cCount} containers, {iCount} invoices."
            };
        }
        catch (Exception ex)
        {
            return new CloudSyncSummary { Success = false, Message = $"Cloud sync error: {ex.Message}" };
        }
    }

    public async Task<bool> PushShipmentStatusAsync(string serverUrl, string bearerToken, string shipmentId, ShipmentSimpleStatus status)
    {
        try
        {
            var baseUrl = NormalizeUrl(serverUrl);
            var payload = JsonSerializer.Serialize(new { status = status.ToString() });
            using var req = new HttpRequestMessage(HttpMethod.Patch, $"{baseUrl}/api/shipments/{shipmentId}");
            req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", bearerToken);
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
            using var req = new HttpRequestMessage(HttpMethod.Post, $"{baseUrl}/api/communications/dispatch");
            req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", bearerToken);
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
            using var req = new HttpRequestMessage(HttpMethod.Post, $"{baseUrl}/api/gemini");
            req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", bearerToken);
            req.Content = new StringContent(payload, Encoding.UTF8, "application/json");
            using var resp = await Http.SendAsync(req);
            if (!resp.IsSuccessStatusCode) return null;
            var json = await resp.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);
            if (doc.RootElement.TryGetProperty("response", out var r)) return r.GetString();
            if (doc.RootElement.TryGetProperty("text", out var t)) return t.GetString();
            return null;
        }
        catch
        {
            return null;
        }
    }

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
