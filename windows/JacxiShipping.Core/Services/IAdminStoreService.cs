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
    IReadOnlyList<LedgerTransferRecord> GetLedgerTransfers();
    IReadOnlyList<PartnerPortalRecord> GetPartnerPortals();
    IReadOnlyList<GatePassRequest> GetGatePassRequests();

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

    // Finance & Invoice Operations
    UserInvoiceRecord GenerateInvoiceForShipment(string shipmentId);
    void RecordInvoicePayment(string invoiceId, decimal amount, string method);
    void MarkInvoiceOverdue(string invoiceId);
    void AddLedgerEntry(string userId, string description, LedgerEntryType type, decimal amount, string infoType);
    void AddOfficeExpense(OfficeExpenseRecord expense);
    void AddLedgerTransfer(LedgerTransferType type, string sourceName, string destName, decimal amount, string reference);

    // Users & Partner Portals
    void AddUser(AdminUser user);
    void UpdateUserRole(string userId, string newRole);
    void UpdateUserCollectionStatus(string userId, CollectionStatus status);
    string RegenerateUserLoginCode(string userId);
    void AddPartnerPortal(PartnerPortalRecord portal);
    void TogglePartnerPortalActive(string portalId);

    // Persistence & Backup
    string ExportSnapshotJson();
    void ResetToDemoData();
    void SaveState();
}
