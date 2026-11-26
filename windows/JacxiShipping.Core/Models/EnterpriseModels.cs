namespace JacxiShipping.WindowsApp.Models;

public enum BankReconciliationStatus
{
    UNMATCHED,
    MATCHED,
    DISPUTED,
    IGNORED
}

public class BankTransactionRecord
{
    public string Id { get; set; } = $"bnk-{Guid.NewGuid().ToString("N")[..6]}";
    public string BankSource { get; set; } = "BOA_CSV"; // BOA_CSV, PLAID, FINICITY
    public string TransactionDate { get; set; } = DateTime.UtcNow.ToString("yyyy-MM-dd");
    public string Description { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string Reference { get; set; } = string.Empty;
    public BankReconciliationStatus Status { get; set; } = BankReconciliationStatus.UNMATCHED;
    public string? MatchedInvoiceNumber { get; set; }
    public string? MatchedCustomerName { get; set; }

    public string AmountFormatted => $"${Amount:N2}";
    public string StatusLabel => Status.ToString();
}

public class ExchangeRateRecord
{
    public string Currency { get; set; } = "USD";
    public string Name { get; set; } = "US Dollar";
    public decimal RateFromUsd { get; set; } = 1.0m;
    public string Source { get; set; } = "FIXED";
    public string EffectiveDate { get; set; } = DateTime.UtcNow.ToString("yyyy-MM-dd");

    public string RateDisplay => $"1 USD = {RateFromUsd:N4} {Currency}";
}

public class CarrierPriceQuote
{
    public string CarrierName { get; set; } = string.Empty;
    public string Route { get; set; } = string.Empty;
    public int TransitDays { get; set; }
    public decimal OceanRate { get; set; }
    public decimal HandlingFee { get; set; }
    public decimal TotalRate => OceanRate + HandlingFee;
    public string ReliabilityScore { get; set; } = "98%";
    public bool IsRecommended { get; set; }

    public string TotalFormatted => $"${TotalRate:N0}";
}

public class RecurringExpenseRecord
{
    public string Id { get; set; } = $"rec-{Guid.NewGuid().ToString("N")[..6]}";
    public string Title { get; set; } = string.Empty;
    public OfficeExpenseCategory Category { get; set; } = OfficeExpenseCategory.RENT;
    public decimal Amount { get; set; }
    public string Frequency { get; set; } = "MONTHLY"; // MONTHLY, QUARTERLY, WEEKLY
    public string Vendor { get; set; } = string.Empty;
    public string NextDueDate { get; set; } = DateTime.UtcNow.AddDays(5).ToString("yyyy-MM-dd");
    public bool IsActive { get; set; } = true;

    public string AmountFormatted => $"${Amount:N2}";
    public string CategoryLabel => Category.ToString().Replace('_', ' ');
}

public class QualityCheckRecord
{
    public string Id { get; set; } = $"qc-{Guid.NewGuid().ToString("N")[..6]}";
    public string ShipmentId { get; set; } = string.Empty;
    public string TrackingNumber { get; set; } = string.Empty;
    public string VehicleLabel { get; set; } = string.Empty;
    public string CheckType { get; set; } = "INITIAL_INSPECTION"; // INITIAL_INSPECTION, PRE_LOADING, POST_LOADING, DAMAGE_ASSESSMENT
    public string Status { get; set; } = "PASSED"; // PENDING, PASSED, FAILED, REQUIRES_ATTENTION
    public string Inspector { get; set; } = "Newark Terminal Team";
    public string CheckedAt { get; set; } = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm");
    public string Notes { get; set; } = string.Empty;
    public decimal DamageCost { get; set; }
    public string DamageLiability { get; set; } = "NONE"; // NONE, WE_PAY, COMPANY_PAYS
    public List<string> PhotoUrls { get; set; } = new();
}

public class TrackingDiagnosticRecord
{
    public string Id { get; set; } = $"diag-{Guid.NewGuid().ToString("N")[..6]}";
    public string ContainerNumber { get; set; } = string.Empty;
    public string CarrierApi { get; set; } = "MarineTraffic AIS + Line EDI";
    public string SyncStatus { get; set; } = "OK (200)";
    public int LatencyMs { get; set; } = 210;
    public string VesselPosition { get; set; } = "36.8123° N, 14.2910° E";
    public string LastLocation { get; set; } = "Mediterranean Sea";
    public string SyncedAt { get; set; } = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss");
}

public class AiInteractionRecord
{
    public string Id { get; set; } = $"ai-{Guid.NewGuid().ToString("N")[..6]}";
    public string Feature { get; set; } = "ADMIN_COPILOT";
    public string Provider { get; set; } = "JACXI AI / Gemini";
    public string Prompt { get; set; } = string.Empty;
    public string Response { get; set; } = string.Empty;
    public string Status { get; set; } = "SUCCESS";
    public string CreatedAt { get; set; } = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm");
}

public class VoiceCallLogRecord
{
    public string Id { get; set; } = $"call-{Guid.NewGuid().ToString("N")[..6]}";
    public string CallerPhone { get; set; } = string.Empty;
    public string CustomerName { get; set; } = string.Empty;
    public string Direction { get; set; } = "INBOUND";
    public string Duration { get; set; } = "02:14";
    public string Summary { get; set; } = string.Empty;
    public string Timestamp { get; set; } = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm");
}

public class CommunicationDispatchRecord
{
    public string Id { get; set; } = $"msg-{Guid.NewGuid().ToString("N")[..6]}";
    public string Channel { get; set; } = "EMAIL"; // EMAIL, SMS, WHATSAPP, TELEGRAM
    public string Recipient { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public string Status { get; set; } = "SENT";
    public string SentAt { get; set; } = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm");
}

public class AdminNotificationItem
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N")[..8];
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Type { get; set; } = "INFO"; // INFO, SUCCESS, WARNING, ERROR
    public string Timestamp { get; set; } = DateTime.Now.ToString("HH:mm");
    public bool IsRead { get; set; }
}

public class ChartBarPoint
{
    public string Label { get; set; } = string.Empty;
    public decimal Value { get; set; }
    public double HeightRatio { get; set; } // 0..100 for UI scaling
    public string ValueFormatted => $"${Value:N0}";
}

public class AppUpdateCheckResult
{
    public bool UpdateAvailable { get; set; }
    public string CurrentVersion { get; set; } = "3.0.0";
    public string LatestTag { get; set; } = "v3.0.0-windows-admin";
    public string ReleaseUrl { get; set; } = "https://github.com/jacxishipping/jacxishipping/releases";
    public string Message { get; set; } = string.Empty;
}
