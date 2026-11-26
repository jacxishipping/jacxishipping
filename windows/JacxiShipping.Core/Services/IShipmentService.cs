using JacxiShipping.WindowsApp.Models;

namespace JacxiShipping.WindowsApp.Services;

public interface IShipmentService
{
    IReadOnlyList<Shipment> GetAllShipments();
    IEnumerable<Shipment> SearchShipments(string? query, ShipmentStatus? statusFilter);
    Shipment? GetByTrackingNumber(string trackingNumber);
    Shipment? GetByVin(string vin);
    void AddShipment(Shipment shipment);
    void UpdateStatus(string trackingNumber, ShipmentStatus newStatus);
    DashboardStats GetDashboardStats();
}
