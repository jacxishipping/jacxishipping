using System.Text;
using JacxiShipping.WindowsApp.Models;

namespace JacxiShipping.WindowsApp.Services;

public class DocumentService : IDocumentService
{
    private readonly List<DocumentItem> _documents = new();

    public DocumentService()
    {
        _documents.AddRange(new[]
        {
            new DocumentItem
            {
                DocumentId = "BOL-2601-88491",
                Title = "Ocean Bill of Lading (Original)",
                Type = "Bill of Lading",
                TrackingNumber = "JCX-2601-88491",
                ContainerNumber = "MSCU7829104",
                GeneratedDate = "2026-11-20",
                FileSize = "1.8 MB",
                Status = "Issued & Stamped"
            },
            new DocumentItem
            {
                DocumentId = "DR-2601-88491",
                Title = "Dock Receipt & Port Gate Pass",
                Type = "Dock Receipt",
                TrackingNumber = "JCX-2601-88491",
                ContainerNumber = "MSCU7829104",
                GeneratedDate = "2026-11-15",
                FileSize = "840 KB",
                Status = "Verified"
            },
            new DocumentItem
            {
                DocumentId = "VIR-2601-72940",
                Title = "Vehicle Inspection Condition Report",
                Type = "Inspection Report",
                TrackingNumber = "JCX-2601-72940",
                ContainerNumber = "CMAU4920193",
                GeneratedDate = "2026-11-08",
                FileSize = "3.2 MB",
                Status = "Photos Attached"
            },
            new DocumentItem
            {
                DocumentId = "EXD-2601-93012",
                Title = "AES ITN Customs Export Clearance",
                Type = "Export Declaration",
                TrackingNumber = "JCX-2601-93012",
                ContainerNumber = "HLXU9182746",
                GeneratedDate = "2026-10-27",
                FileSize = "520 KB",
                Status = "Cleared (ITN Approved)"
            }
        });
    }

    public IReadOnlyList<DocumentItem> GetAllDocuments()
    {
        lock (_documents)
        {
            return _documents.ToList();
        }
    }

    public DocumentItem GenerateBillOfLading(Shipment shipment)
    {
        var doc = new DocumentItem
        {
            DocumentId = $"BOL-{shipment.TrackingNumber.Replace("JCX-", "")}",
            Title = $"Ocean Bill of Lading - {shipment.CustomerName}",
            Type = "Bill of Lading",
            TrackingNumber = shipment.TrackingNumber,
            ContainerNumber = shipment.ContainerNumber,
            GeneratedDate = DateTime.UtcNow.ToString("yyyy-MM-dd"),
            FileSize = "1.4 MB",
            Status = "Generated & Validated"
        };
        lock (_documents)
        {
            _documents.Insert(0, doc);
        }
        return doc;
    }

    public DocumentItem GenerateDockReceipt(Shipment shipment)
    {
        var doc = new DocumentItem
        {
            DocumentId = $"DR-{shipment.TrackingNumber.Replace("JCX-", "")}",
            Title = $"Terminal Dock Receipt - {shipment.OriginPort}",
            Type = "Dock Receipt",
            TrackingNumber = shipment.TrackingNumber,
            ContainerNumber = shipment.ContainerNumber,
            GeneratedDate = DateTime.UtcNow.ToString("yyyy-MM-dd"),
            FileSize = "750 KB",
            Status = "Gate Verified"
        };
        lock (_documents)
        {
            _documents.Insert(0, doc);
        }
        return doc;
    }

    public DocumentItem GenerateInspectionReport(Shipment shipment)
    {
        var doc = new DocumentItem
        {
            DocumentId = $"VIR-{shipment.TrackingNumber.Replace("JCX-", "")}",
            Title = $"Vehicle Inspection Report - {shipment.Vehicle.FullDescription}",
            Type = "Inspection Report",
            TrackingNumber = shipment.TrackingNumber,
            ContainerNumber = shipment.ContainerNumber,
            GeneratedDate = DateTime.UtcNow.ToString("yyyy-MM-dd"),
            FileSize = "2.1 MB",
            Status = "Condition Documented"
        };
        lock (_documents)
        {
            _documents.Insert(0, doc);
        }
        return doc;
    }

    public string ExportDocumentText(DocumentItem doc, Shipment? shipment)
    {
        var sb = new StringBuilder();
        sb.AppendLine("================================================================================");
        sb.AppendLine("                    JACXI SHIPPING LLC - OFFICIAL MARITIME MANIFEST             ");
        sb.AppendLine("                    Global Vehicle & Container Freight Logistics               ");
        sb.AppendLine("================================================================================");
        sb.AppendLine($"Document ID    : {doc.DocumentId}");
        sb.AppendLine($"Document Type  : {doc.Type}");
        sb.AppendLine($"Tracking Number: {doc.TrackingNumber}");
        sb.AppendLine($"Container No   : {doc.ContainerNumber}");
        sb.AppendLine($"Issued Date    : {doc.GeneratedDate}");
        sb.AppendLine($"Status         : {doc.Status}");
        sb.AppendLine("--------------------------------------------------------------------------------");

        if (shipment != null)
        {
            sb.AppendLine("SHIPMENT PARTICULARS:");
            sb.AppendLine($"Consignee      : {shipment.CustomerName} ({shipment.CustomerPhone})");
            sb.AppendLine($"Port of Loading: {shipment.OriginPort}");
            sb.AppendLine($"Port of Discharge: {shipment.DestinationPort}");
            sb.AppendLine($"Ocean Carrier  : {shipment.VesselName} (Voyage {shipment.VoyageNumber})");
            sb.AppendLine($"Total Value    : {shipment.TotalCostFormatted}");
            sb.AppendLine("--------------------------------------------------------------------------------");
            sb.AppendLine("VEHICLE PARTICULARS:");
            sb.AppendLine($"VIN            : {shipment.Vehicle.Vin}");
            sb.AppendLine($"Description    : {shipment.Vehicle.FullDescription}");
            sb.AppendLine($"Auction Lot #  : {shipment.Vehicle.LotNumber} ({shipment.Vehicle.AuctionYard})");
            sb.AppendLine($"Title Status   : {shipment.Vehicle.TitleStatus}");
            sb.AppendLine($"Operational    : Runs & Drives: {(shipment.Vehicle.RunsAndDrives ? "YES" : "NO")}, Keys: {(shipment.Vehicle.HasKeys ? "YES" : "NO")}");
            sb.AppendLine($"Condition Notes: {shipment.Vehicle.ConditionNotes}");
        }

        sb.AppendLine("================================================================================");
        sb.AppendLine("Certified true and correct according to maritime freight standard.");
        sb.AppendLine("JACXI Shipping LLC - Dispatch & Customs Operations Terminal.");
        return sb.ToString();
    }
}
