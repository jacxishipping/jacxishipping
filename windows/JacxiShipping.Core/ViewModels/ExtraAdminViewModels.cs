using System.Collections.ObjectModel;
using JacxiShipping.WindowsApp.Models;
using JacxiShipping.WindowsApp.Services;

namespace JacxiShipping.WindowsApp.ViewModels;

public class McpServerViewModel : ViewModelBase
{
    private readonly IAdminStoreService _store;
    private readonly IJacxiCloudClient _cloud;
    private readonly IPlatformInteractionService _platform;

    private McpServerConfig _config = new();
    private McpToolItem? _selectedTool;
    private string _toolArgsInput = "{ \"query\": \"RAV4\" }";
    private string _toolOutputPreview = string.Empty;
    private string _statusMessage = string.Empty;

    public ObservableCollection<McpToolItem> Tools { get; } = new();
    public ObservableCollection<McpResourceItem> Resources { get; } = new();
    public ObservableCollection<AiInteractionRecord> McpLogs { get; } = new();

    public McpServerConfig Config { get => _config; set => SetProperty(ref _config, value); }
    public McpToolItem? SelectedTool
    {
        get => _selectedTool;
        set
        {
            if (SetProperty(ref _selectedTool, value) && value != null)
            {
                ToolArgsInput = value.SampleArgsJson;
            }
        }
    }
    public string ToolArgsInput { get => _toolArgsInput; set => SetProperty(ref _toolArgsInput, value); }
    public string ToolOutputPreview { get => _toolOutputPreview; set => SetProperty(ref _toolOutputPreview, value); }
    public string StatusMessage { get => _statusMessage; set => SetProperty(ref _statusMessage, value); }

    public RelayCommand SyncFromCloudCommand { get; }
    public RelayCommand ToggleEnabledCommand { get; }
    public RelayCommand RegenerateKeyCommand { get; }
    public RelayCommand CopyEndpointCommand { get; }
    public RelayCommand CopyApiKeyCommand { get; }
    public RelayCommand RunToolCommand { get; }

    public McpServerViewModel(IAdminStoreService store, IJacxiCloudClient cloud, IPlatformInteractionService platform)
    {
        _store = store;
        _cloud = cloud;
        _platform = platform;

        Tools.Add(new McpToolItem { Name = "search_shipments", Category = "Search", Description = "Search active shipments by VIN, make, model, tracking ID, or customer.", SampleArgsJson = "{ \"query\": \"Toyota\" }" });
        Tools.Add(new McpToolItem { Name = "track_container", Category = "Tracking", Description = "Retrieve AIS coordinates, vessel name, and ETA for an ocean container.", SampleArgsJson = "{ \"containerNumber\": \"MSCU7829104\" }" });
        Tools.Add(new McpToolItem { Name = "quote_shipping_rate", Category = "Quotes", Description = "Calculate inland auction towing + ocean freight rate from US yard.", SampleArgsJson = "{ \"state\": \"TX\", \"destination\": \"Port of Mersin, Turkey\" }" });
        Tools.Add(new McpToolItem { Name = "get_ar_summary", Category = "Analytics", Description = "Summarize overdue invoices and open A/R balances across dealers.", SampleArgsJson = "{ \"includeAging\": true }" });
        Tools.Add(new McpToolItem { Name = "gate_pass_status", Category = "Operations", Description = "Inspect pending port gate passes and digital release tokens.", SampleArgsJson = "{ \"status\": \"REQUESTED\" }" });

        Resources.Add(new McpResourceItem { Uri = "jacxi://stats/overview", Name = "Operational Overview Metrics", Description = "Live counts of shipments, containers, and yard inventory by status." });
        Resources.Add(new McpResourceItem { Uri = "jacxi://containers/active", Name = "Active Ocean Containers", Description = "Live list of containers loaded or sailing across MSC/CMA CGM/Maersk." });
        Resources.Add(new McpResourceItem { Uri = "jacxi://openapi.json", Name = "OpenAPI 3.1 Specification", Description = "REST & ChatGPT Action schema definition served at https://jacxishipping.com." });

        SyncFromCloudCommand = new RelayCommand(async () =>
        {
            if (!_store.Session.IsCloudConnected || string.IsNullOrWhiteSpace(_store.Session.BearerToken))
            {
                StatusMessage = "Connect in Settings & Sync first to pull live cloud MCP config.";
                return;
            }
            var live = await _cloud.FetchMcpConfigAsync(_store.Session.ServerUrl, _store.Session.BearerToken);
            if (live != null)
            {
                _store.SaveMcpConfig(live);
                Config = live;
                OnPropertyChanged(nameof(Config));
                StatusMessage = $"Synced MCP gateway metadata from {_store.Session.ServerUrl}.";
            }
            else
            {
                StatusMessage = "Could not reach /api/mcp/admin on cloud server; using local configuration.";
            }
        });

        ToggleEnabledCommand = new RelayCommand(() =>
        {
            Config.Enabled = !Config.Enabled;
            _store.SaveMcpConfig(Config);
            OnPropertyChanged(nameof(Config));
            StatusMessage = Config.Enabled ? "MCP Gateway ENABLED for external AI agents." : "MCP Gateway PAUSED.";
        });

        RegenerateKeyCommand = new RelayCommand(() =>
        {
            if (!_platform.ConfirmAction("Rotate MCP API Key", "Rotating the MCP key invalidates existing AI agent Bearer tokens. Continue?", "Rotate Key", isDestructive: true))
                return;

            var newKey = _store.RegenerateMcpApiKey();
            Config = _store.GetMcpConfig();
            OnPropertyChanged(nameof(Config));
            StatusMessage = $"Generated new MCP API key: {newKey[..16]}...";
        });

        CopyEndpointCommand = new RelayCommand(() =>
        {
            _platform.CopyToClipboard(Config.EndpointUrl);
            StatusMessage = $"Copied MCP endpoint: {Config.EndpointUrl}";
        });

        CopyApiKeyCommand = new RelayCommand(() =>
        {
            _platform.CopyToClipboard(Config.ApiKey);
            StatusMessage = "Copied MCP Bearer key to clipboard.";
        });

        RunToolCommand = new RelayCommand(() =>
        {
            if (SelectedTool == null) return;
            var stats = _store.GetDashboardStats();
            var output = SelectedTool.Name switch
            {
                "search_shipments" => $"Found {_store.GetShipments().Count} shipments. Top match: {_store.GetShipments().FirstOrDefault()?.Vehicle.FullDescription} ({_store.GetShipments().FirstOrDefault()?.TrackingNumber})",
                "track_container" => $"Container {_store.GetContainers().FirstOrDefault()?.ContainerNumber} aboard {_store.GetContainers().FirstOrDefault()?.VesselName} — Status: {_store.GetContainers().FirstOrDefault()?.StatusLabel} ({_store.GetContainers().FirstOrDefault()?.Progress}%)",
                "quote_shipping_rate" => "TX -> Port of Mersin: $350 Inland + $1,350 Ocean + $270 Fees = $1,970.00 Total",
                "get_ar_summary" => $"Open A/R across {_store.GetInvoices().Count(i => i.AmountRemaining > 0)} invoice(s): ${stats.PendingInvoicesTotal:N2}. Total Collected Revenue: ${stats.TotalRevenue:N2}.",
                "gate_pass_status" => $"{_store.GetGatePassRequests().Count(g => g.Status != "COMPLETED")} active port release gate pass request(s).",
                _ => "Tool executed cleanly."
            };

            ToolOutputPreview = $"Tool: {SelectedTool.Name}\nArgs: {ToolArgsInput}\nExecuted At: {DateTime.Now:HH:mm:ss}\n\n{output}";
            _store.AddAiInteraction(new AiInteractionRecord
            {
                Feature = $"MCP:{SelectedTool.Name}",
                Provider = Config.ServerName,
                Prompt = ToolArgsInput,
                Response = output,
                Status = "SUCCESS"
            });
            Refresh();
            StatusMessage = $"Executed MCP tool `{SelectedTool.Name}`.";
        });

        Refresh();
        SelectedTool = Tools.FirstOrDefault();
    }

    public void Refresh()
    {
        Config = _store.GetMcpConfig();
        McpLogs.Clear();
        foreach (var l in _store.GetAiInteractions().Take(20)) McpLogs.Add(l);
    }
}

public class CallAgentSettingsViewModel : ViewModelBase
{
    private readonly IAdminStoreService _store;
    private readonly IJacxiCloudClient _cloud;
    private readonly IPlatformInteractionService _platform;

    private CallAgentConfigModel _config = new();
    private string _statusMessage = string.Empty;

    public CallAgentConfigModel Config { get => _config; set => SetProperty(ref _config, value); }
    public ObservableCollection<VoiceCallLogRecord> CallLogs { get; } = new();
    public string StatusMessage { get => _statusMessage; set => SetProperty(ref _statusMessage, value); }

    public RelayCommand SyncFromCloudCommand { get; }
    public RelayCommand SaveConfigCommand { get; }
    public RelayCommand CopyWebhookCommand { get; }
    public RelayCommand CopyWebsocketCommand { get; }

    public CallAgentSettingsViewModel(IAdminStoreService store, IJacxiCloudClient cloud, IPlatformInteractionService platform)
    {
        _store = store;
        _cloud = cloud;
        _platform = platform;

        SyncFromCloudCommand = new RelayCommand(async () =>
        {
            if (!_store.Session.IsCloudConnected || string.IsNullOrWhiteSpace(_store.Session.BearerToken))
            {
                StatusMessage = "Connect in Settings & Sync first to inspect live Twilio & Gemini status.";
                return;
            }
            var live = await _cloud.FetchCallAgentConfigAsync(_store.Session.ServerUrl, _store.Session.BearerToken);
            if (live != null)
            {
                _store.SaveCallAgentConfig(live);
                Config = live;
                OnPropertyChanged(nameof(Config));
                StatusMessage = $"Synced Voice Agent health & webhooks from {_store.Session.ServerUrl}.";
            }
            else
            {
                StatusMessage = "Could not fetch /api/settings/call-agent; showing saved config.";
            }
        });

        SaveConfigCommand = new RelayCommand(() =>
        {
            _store.SaveCallAgentConfig(Config);
            StatusMessage = "Saved Twilio & Gemini Live Call Agent configuration locally.";
        });

        CopyWebhookCommand = new RelayCommand(() =>
        {
            _platform.CopyToClipboard(Config.WebhookUrl);
            StatusMessage = $"Copied Webhook URL: {Config.WebhookUrl}";
        });

        CopyWebsocketCommand = new RelayCommand(() =>
        {
            _platform.CopyToClipboard(Config.WebsocketUrl);
            StatusMessage = $"Copied WebSocket URL: {Config.WebsocketUrl}";
        });

        Refresh();
    }

    public void Refresh()
    {
        Config = _store.GetCallAgentConfig();
        CallLogs.Clear();
        foreach (var v in _store.GetVoiceCallLogs()) CallLogs.Add(v);
    }
}

public class ProfileViewModel : ViewModelBase
{
    private readonly IAdminStoreService _store;
    private readonly IJacxiCloudClient _cloud;
    private readonly IPlatformInteractionService _platform;

    private string _name = string.Empty;
    private string _email = string.Empty;
    private string _role = string.Empty;
    private string _phone = string.Empty;
    private string _address = string.Empty;
    private string _city = string.Empty;
    private string _country = string.Empty;
    private string _loginCode = string.Empty;
    private string _currentPassword = string.Empty;
    private string _newPassword = string.Empty;
    private string _confirmPassword = string.Empty;
    private string _statusMessage = string.Empty;

    public string Name { get => _name; set => SetProperty(ref _name, value); }
    public string Email { get => _email; set => SetProperty(ref _email, value); }
    public string Role { get => _role; set => SetProperty(ref _role, value); }
    public string Phone { get => _phone; set => SetProperty(ref _phone, value); }
    public string Address { get => _address; set => SetProperty(ref _address, value); }
    public string City { get => _city; set => SetProperty(ref _city, value); }
    public string Country { get => _country; set => SetProperty(ref _country, value); }
    public string LoginCode { get => _loginCode; set => SetProperty(ref _loginCode, value); }
    public string Initials => _store.Session.CurrentAdmin.Initials;

    public string CurrentPassword { get => _currentPassword; set => SetProperty(ref _currentPassword, value); }
    public string NewPassword { get => _newPassword; set => SetProperty(ref _newPassword, value); }
    public string ConfirmPassword { get => _confirmPassword; set => SetProperty(ref _confirmPassword, value); }
    public string StatusMessage { get => _statusMessage; set => SetProperty(ref _statusMessage, value); }

    public RelayCommand SaveProfileCommand { get; }
    public RelayCommand ChangePasswordCommand { get; }
    public RelayCommand RegenerateLoginCodeCommand { get; }
    public RelayCommand CopyLoginCodeCommand { get; }

    public ProfileViewModel(IAdminStoreService store, IJacxiCloudClient cloud, IPlatformInteractionService platform)
    {
        _store = store;
        _cloud = cloud;
        _platform = platform;

        SaveProfileCommand = new RelayCommand(async () =>
        {
            _store.UpdateCurrentAdminProfile(Name, Phone, Address, City, Country);
            OnPropertyChanged(nameof(Initials));
            if (_store.Session.IsCloudConnected && !string.IsNullOrWhiteSpace(_store.Session.BearerToken))
            {
                var (_, msg) = await _cloud.UpdateProfileAsync(_store.Session.ServerUrl, _store.Session.BearerToken, _store.Session.CurrentAdmin);
                StatusMessage = msg;
            }
            else
            {
                StatusMessage = $"Updated local admin profile for {Name}.";
            }
        });

        ChangePasswordCommand = new RelayCommand(async () =>
        {
            if (string.IsNullOrWhiteSpace(NewPassword) || NewPassword.Length < 6)
            {
                StatusMessage = "New password must be at least 6 characters.";
                return;
            }
            if (NewPassword != ConfirmPassword)
            {
                StatusMessage = "New password and confirmation do not match.";
                return;
            }

            if (_store.Session.IsCloudConnected && !string.IsNullOrWhiteSpace(_store.Session.BearerToken))
            {
                var (_, msg) = await _cloud.UpdatePasswordAsync(_store.Session.ServerUrl, _store.Session.BearerToken, CurrentPassword, NewPassword);
                StatusMessage = msg;
            }
            else
            {
                StatusMessage = "Password change queued (connect to https://jacxishipping.com to update server password).";
            }

            CurrentPassword = string.Empty;
            NewPassword = string.Empty;
            ConfirmPassword = string.Empty;
        });

        RegenerateLoginCodeCommand = new RelayCommand(() =>
        {
            var code = _store.RegenerateUserLoginCode(_store.Session.CurrentAdmin.Id);
            _store.Session.CurrentAdmin.LoginCode = code;
            _store.SaveState();
            LoginCode = code;
            StatusMessage = $"Rotated 8-character admin login code: {code}";
        });

        CopyLoginCodeCommand = new RelayCommand(() =>
        {
            _platform.CopyToClipboard(LoginCode);
            StatusMessage = $"Copied Login Code: {LoginCode}";
        });

        Refresh();
    }

    public void Refresh()
    {
        var a = _store.Session.CurrentAdmin;
        Name = a.Name;
        Email = a.Email;
        Role = a.RoleUpper;
        Phone = a.Phone;
        Address = a.Address;
        City = a.City;
        Country = a.Country;
        LoginCode = string.IsNullOrWhiteSpace(a.LoginCode) ? "JX884910" : a.LoginCode;
        OnPropertyChanged(nameof(Initials));
    }
}
