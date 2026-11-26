using System.Collections.ObjectModel;
using System.Text;
using JacxiShipping.WindowsApp.Models;
using JacxiShipping.WindowsApp.Services;

namespace JacxiShipping.WindowsApp.ViewModels;

public class ShipmentsViewModel : ViewModelBase
{
    private readonly IShipmentService _shipmentService;
    private readonly IDocumentService _documentService;
    private string _searchQuery = string.Empty;
    private string _selectedFilter = "All";
    private Shipment? _selectedShipment;
    private string _statusMessage = string.Empty;

    public ObservableCollection<Shipment> FilteredShipments { get; } = new();

    public string SearchQuery
    {
        get => _searchQuery;
        set
        {
            if (SetProperty(ref _searchQuery, value))
            {
                ApplyFilter();
            }
        }
    }

    public string SelectedFilter
    {
        get => _selectedFilter;
        set
        {
            if (SetProperty(ref _selectedFilter, value))
            {
                ApplyFilter();
            }
        }
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

    public RelayCommand FilterAllCommand { get; }
    public RelayCommand FilterInTransitCommand { get; }
    public RelayCommand FilterCustomsCommand { get; }
    public RelayCommand FilterDeliveredCommand { get; }
    public RelayCommand FilterBookedCommand { get; }

    public RelayCommand SelectShipmentCommand { get; }
    public RelayCommand GenerateBOLCommand { get; }
    public RelayCommand MarkDeliveredCommand { get; }
    public RelayCommand AdvanceMilestoneCommand { get; }
    public RelayCommand ExportManifestCommand { get; }

    public ShipmentsViewModel(IShipmentService shipmentService, IDocumentService documentService)
    {
        _shipmentService = shipmentService;
        _documentService = documentService;

        FilterAllCommand = new RelayCommand(() => SelectedFilter = "All");
        FilterInTransitCommand = new RelayCommand(() => SelectedFilter = "InTransit");
        FilterCustomsCommand = new RelayCommand(() => SelectedFilter = "CustomsHold");
        FilterDeliveredCommand = new RelayCommand(() => SelectedFilter = "Delivered");
        FilterBookedCommand = new RelayCommand(() => SelectedFilter = "Booked");

        SelectShipmentCommand = new RelayCommand(param =>
        {
            if (param is Shipment s)
            {
                SelectedShipment = s;
            }
        });

        GenerateBOLCommand = new RelayCommand(() =>
        {
            if (SelectedShipment != null)
            {
                var doc = _documentService.GenerateBillOfLading(SelectedShipment);
                StatusMessage = $"Generated Bill of Lading #{doc.DocumentId} successfully!";
            }
        }, () => SelectedShipment != null);

        MarkDeliveredCommand = new RelayCommand(() =>
        {
            if (SelectedShipment != null)
            {
                _shipmentService.UpdateStatus(SelectedShipment.TrackingNumber, ShipmentStatus.Delivered);
                ApplyFilter();
                SelectedShipment = _shipmentService.GetByTrackingNumber(SelectedShipment.TrackingNumber);
                StatusMessage = $"Shipment #{SelectedShipment?.TrackingNumber} marked as Delivered!";
            }
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
            StatusMessage = $"Manifest exported {FilteredShipments.Count} shipments to memory/log.";
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
        foreach (var item in items)
        {
            FilteredShipments.Add(item);
        }
    }
}
