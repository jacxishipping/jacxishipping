using JacxiShipping.WindowsApp.Models;

namespace JacxiShipping.WindowsApp.Services;

public interface IDocumentService
{
    IReadOnlyList<DocumentItem> GetAllDocuments();
    DocumentItem GenerateBillOfLading(Shipment shipment);
    DocumentItem GenerateDockReceipt(Shipment shipment);
    DocumentItem GenerateInspectionReport(Shipment shipment);
    string ExportDocumentText(DocumentItem doc, Shipment? shipment);
}
