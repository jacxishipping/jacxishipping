using JacxiShipping.WindowsApp.Models;
using JacxiShipping.WindowsApp.Services;
using Xunit;

namespace JacxiShipping.WindowsApp.Tests;

public class ShipmentServiceTests
{
    [Fact]
    public void GetAllShipments_ReturnsSeededShipments()
    {
        var service = new ShipmentService();
        var all = service.GetAllShipments();

        Assert.NotEmpty(all);
        Assert.True(all.Count >= 5);
        Assert.Contains(all, s => s.TrackingNumber == "JCX-2601-88491");
    }

    [Fact]
    public void SearchShipments_ByStatus_FiltersAccurately()
    {
        var service = new ShipmentService();
        var inTransit = service.SearchShipments(null, ShipmentStatus.InTransit);

        Assert.NotEmpty(inTransit);
        Assert.All(inTransit, s => Assert.Equal(ShipmentStatus.InTransit, s.Status));
    }

    [Fact]
    public void SearchShipments_ByVin_ReturnsMatchingShipment()
    {
        var service = new ShipmentService();
        var results = service.SearchShipments("1HGCR2F83HA029184", null);

        Assert.Single(results);
        Assert.Equal("JCX-2601-88491", results.First().TrackingNumber);
    }

    [Fact]
    public void AddShipment_GeneratesTrackingNumberAndMilestones()
    {
        var service = new ShipmentService();
        var newShipment = new Shipment
        {
            CustomerName = "Golden Crescent Auto",
            OriginPort = "Port of Houston, TX",
            DestinationPort = "Port of Mersin, Turkey",
            Status = ShipmentStatus.Booked,
            Vehicle = new VehicleInspection
            {
                Vin = "TESTVIN9988776655",
                Year = 2024,
                Make = "Toyota",
                Model = "Camry XSE"
            }
        };

        service.AddShipment(newShipment);

        Assert.False(string.IsNullOrWhiteSpace(newShipment.TrackingNumber));
        Assert.StartsWith("JCX-", newShipment.TrackingNumber);
        Assert.NotEmpty(newShipment.Milestones);
        Assert.Equal(6, newShipment.Milestones.Count);

        var retrieved = service.GetByTrackingNumber(newShipment.TrackingNumber);
        Assert.NotNull(retrieved);
        Assert.Equal("Golden Crescent Auto", retrieved.CustomerName);
    }

    [Fact]
    public void UpdateStatus_AdvancesMilestonesCorrectly()
    {
        var service = new ShipmentService();
        var tracking = "JCX-2601-88491";

        service.UpdateStatus(tracking, ShipmentStatus.Delivered);

        var updated = service.GetByTrackingNumber(tracking);
        Assert.NotNull(updated);
        Assert.Equal(ShipmentStatus.Delivered, updated.Status);
        Assert.All(updated.Milestones, m => Assert.True(m.IsCompleted));
    }

    [Fact]
    public void GetDashboardStats_ReturnsValidAggregates()
    {
        var service = new ShipmentService();
        var stats = service.GetDashboardStats();

        Assert.True(stats.TotalShipments > 0);
        Assert.True(stats.TotalRevenue > 0);
        Assert.True(stats.ActiveInTransit >= 0);
    }
}
