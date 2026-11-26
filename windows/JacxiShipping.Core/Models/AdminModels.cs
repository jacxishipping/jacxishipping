namespace JacxiShipping.WindowsApp.Models;

public class AdminUser
{
    public string Id { get; set; } = $"usr-{Guid.NewGuid().ToString("N")[..6]}";
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = "user"; // admin, manager, finance, operations, customer_service, user
    public string Phone { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string Country { get; set; } = string.Empty;
    public string LoginCode { get; set; } = string.Empty;
    public CollectionStatus CollectionStatus { get; set; } = CollectionStatus.CURRENT;
    public string? PromiseToPayDate { get; set; }
    public string? CollectionNotes { get; set; }
    public decimal Balance { get; set; }
    public int ShipmentCount { get; set; }
    public string CreatedAt { get; set; } = DateTime.UtcNow.ToString("yyyy-MM-dd");

    public string BalanceFormatted => $"${Balance:N2}";
    public string RoleUpper => Role.ToUpperInvariant().Replace('_', ' ');
    public string Initials
    {
        get
        {
            if (string.IsNullOrWhiteSpace(Name)) return "U";
            var parts = Name.Split(' ', StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length == 1) return parts[0][..Math.Min(2, parts[0].Length)].ToUpperInvariant();
            return $"{parts[0][0]}{parts[^1][0]}".ToUpperInvariant();
        }
    }
}

public class ShippingCompany
{
    public string Id { get; set; } = $"cmp-{Guid.NewGuid().ToString("N")[..6]}";
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Country { get; set; } = "USA";
    public bool IsShipping { get; set; }
    public bool IsDispatch { get; set; }
    public bool IsTransit { get; set; }
    public bool IsActive { get; set; } = true;
    public decimal Balance { get; set; }
    public string Notes { get; set; } = string.Empty;

    public string RolesSummary
    {
        get
        {
            var roles = new List<string>();
            if (IsShipping) roles.Add("Ocean");
            if (IsDispatch) roles.Add("Dispatch");
            if (IsTransit) roles.Add("Transit");
            return roles.Count > 0 ? string.Join(" · ", roles) : "General";
        }
    }

    public string BalanceFormatted => $"${Balance:N2}";
}

public class ContainerRecord
{
    public string Id { get; set; } = $"cnt-{Guid.NewGuid().ToString("N")[..6]}";
    public string ContainerNumber { get; set; } = string.Empty;
    public string TrackingNumber { get; set; } = string.Empty;
    public string? CompanyId { get; set; }
    public string CompanyName { get; set; } = "MSC Mediterranean Shipping";
    public string VesselName { get; set; } = string.Empty;
    public string VoyageNumber { get; set; } = string.Empty;
    public string ShippingLine { get; set; } = "MSC";
    public string BookingNumber { get; set; } = string.Empty;
    public string LoadingPort { get; set; } = "Port of Newark, NJ";
    public string DestinationPort { get; set; } = "Port of Mersin, Turkey";
    public ContainerLifecycleStatus Status { get; set; } = ContainerLifecycleStatus.CREATED;
    public string CurrentLocation { get; set; } = "Newark Terminal Yard";
    public int Progress { get; set; } = 15;
    public int MaxCapacity { get; set; } = 4;
    public int CurrentCount { get; set; }
    public string LoadingDate { get; set; } = DateTime.UtcNow.ToString("yyyy-MM-dd");
    public string DepartureDate { get; set; } = DateTime.UtcNow.AddDays(3).ToString("yyyy-MM-dd");
    public string EstimatedArrival { get; set; } = DateTime.UtcNow.AddDays(26).ToString("yyyy-MM-dd");
    public decimal ExpensesTotal { get; set; } = 4200m;
    public string Notes { get; set; } = string.Empty;

    public string CapacityDisplay => $"{CurrentCount} / {MaxCapacity} vehicles";
    public string ExpensesFormatted => $"${ExpensesTotal:N0}";
    public string StatusLabel => Status.ToString().Replace('_', ' ');
}

public class DispatchRecord
{
    public string Id { get; set; } = $"dsp-{Guid.NewGuid().ToString("N")[..6]}";
    public string ReferenceNumber { get; set; } = string.Empty;
    public string CompanyId { get; set; } = string.Empty;
    public string CompanyName { get; set; } = string.Empty;
    public string Origin { get; set; } = string.Empty;
    public string Destination { get; set; } = string.Empty;
    public DispatchStatus Status { get; set; } = DispatchStatus.PENDING;
    public string DispatchDate { get; set; } = DateTime.UtcNow.ToString("yyyy-MM-dd");
    public string EstimatedArrival { get; set; } = DateTime.UtcNow.AddDays(3).ToString("yyyy-MM-dd");
    public decimal Cost { get; set; }
    public int VehicleCount { get; set; }
    public string Notes { get; set; } = string.Empty;

    public string CostFormatted => $"${Cost:N0}";
    public string StatusLabel => Status.ToString().Replace('_', ' ');
}

public class TransitRecord
{
    public string Id { get; set; } = $"trn-{Guid.NewGuid().ToString("N")[..6]}";
    public string ReferenceNumber { get; set; } = string.Empty;
    public string CompanyId { get; set; } = string.Empty;
    public string CompanyName { get; set; } = string.Empty;
    public string Origin { get; set; } = "Jebel Ali Port, UAE";
    public string Destination { get; set; } = "Kabul, Afghanistan";
    public string BorderCrossing { get; set; } = "Islam Qala / Hairatan";
    public TransitStatus Status { get; set; } = TransitStatus.PENDING;
    public string DispatchDate { get; set; } = DateTime.UtcNow.ToString("yyyy-MM-dd");
    public string EstimatedDelivery { get; set; } = DateTime.UtcNow.AddDays(12).ToString("yyyy-MM-dd");
    public string? ActualDelivery { get; set; }
    public string? DeliveryReceiverName { get; set; }
    public decimal Cost { get; set; }
    public int VehicleCount { get; set; }
    public string Notes { get; set; } = string.Empty;

    public string CostFormatted => $"${Cost:N0}";
    public string StatusLabel => Status.ToString().Replace('_', ' ');
}

public class InvoiceLineItemRecord
{
    public string Description { get; set; } = string.Empty;
    public string Type { get; set; } = "SHIPPING_FEE";
    public decimal Quantity { get; set; } = 1m;
    public decimal UnitPrice { get; set; }
    public decimal Amount => Quantity * UnitPrice;
    public string AmountFormatted => $"${Amount:N2}";
}

public class UserInvoiceRecord
{
    public string Id { get; set; } = $"inv-{Guid.NewGuid().ToString("N")[..6]}";
    public string InvoiceNumber { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string CustomerName { get; set; } = string.Empty;
    public string CustomerEmail { get; set; } = string.Empty;
    public string? ShipmentId { get; set; }
    public string? ContainerNumber { get; set; }
    public UserInvoiceStatus Status { get; set; } = UserInvoiceStatus.PENDING;
    public string IssueDate { get; set; } = DateTime.UtcNow.ToString("yyyy-MM-dd");
    public string DueDate { get; set; } = DateTime.UtcNow.AddDays(14).ToString("yyyy-MM-dd");
    public string? PaidDate { get; set; }
    public decimal Subtotal { get; set; }
    public decimal Tax { get; set; }
    public decimal Discount { get; set; }
    public decimal Total => Subtotal + Tax - Discount;
    public decimal AmountPaid { get; set; }
    public decimal AmountRemaining => Math.Max(0, Total - AmountPaid);
    public string Currency { get; set; } = "USD";
    public string? PaymentMethod { get; set; }
    public string Notes { get; set; } = string.Empty;
    public List<InvoiceLineItemRecord> LineItems { get; set; } = new();

    public string TotalFormatted => $"${Total:N2}";
    public string AmountPaidFormatted => $"${AmountPaid:N2}";
    public string AmountRemainingFormatted => $"${AmountRemaining:N2}";
    public string StatusLabel => Status.ToString().Replace('_', ' ');
}

public class LedgerEntryRecord
{
    public string Id { get; set; } = $"ldg-{Guid.NewGuid().ToString("N")[..6]}";
    public string UserId { get; set; } = string.Empty;
    public string CustomerName { get; set; } = string.Empty;
    public string? ShipmentId { get; set; }
    public string TransactionDate { get; set; } = DateTime.UtcNow.ToString("yyyy-MM-dd");
    public string Description { get; set; } = string.Empty;
    public LedgerEntryType Type { get; set; } = LedgerEntryType.DEBIT;
    public decimal Amount { get; set; }
    public decimal Balance { get; set; }
    public string TransactionInfoType { get; set; } = "SHIPPING_PAYMENT";
    public string CreatedBy { get; set; } = "Admin Desk";
    public string Notes { get; set; } = string.Empty;

    public string AmountFormatted => Type == LedgerEntryType.CREDIT ? $"+${Amount:N2}" : $"-${Amount:N2}";
    public string BalanceFormatted => $"${Balance:N2}";
}

public class OfficeExpenseRecord
{
    public string Id { get; set; } = $"exp-{Guid.NewGuid().ToString("N")[..6]}";
    public string Title { get; set; } = string.Empty;
    public OfficeExpenseCategory Category { get; set; } = OfficeExpenseCategory.OTHER;
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "USD";
    public string ExpenseDate { get; set; } = DateTime.UtcNow.ToString("yyyy-MM-dd");
    public string PaymentMethod { get; set; } = "BANK_TRANSFER";
    public string Vendor { get; set; } = string.Empty;
    public string ReferenceNumber { get; set; } = string.Empty;
    public string Status { get; set; } = "PAID";
    public string Notes { get; set; } = string.Empty;

    public string AmountFormatted => $"${Amount:N2}";
    public string CategoryLabel => Category.ToString().Replace('_', ' ');
}

public class ExpenseBudgetRecord
{
    public string Id { get; set; } = $"bdg-{Guid.NewGuid().ToString("N")[..6]}";
    public string Name { get; set; } = string.Empty;
    public OfficeExpenseCategory Category { get; set; } = OfficeExpenseCategory.RENT;
    public decimal MonthlyLimit { get; set; }
    public decimal SpentAmount { get; set; }
    public int PercentUsed => MonthlyLimit > 0 ? (int)Math.Min(100, Math.Round((SpentAmount / MonthlyLimit) * 100m)) : 0;
    public string SummaryDisplay => $"${SpentAmount:N0} / ${MonthlyLimit:N0} ({PercentUsed}%)";
}

public class LedgerTransferRecord
{
    public string Id { get; set; } = $"trf-{Guid.NewGuid().ToString("N")[..6]}";
    public string TransferNumber { get; set; } = string.Empty;
    public LedgerTransferType TransferType { get; set; } = LedgerTransferType.USER_TO_COMPANY;
    public string SourceName { get; set; } = string.Empty;
    public string DestName { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string TransferDate { get; set; } = DateTime.UtcNow.ToString("yyyy-MM-dd");
    public string Reference { get; set; } = string.Empty;
    public string Status { get; set; } = "COMPLETED";

    public string AmountFormatted => $"${Amount:N2}";
    public string TypeLabel => TransferType.ToString().Replace('_', ' ');
}

public class PartnerPortalRecord
{
    public string Id { get; set; } = $"prt-{Guid.NewGuid().ToString("N")[..6]}";
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string CustomDomain { get; set; } = string.Empty;
    public string AccentColor { get; set; } = "#D4AF37";
    public int CustomerCount { get; set; }
    public int AssignedShipmentsCount { get; set; }
    public decimal Balance { get; set; }
    public bool IsActive { get; set; } = true;

    public string BalanceFormatted => $"${Balance:N2}";
    public string StatusText => IsActive ? "Active" : "Suspended";
}

public class GatePassRequest
{
    public string Id { get; set; } = $"gp-{Guid.NewGuid().ToString("N")[..6]}";
    public string ShipmentId { get; set; } = string.Empty;
    public string TrackingNumber { get; set; } = string.Empty;
    public string VehicleLabel { get; set; } = string.Empty;
    public string Vin { get; set; } = string.Empty;
    public string CustomerName { get; set; } = string.Empty;
    public string ContainerNumber { get; set; } = string.Empty;
    public string ReleaseToken { get; set; } = string.Empty;
    public string RequestedAt { get; set; } = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm");
    public string? CompletedAt { get; set; }
    public int DurationMinutes { get; set; }
    public string Status { get; set; } = "REQUESTED"; // REQUESTED, IN_PROGRESS, COMPLETED
}

public class ExceptionAlertItem
{
    public string Title { get; set; } = string.Empty;
    public string Subtitle { get; set; } = string.Empty;
    public string Severity { get; set; } = "Warning"; // Warning, Error, Info
    public string TargetTab { get; set; } = "Shipments";
    public int AgeDays { get; set; }
}

public class NavBadges
{
    public int AgingShipments { get; set; }
    public int OverdueInvoices { get; set; }
    public int PendingGatePasses { get; set; }
    public int CustomsHoldCount { get; set; }
}

public class CloudSessionConfig
{
    public string ServerUrl { get; set; } = "https://jacxishipping.com";
    public string? BearerToken { get; set; }
    public bool IsCloudConnected { get; set; }
    public string LastSyncAt { get; set; } = "Local Mode (Instant)";
    public AdminUser CurrentAdmin { get; set; } = new()
    {
        Id = "adm-001",
        Name = "JACXI Operations Admin",
        Email = "admin@jacxishipping.com",
        Role = "admin",
        LoginCode = "JX884910"
    };
}
