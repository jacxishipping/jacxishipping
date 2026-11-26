namespace JacxiShipping.WindowsApp.Models;

public class McpToolItem
{
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = "Search";
    public string Description { get; set; } = string.Empty;
    public string SampleArgsJson { get; set; } = "{}";
}

public class McpResourceItem
{
    public string Uri { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string MimeType { get; set; } = "application/json";
    public string Description { get; set; } = string.Empty;
}

public class McpServerConfig
{
    public string ServerName { get; set; } = "jacxishipping-mcp";
    public string Version { get; set; } = "1.0.0";
    public string ProtocolVersion { get; set; } = "2025-03-26";
    public string EndpointUrl { get; set; } = "https://jacxishipping.com/api/mcp";
    public bool Enabled { get; set; } = true;
    public string AuthMode { get; set; } = "required";
    public string DataSource { get; set; } = "database";
    public string ApiKey { get; set; } = "jx_mcp_live_99482a7f31d0c8";
}

public class CallAgentConfigModel
{
    public string PreferredBaseUrl { get; set; } = "https://jacxishipping.com";
    public string WebhookUrl { get; set; } = "https://jacxishipping.com/api/voice/webhook";
    public string WebsocketUrl { get; set; } = "wss://jacxishipping.com/api/voice/stream";
    public string GeminiVoiceModel { get; set; } = "gemini-2.5-flash";
    public string GeminiLiveModel { get; set; } = "gemini-3.1-flash-live-preview";
    public string TwilioPhoneNumber { get; set; } = "+1 (973) 555-0194";
    public string TwilioAccountSid { get; set; } = "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";
    public bool GeminiStandardConfigured { get; set; } = true;
    public bool GeminiLiveConfigured { get; set; } = true;
    public bool TwilioConfigured { get; set; } = true;
    public bool VoiceWebhookTokenConfigured { get; set; } = true;
}

public class CloudSyncPayload
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public List<Shipment> Shipments { get; set; } = new();
    public List<ContainerRecord> Containers { get; set; } = new();
    public List<UserInvoiceRecord> Invoices { get; set; } = new();
}
