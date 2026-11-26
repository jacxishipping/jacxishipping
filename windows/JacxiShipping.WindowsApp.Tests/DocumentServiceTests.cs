using JacxiShipping.WindowsApp.Models;
using JacxiShipping.WindowsApp.Services;
using Xunit;

namespace JacxiShipping.WindowsApp.Tests;

public class DocumentServiceTests
{
    [Fact]
    public void GenerateBillOfLading_CreatesValidDocumentItem()
    {
        var docService = new DocumentService();
        var shipment = new Shipment
        {
            TrackingNumber = "JCX-2601-TEST1",
            ContainerNumber = "MSCU9991112",
            CustomerName = "Orient Express Logistics"
        };

        var doc = docService.GenerateBillOfLading(shipment);

        Assert.NotNull(doc);
        Assert.Equal("Bill of Lading", doc.Type);
        Assert.Equal("JCX-2601-TEST1", doc.TrackingNumber);
        Assert.Contains("Orient Express Logistics", doc.Title);
    }

    [Fact]
    public void ExportDocumentText_ContainsOfficialManifestHeader()
    {
        var docService = new DocumentService();
        var shipment = new Shipment
        {
            TrackingNumber = "JCX-2601-88491",
            ContainerNumber = "MSCU7829104",
            CustomerName = "Tariq Logistics Ltd",
            OriginPort = "Port of Newark, NJ",
            DestinationPort = "Port of Mersin, Turkey",
            Vehicle = new VehicleInspection
            {
                Vin = "1HGCR2F83HA029184",
                Make = "Toyota",
                Model = "RAV4",
                Year = 2023
            }
        };
        var doc = docService.GenerateBillOfLading(shipment);
        var text = docService.ExportDocumentText(doc, shipment);

        Assert.Contains("JACXI SHIPPING LLC", text);
        Assert.Contains("JCX-2601-88491", text);
        Assert.Contains("1HGCR2F83HA029184", text);
        Assert.Contains("Port of Mersin, Turkey", text);
    }
}
