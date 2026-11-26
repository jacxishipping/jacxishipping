using System.Collections.ObjectModel;
using System.Text;
using JacxiShipping.WindowsApp.Models;
using JacxiShipping.WindowsApp.Services;

namespace JacxiShipping.WindowsApp.ViewModels;

public class ShipmentsViewModel : ViewModelBase
{
    private readonly IAdminStoreService? _store;
    private readonly IShipmentService _shipmentService;
    private readonly IDocumentService _documentService;
    private string _searchQuery = string.Empty;
    private string _selectedFilter = "All";
    private Shipment? _selectedShipment;
    private string _statusMessage = string.Empty;
    private bool _isCreatePanelOpen;

    // Create Shipment Form Fields
    private string _newVin = string.Empty;
    private string _newYear = "2024";
    private string _newMake = "Toyota";
    private string _newModel = "Camry SE";
    private string _newLotNumber = string.Empty;
    private string _newAuctionYard = "Copart Dallas, TX";
    private string _newCustomerName = "Tariq Logistics Ltd";
    private string _newDestinationPort = "Port of Mersin, Turkey";
    private string _newFreightPrice = "1950";
    private bool _newIsPurchaseAndShipping;
    private string _newPurchasePrice = "0";

    public ObservableCollection<Shipment> FilteredShipments { get; } = new();
    public ObservableCollection<ContainerRecord> AvailableContainers { get; } = new();
    public ObservableCollection<AdminUser> Customers { get; } = new();

    public string SearchQuery
    {
        get => _searchQuery;
        set { if (SetProperty(ref _searchQuery, value)) ApplyFilter(); }
    }

    public string SelectedFilter
    {
        get => _selectedFilter;
        set { if (SetProperty(ref _selectedFilter, value)) ApplyFilter(); }
    }

    public Shipment? SelectedShipment
    {
        get => _selectedShipment;
        set => SetProperty(ref _selectedShipment, value);
    }

    public string StatusMessage
    {
        get => _statusMessage;
        set => SetProperty(ref _statusMessage, value);
    }

    public bool IsCreatePanelOpen
    {
        get => _isCreatePanelOpen;
        set => SetProperty(ref _isCreatePanelOpen, value);
    }

    public string NewVin { get => _newVin; set => SetProperty(ref _newVin, value); }
    public string NewYear { get => _newYear; set => SetProperty(ref _newYear, value); }
    public string NewMake { get => _newMake; set => SetProperty(ref _newMake, value); }
    public string NewModel { get => _newModel; set => SetProperty(ref _newModel, value); }
    public string NewLotNumber { get => _newLotNumber; set => SetProperty(ref _newLotNumber, value); }
    public string NewAuctionYard { get => _newAuctionYard; set => SetProperty(ref _newAuctionYard, value); }
    public string NewCustomerName { get => _newCustomerName; set => SetProperty(ref _newCustomerName, value); }
    public string NewDestinationPort { get => _newDestinationPort; set => SetProperty(ref _newDestinationPort, value); }
    public string NewFreightPrice { get => _newFreightPrice; set => SetProperty(ref _newFreightPrice, value); }
    public bool NewIsPurchaseAndShipping { get => _newIsPurchaseAndShipping; set => SetProperty(ref _newIsPurchaseAndShipping, value); }
    public string NewPurchasePrice { get => _newPurchasePrice; set => SetProperty(ref _newPurchasePrice, value); }

    public RelayCommand FilterAllCommand { get; }
    public RelayCommand FilterInTransitCommand { get; }
    public RelayCommand FilterCustomsCommand { get; }
    public RelayCommand FilterDeliveredCommand { get; }
    public RelayCommand FilterBookedCommand { get; }

    public RelayCommand SelectShipmentCommand { get; }
    public RelayCommand GenerateBOLCommand { get; }
    public RelayCommand GenerateInvoiceCommand { get; }
    public RelayCommand IssueReleaseTokenCommand { get; }
    public RelayCommand RequestGatePassCommand { get; }
    public RelayCommand MarkDeliveredCommand { get; }
    public RelayCommand AdvanceMilestoneCommand { get; }
    public RelayCommand ExportManifestCommand { get; }
    public RelayCommand ExportExcelCommand { get; }
    public RelayCommand ToggleCreatePanelCommand { get; }
    public RelayCommand SubmitNewShipmentCommand { get; }

    public ShipmentsViewModel(IShipmentService shipmentService, IDocumentService documentService)
        : this(null, shipmentService, documentService)
    {
    }

    public ShipmentsViewModel(IAdminStoreService? store, IShipmentService shipmentService, IDocumentService documentService)
    {
        _store = store;
        _shipmentService = shipmentService;
        _documentService = documentService;

        FilterAllCommand = new RelayCommand(() => SelectedFilter = "All");
        FilterInTransitCommand = new RelayCommand(() => SelectedFilter = "InTransit");
        FilterCustomsCommand = new RelayCommand(() => SelectedFilter = "CustomsHold");
        FilterDeliveredCommand = new RelayCommand(() => SelectedFilter = "Delivered");
        FilterBookedCommand = new RelayCommand(() => SelectedFilter = "Booked");

        SelectShipmentCommand = new RelayCommand(param =>
        {
            if (param is Shipment s) SelectedShipment = s;
        });

        GenerateBOLCommand = new RelayCommand(() =>
        {
            if (SelectedShipment == null) return;
            var doc = _documentService.GenerateBillOfLading(SelectedShipment);
            StatusMessage = $"Generated Bill of Lading #{doc.DocumentId} successfully!";
        }, () => SelectedShipment != null);

        GenerateInvoiceCommand = new RelayCommand(() =>
        {
            if (SelectedShipment == null || _store == null) return;
            var inv = _store.GenerateInvoiceForShipment(SelectedShipment.Id);
            StatusMessage = $"Invoice {inv.InvoiceNumber} ({inv.TotalFormatted}) ready in Invoices.";
        }, () => SelectedShipment != null);

        IssueReleaseTokenCommand = new RelayCommand(() =>
        {
            if (SelectedShipment == null || _store == null) return;
            _store.IssueReleaseToken(SelectedShipment.Id);
            ApplyFilter();
            SelectedShipment = _shipmentService.GetByTrackingNumber(SelectedShipment.TrackingNumber);
            StatusMessage = $"Issued Release Token: {SelectedShipment?.ReleaseToken}";
        }, () => SelectedShipment != null);

        RequestGatePassCommand = new RelayCommand(() =>
        {
            if (SelectedShipment == null || _store == null) return;
            _store.RequestGatePass(SelectedShipment.Id);
            ApplyFilter();
            SelectedShipment = _shipmentService.GetByTrackingNumber(SelectedShipment.TrackingNumber);
            StatusMessage = $"Gate pass requested for {SelectedShipment?.TrackingNumber}.";
        }, () => SelectedShipment != null);

        MarkDeliveredCommand = new RelayCommand(() =>
        {
            if (SelectedShipment == null) return;
            _shipmentService.UpdateStatus(SelectedShipment.TrackingNumber, ShipmentStatus.Delivered);
            ApplyFilter();
            SelectedShipment = _shipmentService.GetByTrackingNumber(SelectedShipment.TrackingNumber);
            StatusMessage = $"Shipment #{SelectedShipment?.TrackingNumber} marked as Delivered!";
        }, () => SelectedShipment != null && SelectedShipment.Status != ShipmentStatus.Delivered);

        AdvanceMilestoneCommand = new RelayCommand(() =>
        {
            if (SelectedShipment == null) return;
            var next = SelectedShipment.Status switch
            {
                ShipmentStatus.Booked => ShipmentStatus.VehicleReceived,
                ShipmentStatus.VehicleReceived => ShipmentStatus.ContainerLoaded,
                ShipmentStatus.ContainerLoaded => ShipmentStatus.InTransit,
                ShipmentStatus.InTransit => ShipmentStatus.CustomsHold,
                ShipmentStatus.CustomsHold => ShipmentStatus.CustomsCleared,
                ShipmentStatus.CustomsCleared => ShipmentStatus.Delivered,
                _ => ShipmentStatus.Delivered
            };
            _shipmentService.UpdateStatus(SelectedShipment.TrackingNumber, next);
            ApplyFilter();
            SelectedShipment = _shipmentService.GetByTrackingNumber(SelectedShipment.TrackingNumber);
            StatusMessage = $"Advanced status to {SelectedShipment?.StatusDisplayText}.";
        }, () => SelectedShipment != null && SelectedShipment.Status != ShipmentStatus.Delivered);

        ExportManifestCommand = new RelayCommand(() =>
        {
            var sb = new StringBuilder();
            sb.AppendLine("TrackingNumber,ContainerNumber,Customer,VIN,Vehicle,Origin,Destination,Status,TotalCost");
            foreach (var s in FilteredShipments)
            {
                sb.AppendLine($"{s.TrackingNumber},{s.ContainerNumber},\"{s.CustomerName}\",{s.Vehicle.Vin},\"{s.Vehicle.FullDescription}\",\"{s.OriginPort}\",\"{s.DestinationPort}\",{s.StatusDisplayText},{s.TotalCost}");
            }
            StatusMessage = $"Manifest exported {FilteredShipments.Count} shipments to CSV buffer.";
        });

        ExportExcelCommand = new RelayCommand(() =>
        {
            var docs = Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments);
            if (string.IsNullOrWhiteSpace(docs)) docs = Path.GetTempPath();
            var path = Path.Combine(docs, "JacxiShipping", "Exports", $"Shipments_{DateTime.Now:yyyyMMdd_HHmm}.xlsx");
            new ExcelExportService().ExportShipmentsWorkbook(FilteredShipments, path);
            StatusMessage = $"✓ Exported Excel workbook ({FilteredShipments.Count} rows) → {Path.GetFileName(path)}";
        });

        ToggleCreatePanelCommand = new RelayCommand(() => IsCreatePanelOpen = !IsCreatePanelOpen);

        SubmitNewShipmentCommand = new RelayCommand(() =>
        {
            int.TryParse(NewYear, out var yr);
            if (yr < 1950) yr = 2024;
            decimal.TryParse(NewFreightPrice, out var freight);
            if (freight <= 0) freight = 1600m;
            decimal.TryParse(NewPurchasePrice, out var purch);

            var customer = _store?.GetUsers().FirstOrDefault(u => u.Name.Equals(NewCustomerName, StringComparison.OrdinalIgnoreCase));

            var shp = new Shipment
            {
                UserId = customer?.Id ?? "usr-001",
                CustomerName = string.IsNullOrWhiteSpace(NewCustomerName) ? "Walk-in Client" : NewCustomerName.Trim(),
                CustomerEmail = customer?.Email ?? "client@jacxishipping.com",
                CustomerPhone = customer?.Phone ?? "+1 (201) 555-0199",
                ServiceType = NewIsPurchaseAndShipping ? ServiceType.PURCHASE_AND_SHIPPING : ServiceType.SHIPPING_ONLY,
                PurchasePrice = NewIsPurchaseAndShipping && purch > 0 ? purch : null,
                SimpleStatus = ShipmentSimpleStatus.ON_HAND,
                Status = ShipmentStatus.VehicleReceived,
                OriginPort = "Port of Newark, NJ",
                DestinationPort = NewDestinationPort,
                OceanFreightCost = freight - 500m > 0 ? freight - 500m : freight,
                InlandTowingCost = 350m,
                DocumentationFee = 150m,
                CompanyShippingFare = (freight - 500m > 0 ? freight - 500m : freight) * 0.85m,
                Vehicle = new VehicleInspection
                {
                    Vin = string.IsNullOrWhiteSpace(NewVin) ? $"1HGCM82633A{Random.Shared.Next(100000, 999999)}" : NewVin.Trim().ToUpperInvariant(),
                    Year = yr,
                    Make = string.IsNullOrWhiteSpace(NewMake) ? "Toyota" : NewMake.Trim(),
                    Model = string.IsNullOrWhiteSpace(NewModel) ? "Camry" : NewModel.Trim(),
                    LotNumber = string.IsNullOrWhiteSpace(NewLotNumber) ? Random.Shared.Next(40000000, 89999999).ToString() : NewLotNumber.Trim(),
                    AuctionYard = NewAuctionYard,
                    RunsAndDrives = true,
                    HasKeys = true,
                    TitleStatus = "Clean Export Title"
                }
            };

            _shipmentService.AddShipment(shp);
            IsCreatePanelOpen = false;
            ApplyFilter();
            SelectedShipment = shp;
            StatusMessage = $"Created shipment {shp.TrackingNumber} ({shp.Vehicle.FullDescription}).";
        });

        ApplyFilter();
        SelectedShipment = FilteredShipments.FirstOrDefault();
    }

    public void ApplyFilter()
    {
        ShipmentStatus? status = _selectedFilter switch
        {
            "InTransit" => ShipmentStatus.InTransit,
            "CustomsHold" => ShipmentStatus.CustomsHold,
            "Delivered" => ShipmentStatus.Delivered,
            "Booked" => ShipmentStatus.Booked,
            _ => null
        };

        var items = _shipmentService.SearchShipments(SearchQuery, status);
        FilteredShipments.Clear();
        foreach (var item in items) FilteredShipments.Add(item);

        if (_store != null)
        {
            AvailableContainers.Clear();
            foreach (var c in _store.GetContainers()) AvailableContainers.Add(c);
            Customers.Clear();
            foreach (var u in _store.GetUsers().Where(x => x.Role == "user")) Customers.Add(u);
        }
    }
}
