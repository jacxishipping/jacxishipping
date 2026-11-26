using System.Collections.ObjectModel;
using JacxiShipping.WindowsApp.Models;
using JacxiShipping.WindowsApp.Services;

namespace JacxiShipping.WindowsApp.ViewModels;

public class DocumentsViewModel : ViewModelBase
{
    private readonly IDocumentService _documentService;
    private readonly IShipmentService _shipmentService;
    private readonly IAdminStoreService? _store;
    private readonly IPdfExportService _pdfService;
    private DocumentItem? _selectedDocument;
    private string _previewText = string.Empty;
    private string _statusNotice = string.Empty;
    private string _lastExportedFilePath = string.Empty;

    public ObservableCollection<DocumentItem> Documents { get; } = new();

    public DocumentItem? SelectedDocument
    {
        get => _selectedDocument;
        set
        {
            if (SetProperty(ref _selectedDocument, value))
            {
                UpdatePreview();
            }
        }
    }

    public string PreviewText { get => _previewText; set => SetProperty(ref _previewText, value); }
    public string StatusNotice { get => _statusNotice; set => SetProperty(ref _statusNotice, value); }
    public string LastExportedFilePath { get => _lastExportedFilePath; set => SetProperty(ref _lastExportedFilePath, value); }

    public RelayCommand RefreshCommand { get; }
    public RelayCommand ExportTextCommand { get; }
    public RelayCommand ExportInvoicePdfCommand { get; }
    public RelayCommand ExportReleaseTokenPdfCommand { get; }
    public RelayCommand ExportCustomsPacketPdfCommand { get; }
    public RelayCommand ExportStatementPdfCommand { get; }

    public DocumentsViewModel(IDocumentService documentService, IShipmentService shipmentService)
        : this(documentService, shipmentService, null, new PdfExportService())
    {
    }

    public DocumentsViewModel(IDocumentService documentService, IShipmentService shipmentService, IAdminStoreService? store, IPdfExportService pdfService)
    {
        _documentService = documentService;
        _shipmentService = shipmentService;
        _store = store;
        _pdfService = pdfService;

        RefreshCommand = new RelayCommand(LoadDocuments);
        ExportTextCommand = new RelayCommand(() =>
        {
            if (SelectedDocument != null)
            {
                StatusNotice = $"Document {SelectedDocument.DocumentId} ready for print / export.";
            }
        });

        ExportInvoicePdfCommand = new RelayCommand(() =>
        {
            var inv = _store?.GetInvoices().FirstOrDefault();
            if (inv == null) { StatusNotice = "No invoice available to export."; return; }
            var cust = _store?.GetUsers().FirstOrDefault(u => u.Id == inv.UserId);
            var outPath = GetExportPath($"Invoice_{inv.InvoiceNumber}.pdf");
            _pdfService.GenerateInvoicePdf(inv, cust, outPath);
            LastExportedFilePath = outPath;
            StatusNotice = $"✓ Generated Branded Invoice PDF: {Path.GetFileName(outPath)}";
        });

        ExportReleaseTokenPdfCommand = new RelayCommand(() =>
        {
            var shp = ResolveTargetShipment();
            if (shp == null) return;
            var outPath = GetExportPath($"ReleaseToken_{shp.TrackingNumber}.pdf");
            _pdfService.GenerateReleaseTokenPdf(shp, outPath);
            LastExportedFilePath = outPath;
            StatusNotice = $"✓ Generated Release Token PDF: {Path.GetFileName(outPath)}";
        });

        ExportCustomsPacketPdfCommand = new RelayCommand(() =>
        {
            var shp = ResolveTargetShipment();
            if (shp == null) return;
            var cnt = _store?.GetContainers().FirstOrDefault(c => c.Id == shp.ContainerId || c.ContainerNumber == shp.ContainerNumber);
            var outPath = GetExportPath($"CustomsPacket_{shp.TrackingNumber}.pdf");
            _pdfService.GenerateCustomsPacketPdf(shp, cnt, outPath);
            LastExportedFilePath = outPath;
            StatusNotice = $"✓ Generated Customs Packet PDF: {Path.GetFileName(outPath)}";
        });

        ExportStatementPdfCommand = new RelayCommand(() =>
        {
            var cust = _store?.GetUsers().FirstOrDefault(u => u.Role == "user");
            if (cust == null || _store == null) return;
            var entries = _store.GetLedgerEntries().Where(e => e.UserId == cust.Id);
            var outPath = GetExportPath($"Statement_{cust.LoginCode}.pdf");
            _pdfService.GenerateCustomerStatementPdf(cust, entries, outPath);
            LastExportedFilePath = outPath;
            StatusNotice = $"✓ Generated Customer Statement PDF: {Path.GetFileName(outPath)}";
        });

        LoadDocuments();
        SelectedDocument = Documents.FirstOrDefault();
    }

    public void LoadDocuments()
    {
        Documents.Clear();
        foreach (var doc in _documentService.GetAllDocuments())
        {
            Documents.Add(doc);
        }
    }

    private Shipment? ResolveTargetShipment()
    {
        if (SelectedDocument != null)
        {
            var found = _shipmentService.GetByTrackingNumber(SelectedDocument.TrackingNumber);
            if (found != null) return found;
        }
        return _shipmentService.GetAllShipments().FirstOrDefault();
    }

    private static string GetExportPath(string filename)
    {
        var docs = Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments);
        if (string.IsNullOrWhiteSpace(docs)) docs = Path.GetTempPath();
        return Path.Combine(docs, "JacxiShipping", "Exports", filename);
    }

    private void UpdatePreview()
    {
        if (SelectedDocument == null)
        {
            PreviewText = "Select a document from the left to view official maritime manifest details.";
            return;
        }

        var shipment = _shipmentService.GetByTrackingNumber(SelectedDocument.TrackingNumber);
        PreviewText = _documentService.ExportDocumentText(SelectedDocument, shipment);
    }
}
