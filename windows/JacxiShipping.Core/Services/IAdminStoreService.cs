using JacxiShipping.WindowsApp.Models;

namespace JacxiShipping.WindowsApp.Services;

public interface IAdminStoreService
{
    CloudSessionConfig Session { get; }

    IReadOnlyList<Shipment> GetShipments();
    IReadOnlyList<ContainerRecord> GetContainers();
    IReadOnlyList<DispatchRecord> GetDispatches();
    IReadOnlyList<TransitRecord> GetTransits();
    IReadOnlyList<AdminUser> GetUsers();
    IReadOnlyList<ShippingCompany> GetCompanies();
    IReadOnlyList<UserInvoiceRecord> GetInvoices();
    IReadOnlyList<LedgerEntryRecord> GetLedgerEntries();
    IReadOnlyList<OfficeExpenseRecord> GetOfficeExpenses();
    IReadOnlyList<ExpenseBudgetRecord> GetExpenseBudgets();
    IReadOnlyList<RecurringExpenseRecord> GetRecurringExpenses();
    IReadOnlyList<LedgerTransferRecord> GetLedgerTransfers();
    IReadOnlyList<PartnerPortalRecord> GetPartnerPortals();
    IReadOnlyList<GatePassRequest> GetGatePassRequests();
    IReadOnlyList<BankTransactionRecord> GetBankTransactions();
    IReadOnlyList<ExchangeRateRecord> GetExchangeRates();
    IReadOnlyList<CarrierPriceQuote> GetCarrierQuotes();
    IReadOnlyList<QualityCheckRecord> GetQualityChecks();
    IReadOnlyList<TrackingDiagnosticRecord> GetTrackingDiagnostics();
    IReadOnlyList<AiInteractionRecord> GetAiInteractions();
    IReadOnlyList<VoiceCallLogRecord> GetVoiceCallLogs();
    IReadOnlyList<CommunicationDispatchRecord> GetCommunicationDispatches();
    IReadOnlyList<AdminNotificationItem> GetNotifications();

    DashboardStats GetDashboardStats();
    NavBadges GetNavBadges();
    IReadOnlyList<ExceptionAlertItem> GetExceptionAlerts();

    // Shipment Operations
    void AddShipment(Shipment shipment);
    void UpdateShipmentSimpleStatus(string shipmentId, ShipmentSimpleStatus newStatus);
    void UpdateShipmentStatus(string trackingNumber, ShipmentStatus newStatus);
    void AssignShipmentToContainer(string shipmentId, string containerId);
    void IssueReleaseToken(string shipmentId);

    // Container Operations
    void AddContainer(ContainerRecord container);
    void UpdateContainerStatus(string containerId, ContainerLifecycleStatus newStatus);

    // Dispatch & Transit Operations
    void AddDispatch(DispatchRecord dispatch);
    void UpdateDispatchStatus(string dispatchId, DispatchStatus newStatus);
    void AddTransit(TransitRecord transit);
    void UpdateTransitStatus(string transitId, TransitStatus newStatus, string? receiverName = null);

    // Gate Pass Operations
    void RequestGatePass(string shipmentId);
    void CompleteGatePass(string gatePassId);

    // Finance, Banking & Invoice Operations
    UserInvoiceRecord GenerateInvoiceForShipment(string shipmentId);
    void RecordInvoicePayment(string invoiceId, decimal amount, string method);
    void MarkInvoiceOverdue(string invoiceId);
    void AddLedgerEntry(string userId, string description, LedgerEntryType type, decimal amount, string infoType);
    void AddOfficeExpense(OfficeExpenseRecord expense);
    void AddRecurringExpense(RecurringExpenseRecord recurring);
    int RunDueRecurringExpenses();
    void AddLedgerTransfer(LedgerTransferType type, string sourceName, string destName, decimal amount, string reference);
    int ImportBankCsv(string csvContent);
    void ReconcileBankTransaction(string bankTxnId, string invoiceNumber);
    void UpdateExchangeRate(string currency, decimal rateFromUsd);

    // Inspections, Diagnostics, AI & Comms
    void AddQualityCheck(QualityCheckRecord check);
    TrackingDiagnosticRecord RunTrackingSync(string containerNumber);
    void AddAiInteraction(AiInteractionRecord log);
    void AddCommunicationDispatch(CommunicationDispatchRecord dispatch);
    void AddNotification(string title, string description, string type = "INFO");
    void MarkAllNotificationsRead();

    // Users & Partner Portals
    void AddUser(AdminUser user);
    void UpdateUserRole(string userId, string newRole);
    void UpdateUserCollectionStatus(string userId, CollectionStatus status);
    string RegenerateUserLoginCode(string userId);
    void AddPartnerPortal(PartnerPortalRecord portal);
    void TogglePartnerPortalActive(string portalId);

    // MCP, Call Agent & Profile
    McpServerConfig GetMcpConfig();
    void SaveMcpConfig(McpServerConfig config);
    string RegenerateMcpApiKey();
    CallAgentConfigModel GetCallAgentConfig();
    void SaveCallAgentConfig(CallAgentConfigModel config);
    void UpdateCurrentAdminProfile(string name, string phone, string address, string city, string country);

    // Cloud Hydration, Persistence & Backup
    int MergeCloudPayload(CloudSyncPayload payload);
    string ExportSnapshotJson();
    void ResetToDemoData();
    void SaveState();
}
