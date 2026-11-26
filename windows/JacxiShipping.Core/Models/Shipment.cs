namespace JacxiShipping.WindowsApp.Models;

public class Shipment
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N")[..8].ToUpperInvariant();
    public string TrackingNumber { get; set; } = string.Empty;
    public string ContainerNumber { get; set; } = string.Empty;
    public string BookingDate { get; set; } = DateTime.UtcNow.ToString("yyyy-MM-dd");
    public string EstimatedDelivery { get; set; } = DateTime.UtcNow.AddDays(28).ToString("yyyy-MM-dd");
    
    public string OriginPort { get; set; } = "Port of Newark, NJ";
    public string DestinationPort { get; set; } = "Port of Mersin, Turkey";
    public ShipmentStatus Status { get; set; } = ShipmentStatus.Booked;

    public string CustomerName { get; set; } = string.Empty;
    public string CustomerPhone { get; set; } = string.Empty;

    public VehicleInspection Vehicle { get; set; } = new();

    public string VesselName { get; set; } = "MSC MEDITERRANEAN V";
    public string VoyageNumber { get; set; } = "TX2026-B";

    public decimal OceanFreightCost { get; set; } = 1450m;
    public decimal InlandTowingCost { get; set; } = 350m;
    public decimal DocumentationFee { get; set; } = 150m;
    public decimal TotalCost => OceanFreightCost + InlandTowingCost + DocumentationFee;

    public string TotalCostFormatted => $"${TotalCost:N0}";

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

    public List<ShipmentMilestone> Milestones { get; set; } = new();
    public string Notes { get; set; } = string.Empty;
}
