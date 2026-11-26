namespace JacxiShipping.WindowsApp.Models;

public enum ShipmentStatus
{
    Booked,
    VehicleReceived,
    ContainerLoaded,
    InTransit,
    CustomsHold,
    CustomsCleared,
    Delivered
}

public enum ShipmentSimpleStatus
{
    ON_HAND,
    DISPATCHING,
    IN_TRANSIT,
    RELEASED,
    IN_TRANSIT_TO_DESTINATION,
    DELIVERED
}

public enum ServiceType
{
    SHIPPING_ONLY,
    PURCHASE_AND_SHIPPING
}

public enum VehicleTitleStatus
{
    PENDING,
    DELIVERED
}

public enum PaymentStatus
{
    PENDING,
    PROCESSING,
    COMPLETED,
    FAILED,
    REFUNDED,
    PARTIALLY_REFUNDED
}

public enum ContainerLifecycleStatus
{
    CREATED,
    WAITING_FOR_LOADING,
    LOADED,
    IN_TRANSIT,
    ARRIVED_PORT,
    CUSTOMS_CLEARANCE,
    RELEASED,
    CLOSED
}

public enum DispatchStatus
{
    PENDING,
    DISPATCHED,
    ARRIVED_AT_PORT,
    COMPLETED,
    CANCELLED
}

public enum TransitStatus
{
    PENDING,
    DISPATCHED,
    IN_TRANSIT,
    ARRIVED,
    DELIVERED,
    CANCELLED
}

public enum UserInvoiceStatus
{
    DRAFT,
    PENDING,
    SENT,
    PARTIALLY_PAID,
    OVERDUE,
    PAID,
    VOID
}

public enum CollectionStatus
{
    CURRENT,
    FOLLOW_UP,
    PROMISED_TO_PAY,
    IN_COLLECTIONS,
    ESCALATED,
    ON_HOLD
}

public enum LedgerEntryType
{
    DEBIT,
    CREDIT
}

public enum OfficeExpenseCategory
{
    RENT,
    UTILITIES,
    SALARIES_PAYROLL,
    OFFICE_SUPPLIES,
    SOFTWARE_SUBSCRIPTIONS,
    TRAVEL_TRANSPORT,
    MAINTENANCE_REPAIRS,
    COMMUNICATION_INTERNET,
    BANK_FEES,
    OTHER
}

public enum LedgerTransferType
{
    USER_TO_USER,
    USER_TO_COMPANY,
    COMPANY_TO_USER,
    COMPANY_TO_COMPANY
}
