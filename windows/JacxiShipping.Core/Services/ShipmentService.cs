using JacxiShipping.WindowsApp.Models;

namespace JacxiShipping.WindowsApp.Services;

public class ShipmentService : IShipmentService
{
    private readonly List<Shipment> _shipments = new();

    public ShipmentService()
    {
        SeedInitialData();
    }

    public IReadOnlyList<Shipment> GetAllShipments()
    {
        lock (_shipments)
        {
            return _shipments.ToList();
        }
    }

    public IEnumerable<Shipment> SearchShipments(string? query, ShipmentStatus? statusFilter)
    {
        lock (_shipments)
        {
            var results = _shipments.AsEnumerable();

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
    }

    public Shipment? GetByTrackingNumber(string trackingNumber)
    {
        if (string.IsNullOrWhiteSpace(trackingNumber)) return null;
        lock (_shipments)
        {
            var q = trackingNumber.Trim().ToLowerInvariant();
            return _shipments.FirstOrDefault(s => s.TrackingNumber.ToLowerInvariant() == q);
        }
    }

    public Shipment? GetByVin(string vin)
    {
        if (string.IsNullOrWhiteSpace(vin)) return null;
        lock (_shipments)
        {
            var q = vin.Trim().ToLowerInvariant();
            return _shipments.FirstOrDefault(s => s.Vehicle.Vin.ToLowerInvariant() == q);
        }
    }

    public void AddShipment(Shipment shipment)
    {
        lock (_shipments)
        {
            if (string.IsNullOrWhiteSpace(shipment.TrackingNumber))
            {
                shipment.TrackingNumber = $"JCX-{DateTime.UtcNow:yyMM}-{Random.Shared.Next(10000, 99999)}";
            }
            if (string.IsNullOrWhiteSpace(shipment.ContainerNumber))
            {
                shipment.ContainerNumber = $"MSCU{Random.Shared.Next(1000000, 9999999)}";
            }
            if (shipment.Milestones.Count == 0)
            {
                shipment.Milestones = GenerateDefaultMilestones(shipment);
            }
            _shipments.Insert(0, shipment);
        }
    }

    public void UpdateStatus(string trackingNumber, ShipmentStatus newStatus)
    {
        lock (_shipments)
        {
            var s = _shipments.FirstOrDefault(x => x.TrackingNumber == trackingNumber);
            if (s != null)
            {
                s.Status = newStatus;
                UpdateMilestoneProgress(s);
            }
        }
    }

    public DashboardStats GetDashboardStats()
    {
        lock (_shipments)
        {
            return new DashboardStats
            {
                TotalShipments = _shipments.Count,
                ActiveInTransit = _shipments.Count(s => s.Status == ShipmentStatus.InTransit),
                CustomsPending = _shipments.Count(s => s.Status == ShipmentStatus.CustomsHold),
                DeliveredMonth = _shipments.Count(s => s.Status == ShipmentStatus.Delivered),
                TotalRevenue = _shipments.Sum(s => s.TotalCost)
            };
        }
    }

    private void UpdateMilestoneProgress(Shipment s)
    {
        var targetIndex = s.Status switch
        {
            ShipmentStatus.Booked => 0,
            ShipmentStatus.VehicleReceived => 1,
            ShipmentStatus.ContainerLoaded => 2,
            ShipmentStatus.InTransit => 3,
            ShipmentStatus.CustomsHold => 4,
            ShipmentStatus.CustomsCleared => 4,
            ShipmentStatus.Delivered => 5,
            _ => 0
        };

        for (int i = 0; i < s.Milestones.Count; i++)
        {
            s.Milestones[i].IsCompleted = i < targetIndex || (i == targetIndex && s.Status == ShipmentStatus.Delivered);
            s.Milestones[i].IsCurrent = i == targetIndex && s.Status != ShipmentStatus.Delivered;
        }
    }

    private static List<ShipmentMilestone> GenerateDefaultMilestones(Shipment s)
    {
        return new List<ShipmentMilestone>
        {
            new("Booking Confirmed", s.OriginPort, DateTime.UtcNow.AddDays(-10).ToString("yyyy-MM-dd HH:mm"), true, false, "Shipment file opened and space booked."),
            new("Vehicle Received at Terminal", $"{s.OriginPort} Yard", DateTime.UtcNow.AddDays(-7).ToString("yyyy-MM-dd HH:mm"), true, false, "Vehicle inspected and condition report uploaded."),
            new("Loaded in Container", s.ContainerNumber, DateTime.UtcNow.AddDays(-4).ToString("yyyy-MM-dd HH:mm"), true, false, "Secured and sealed with High-Security Bolt Seal."),
            new("Ocean Transit", s.VesselName, DateTime.UtcNow.AddDays(-1).ToString("yyyy-MM-dd HH:mm"), false, true, "Vessel underway across the Atlantic / Mediterranean."),
            new("Customs Clearance", s.DestinationPort, "Estimated " + DateTime.UtcNow.AddDays(14).ToString("yyyy-MM-dd"), false, false, "Documentation packet queued for customs broker."),
            new("Final Delivery", $"{s.DestinationPort} Terminal", "Estimated " + DateTime.UtcNow.AddDays(18).ToString("yyyy-MM-dd"), false, false, "Consignee handover and release token dispatch.")
        };
    }

    private void SeedInitialData()
    {
        _shipments.AddRange(new[]
        {
            new Shipment
            {
                TrackingNumber = "JCX-2601-88491",
                ContainerNumber = "MSCU7829104",
                BookingDate = "2026-11-12",
                EstimatedDelivery = "2026-12-10",
                OriginPort = "Port of Newark, NJ",
                DestinationPort = "Port of Mersin, Turkey",
                Status = ShipmentStatus.InTransit,
                CustomerName = "Tariq Logistics Ltd",
                CustomerPhone = "+90 532 994 1283",
                OceanFreightCost = 1450m,
                InlandTowingCost = 400m,
                DocumentationFee = 150m,
                VesselName = "MSC MEDITERRANEAN V",
                VoyageNumber = "TX2026-B",
                Vehicle = new VehicleInspection
                {
                    Vin = "1HGCR2F83HA029184",
                    Year = 2023,
                    Make = "Toyota",
                    Model = "RAV4 XLE AWD",
                    LotNumber = "54889576",
                    AuctionYard = "Copart North Boston, MA",
                    RunsAndDrives = true,
                    HasKeys = true,
                    TitleStatus = "Clean Export Title",
                    ConditionNotes = "Clean run & drive. Front bumper scuff. High battery health.",
                    PhotoCount = 16
                },
                Milestones = new List<ShipmentMilestone>
                {
                    new("Booking Confirmed", "Port of Newark, NJ", "2026-11-12 09:30", true, false, "Booking generated and customs file created."),
                    new("Vehicle Received at Terminal", "Newark Terminal Yard 4", "2026-11-15 14:10", true, false, "Vehicle unloaded and condition verified. 16 photos logged."),
                    new("Loaded in Container", "Container MSCU7829104", "2026-11-18 11:45", true, false, "Chocked, strapped, and sealed. Seal #JCX-99401."),
                    new("Ocean Transit", "MSC MEDITERRANEAN V", "2026-11-20 06:00", false, true, "Vessel departed Port of Newark. Currently in mid-Atlantic."),
                    new("Customs Clearance", "Port of Mersin, Turkey", "Est. 2026-12-05", false, false, "Manifest forwarded to Mersin Port Authority."),
                    new("Final Delivery", "Mersin Free Zone Yard B", "Est. 2026-12-10", false, false, "Consignee release upon token verification.")
                }
            },
            new Shipment
            {
                TrackingNumber = "JCX-2601-72940",
                ContainerNumber = "CMAU4920193",
                BookingDate = "2026-11-05",
                EstimatedDelivery = "2026-12-02",
                OriginPort = "Port of Houston, TX",
                DestinationPort = "Jebel Ali Port, Dubai, UAE",
                Status = ShipmentStatus.CustomsHold,
                CustomerName = "Al-Nour Auto Trading",
                CustomerPhone = "+971 4 883 9102",
                OceanFreightCost = 1350m,
                InlandTowingCost = 350m,
                DocumentationFee = 150m,
                VesselName = "CMA CGM ANTOINE",
                VoyageNumber = "UAE441-X",
                Vehicle = new VehicleInspection
                {
                    Vin = "4T1B11HK5JU773910",
                    Year = 2024,
                    Make = "Lexus",
                    Model = "RX 350 Luxury",
                    LotNumber = "61902844",
                    AuctionYard = "Copart Dallas, TX",
                    RunsAndDrives = true,
                    HasKeys = true,
                    TitleStatus = "Pending Title Validation",
                    ConditionNotes = "Awaiting physical title original from Texas DMV for customs release.",
                    PhotoCount = 20
                },
                Milestones = new List<ShipmentMilestone>
                {
                    new("Booking Confirmed", "Port of Houston, TX", "2026-11-05 10:00", true, false, "File opened."),
                    new("Vehicle Received at Terminal", "Houston Bay Terminal", "2026-11-08 16:30", true, false, "Inspection complete."),
                    new("Loaded in Container", "Container CMAU4920193", "2026-11-11 13:00", true, false, "Loading manifest signed."),
                    new("Ocean Transit", "CMA CGM ANTOINE", "2026-11-13 08:00", true, false, "Arrived at Jebel Ali outer anchorage."),
                    new("Customs Clearance", "Jebel Ali Customs Gate 3", "2026-11-25 15:00", false, true, "Title certificate requested by customs inspector."),
                    new("Final Delivery", "Dubai Auto Zone Yard 7", "Est. 2026-12-02", false, false, "Ready for gate pickup after clearance.")
                }
            },
            new Shipment
            {
                TrackingNumber = "JCX-2601-93012",
                ContainerNumber = "HLXU9182746",
                BookingDate = "2026-10-22",
                EstimatedDelivery = "2026-11-24",
                OriginPort = "Port of Savannah, GA",
                DestinationPort = "Port of Poti, Georgia",
                Status = ShipmentStatus.Delivered,
                CustomerName = "Caucasus Motor Group",
                CustomerPhone = "+995 32 291 0044",
                OceanFreightCost = 1550m,
                InlandTowingCost = 450m,
                DocumentationFee = 150m,
                VesselName = "HAPAG-LLOYD EXPRESS",
                VoyageNumber = "GE2026-09",
                Vehicle = new VehicleInspection
                {
                    Vin = "WAUZZZF27NA019283",
                    Year = 2022,
                    Make = "Audi",
                    Model = "Q5 45 TFSI Quattro",
                    LotNumber = "49018273",
                    AuctionYard = "IAAI Atlanta, GA",
                    RunsAndDrives = true,
                    HasKeys = true,
                    TitleStatus = "Clean Export Title",
                    ConditionNotes = "Complete run & drive. Released to customer with signed delivery receipt.",
                    PhotoCount = 18
                },
                Milestones = new List<ShipmentMilestone>
                {
                    new("Booking Confirmed", "Port of Savannah, GA", "2026-10-22 11:00", true, false, "Booking completed."),
                    new("Vehicle Received at Terminal", "Savannah Ocean Terminal", "2026-10-25 09:00", true, false, "Received and checked."),
                    new("Loaded in Container", "Container HLXU9182746", "2026-10-28 14:00", true, false, "Loaded in 40ft High Cube."),
                    new("Ocean Transit", "HAPAG-LLOYD EXPRESS", "2026-10-31 18:00", true, false, "Discharged at Poti Sea Port."),
                    new("Customs Clearance", "Poti Customs Zone", "2026-11-20 10:00", true, false, "Customs duties cleared."),
                    new("Final Delivery", "Poti Terminal B", "2026-11-24 16:30", true, false, "Consignee received vehicle. Signed BOL.")
                }
            },
            new Shipment
            {
                TrackingNumber = "JCX-2601-51289",
                ContainerNumber = "MSCU3019281",
                BookingDate = "2026-11-22",
                EstimatedDelivery = "2026-12-28",
                OriginPort = "Port of Los Angeles, CA",
                DestinationPort = "Hairatan Border, Afghanistan",
                Status = ShipmentStatus.Booked,
                CustomerName = "Ariana Transit Services",
                CustomerPhone = "+93 70 029 8831",
                OceanFreightCost = 2100m,
                InlandTowingCost = 650m,
                DocumentationFee = 200m,
                VesselName = "EVER GIVEN II",
                VoyageNumber = "AFG-PACIFIC-11",
                Vehicle = new VehicleInspection
                {
                    Vin = "5UXCR6C04N9G20194",
                    Year = 2023,
                    Make = "BMW",
                    Model = "X5 xDrive40i",
                    LotNumber = "77291045",
                    AuctionYard = "Copart Los Angeles, CA",
                    RunsAndDrives = true,
                    HasKeys = true,
                    TitleStatus = "Clean Certificate of Title",
                    ConditionNotes = "Awaiting terminal arrival from Copart LA yard. Dispatch driver assigned.",
                    PhotoCount = 8
                },
                Milestones = new List<ShipmentMilestone>
                {
                    new("Booking Confirmed", "Port of Los Angeles, CA", "2026-11-22 08:30", true, false, "Booking confirmed with shipping line."),
                    new("Vehicle Dispatch & Towing", "Copart Los Angeles Yard", "In Progress", false, true, "Flatbed dispatched for yard pickup."),
                    new("Loaded in Container", "LA Pier 400", "Pending Arrival", false, false, "Scheduled for loading in 40ft container."),
                    new("Ocean & Rail Transit", "EVER GIVEN II / Rail via Bandar Abbas", "Est. 2026-12-02", false, false, "Multimodal maritime and rail leg."),
                    new("Customs Clearance", "Hairatan Border Post", "Est. 2026-12-22", false, false, "Afghan Customs clearance."),
                    new("Final Delivery", "Hairatan Inland Port", "Est. 2026-12-28", false, false, "Release to consignee.")
                }
            },
            new Shipment
            {
                TrackingNumber = "JCX-2601-64819",
                ContainerNumber = "ONEU8819203",
                BookingDate = "2026-11-19",
                EstimatedDelivery = "2026-12-22",
                OriginPort = "Port of Newark, NJ",
                DestinationPort = "Islam Qala Border, Afghanistan",
                Status = ShipmentStatus.ContainerLoaded,
                CustomerName = "Khorasan Transport Co.",
                CustomerPhone = "+93 79 912 3456",
                OceanFreightCost = 2250m,
                InlandTowingCost = 400m,
                DocumentationFee = 200m,
                VesselName = "ONE INTEGRITY",
                VoyageNumber = "ONE-084E",
                Vehicle = new VehicleInspection
                {
                    Vin = "3FA6P0HD8LR192840",
                    Year = 2021,
                    Make = "Ford",
                    Model = "Fusion Titanium AWD",
                    LotNumber = "58190284",
                    AuctionYard = "Copart Hartford, CT",
                    RunsAndDrives = true,
                    HasKeys = true,
                    TitleStatus = "Salvage Certificate (Export Allowed)",
                    ConditionNotes = "Right quarter panel damage. Key present. Starts and drives.",
                    PhotoCount = 14
                },
                Milestones = new List<ShipmentMilestone>
                {
                    new("Booking Confirmed", "Port of Newark, NJ", "2026-11-19 14:00", true, false, "Booking generated."),
                    new("Vehicle Received at Terminal", "Newark Terminal Yard 2", "2026-11-21 11:20", true, false, "Vehicle unloaded and staged."),
                    new("Loaded in Container", "Container ONEU8819203", "2026-11-24 16:00", true, false, "Loaded and sealed with bolt seal #JCX-88192."),
                    new("Ocean Transit", "ONE INTEGRITY", "Est. 2026-11-28", false, true, "Awaiting vessel boarding at Newark Berth 12."),
                    new("Customs Clearance", "Islam Qala Terminal", "Est. 2026-12-18", false, false, "Border transit documentation prepared."),
                    new("Final Delivery", "Islam Qala Customs Yard", "Est. 2026-12-22", false, false, "Direct handover to owner.")
                }
            }
        });
    }
}
