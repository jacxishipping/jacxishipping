namespace JacxiShipping.WindowsApp.Models;

public class Shipment
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N")[..12].ToUpperInvariant();
    public string TrackingNumber { get; set; } = string.Empty;
    public string ContainerNumber { get; set; } = string.Empty;
    public string? ContainerId { get; set; }
    public string? DispatchId { get; set; }
    public string? TransitId { get; set; }
    public string UserId { get; set; } = "usr-001";

    public ServiceType ServiceType { get; set; } = ServiceType.SHIPPING_ONLY;
    public ShipmentSimpleStatus SimpleStatus { get; set; } = ShipmentSimpleStatus.ON_HAND;

    public string BookingDate { get; set; } = DateTime.UtcNow.ToString("yyyy-MM-dd");
    public string EstimatedDelivery { get; set; } = DateTime.UtcNow.AddDays(28).ToString("yyyy-MM-dd");

    public string OriginPort { get; set; } = "Port of Newark, NJ";
    public string DestinationPort { get; set; } = "Port of Mersin, Turkey";
    public ShipmentStatus Status { get; set; } = ShipmentStatus.Booked;
    public PaymentStatus PaymentStatus { get; set; } = PaymentStatus.PENDING;

    public string CustomerName { get; set; } = string.Empty;
    public string CustomerEmail { get; set; } = string.Empty;
    public string CustomerPhone { get; set; } = string.Empty;

    public VehicleInspection Vehicle { get; set; } = new();

    public string VesselName { get; set; } = "MSC MEDITERRANEAN V";
    public string VoyageNumber { get; set; } = "TX2026-B";

    // Financial breakdown aligned with online Prisma model
    public decimal? PurchasePrice { get; set; }
    public decimal OceanFreightCost { get; set; } = 1450m;
    public decimal InlandTowingCost { get; set; } = 350m;
    public decimal DocumentationFee { get; set; } = 150m;
    public decimal CompanyShippingFare { get; set; } = 1520m;
    public decimal DamageCost { get; set; }
    public decimal DamageCredit { get; set; }
    public decimal TotalCost => OceanFreightCost + InlandTowingCost + DocumentationFee + (PurchasePrice ?? 0m) - DamageCredit;
    public decimal GrossMargin => (OceanFreightCost + InlandTowingCost + DocumentationFee) - CompanyShippingFare - DamageCost;

    public string TotalCostFormatted => $"${TotalCost:N0}";
    public string GrossMarginFormatted => $"${GrossMargin:N0}";

    // Gate Pass & Release Token
    public string? ReleaseToken { get; set; }
    public bool CompanyGatePassRequested { get; set; }
    public string? CompanyGatePassRequestedAt { get; set; }
    public string? CompanyGatePassCompletedAt { get; set; }

    public string StatusDisplayText => Status switch
    {
        ShipmentStatus.Booked => "Booked",
        ShipmentStatus.VehicleReceived => "Vehicle Received",
        ShipmentStatus.ContainerLoaded => "Container Loaded",
        ShipmentStatus.InTransit => "In Transit",
        ShipmentStatus.CustomsHold => "Customs Hold",
        ShipmentStatus.CustomsCleared => "Customs Cleared",
        ShipmentStatus.Delivered => "Delivered",
        _ => Status.ToString()
    };

    public string SimpleStatusLabel => SimpleStatus switch
    {
        ShipmentSimpleStatus.ON_HAND => "On Hand (Yard/Terminal)",
        ShipmentSimpleStatus.DISPATCHING => "Dispatching",
        ShipmentSimpleStatus.IN_TRANSIT => "Ocean Transit",
        ShipmentSimpleStatus.RELEASED => "Released at Port",
        ShipmentSimpleStatus.IN_TRANSIT_TO_DESTINATION => "Inland Transit",
        ShipmentSimpleStatus.DELIVERED => "Delivered",
        _ => SimpleStatus.ToString()
    };

    public string ServiceTypeLabel => ServiceType == ServiceType.PURCHASE_AND_SHIPPING
        ? "Purchase + Shipping"
        : "Shipping Only";

    public List<ShipmentMilestone> Milestones { get; set; } = new();
    public string Notes { get; set; } = string.Empty;
}
