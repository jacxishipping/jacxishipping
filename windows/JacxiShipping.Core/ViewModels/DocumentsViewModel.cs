using System.Collections.ObjectModel;
using JacxiShipping.WindowsApp.Models;
using JacxiShipping.WindowsApp.Services;

namespace JacxiShipping.WindowsApp.ViewModels;

public class DocumentsViewModel : ViewModelBase
{
    private readonly IDocumentService _documentService;
    private readonly IShipmentService _shipmentService;
    private DocumentItem? _selectedDocument;
    private string _previewText = string.Empty;
    private string _statusNotice = string.Empty;

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

    public string PreviewText
    {
        get => _previewText;
        set => SetProperty(ref _previewText, value);
    }

    public string StatusNotice
    {
        get => _statusNotice;
        set => SetProperty(ref _statusNotice, value);
    }

    public RelayCommand RefreshCommand { get; }
    public RelayCommand ExportTextCommand { get; }

    public DocumentsViewModel(IDocumentService documentService, IShipmentService shipmentService)
    {
        _documentService = documentService;
        _shipmentService = shipmentService;

        RefreshCommand = new RelayCommand(LoadDocuments);
        ExportTextCommand = new RelayCommand(() =>
        {
            if (SelectedDocument != null)
            {
                StatusNotice = $"Document {SelectedDocument.DocumentId} ready for print / export.";
            }
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
