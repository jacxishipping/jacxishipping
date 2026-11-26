using JacxiShipping.WindowsApp.Models;

namespace JacxiShipping.WindowsApp.Services;

public class ShipmentService : IShipmentService
{
    private readonly IAdminStoreService _store;

    public ShipmentService() : this(new AdminStoreService(Path.Combine(Path.GetTempPath(), $"jacxi-test-{Guid.NewGuid():N}.json")))
    {
    }

    public ShipmentService(IAdminStoreService store)
    {
        _store = store;
    }

    public IReadOnlyList<Shipment> GetAllShipments() => _store.GetShipments();

    public IEnumerable<Shipment> SearchShipments(string? query, ShipmentStatus? statusFilter)
    {
        var results = _store.GetShipments().AsEnumerable();

        if (statusFilter.HasValue)
        {
            results = results.Where(s => s.Status == statusFilter.Value);
        }

        if (!string.IsNullOrWhiteSpace(query))
        {
            var q = query.Trim().ToLowerInvariant();
            results = results.Where(s =>
                s.TrackingNumber.ToLowerInvariant().Contains(q) ||
                s.ContainerNumber.ToLowerInvariant().Contains(q) ||
                s.Vehicle.Vin.ToLowerInvariant().Contains(q) ||
                s.CustomerName.ToLowerInvariant().Contains(q) ||
                s.Vehicle.Make.ToLowerInvariant().Contains(q) ||
                s.Vehicle.Model.ToLowerInvariant().Contains(q) ||
                s.DestinationPort.ToLowerInvariant().Contains(q));
        }

        return results.ToList();
    }

    public Shipment? GetByTrackingNumber(string trackingNumber)
    {
        if (string.IsNullOrWhiteSpace(trackingNumber)) return null;
        var q = trackingNumber.Trim().ToLowerInvariant();
        return _store.GetShipments().FirstOrDefault(s => s.TrackingNumber.ToLowerInvariant() == q);
    }

    public Shipment? GetByVin(string vin)
    {
        if (string.IsNullOrWhiteSpace(vin)) return null;
        var q = vin.Trim().ToLowerInvariant();
        return _store.GetShipments().FirstOrDefault(s => s.Vehicle.Vin.ToLowerInvariant() == q);
    }

    public void AddShipment(Shipment shipment) => _store.AddShipment(shipment);

    public void UpdateStatus(string trackingNumber, ShipmentStatus newStatus) => _store.UpdateShipmentStatus(trackingNumber, newStatus);

    public DashboardStats GetDashboardStats() => _store.GetDashboardStats();
}
