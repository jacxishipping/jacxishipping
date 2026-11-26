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

public interface IJacxiCloudClient
{
    Task<CloudAuthResult> SignInAsync(string serverUrl, string email, string password);
    Task<CloudAuthResult> SignInWithCodeAsync(string serverUrl, string loginCode);
    Task<string> TestConnectionAndSyncAsync(string serverUrl, string bearerToken);
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
            {
                return new CloudAuthResult { Success = false, Message = $"Server returned {(int)resp.StatusCode}: {body}" };
            }

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
            {
                return new CloudAuthResult { Success = false, Message = $"Code login failed ({(int)resp.StatusCode})." };
            }

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
            if (!resp.IsSuccessStatusCode)
            {
                return $"Sync check failed: HTTP {(int)resp.StatusCode}";
            }
            return $"Verified live cloud session at {DateTime.Now:HH:mm:ss}.";
        }
        catch (Exception ex)
        {
            return $"Cloud unreachable: {ex.Message}";
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
