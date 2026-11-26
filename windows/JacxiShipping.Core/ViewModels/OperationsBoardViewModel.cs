using System.Collections.ObjectModel;
using JacxiShipping.WindowsApp.Models;
using JacxiShipping.WindowsApp.Services;

namespace JacxiShipping.WindowsApp.ViewModels;

public class OperationsBoardViewModel : ViewModelBase
{
    private readonly IAdminStoreService _store;
    private string _statusMessage = string.Empty;

    public ObservableCollection<Shipment> OnHandShipments { get; } = new();
    public ObservableCollection<Shipment> DispatchingShipments { get; } = new();
    public ObservableCollection<Shipment> InTransitShipments { get; } = new();
    public ObservableCollection<Shipment> ReleasedShipments { get; } = new();
    public ObservableCollection<Shipment> DestinationTransitShipments { get; } = new();
    public ObservableCollection<Shipment> DeliveredShipments { get; } = new();

    public string StatusMessage
    {
        get => _statusMessage;
        set => SetProperty(ref _statusMessage, value);
    }

    public RelayCommand AdvanceStageCommand { get; }
    public RelayCommand RefreshCommand { get; }

    public OperationsBoardViewModel(IAdminStoreService store)
    {
        _store = store;

        RefreshCommand = new RelayCommand(Refresh);
        AdvanceStageCommand = new RelayCommand(param =>
        {
            if (param is not Shipment shp) return;
            var next = shp.SimpleStatus switch
            {
                ShipmentSimpleStatus.ON_HAND => ShipmentSimpleStatus.DISPATCHING,
                ShipmentSimpleStatus.DISPATCHING => ShipmentSimpleStatus.IN_TRANSIT,
                ShipmentSimpleStatus.IN_TRANSIT => ShipmentSimpleStatus.RELEASED,
                ShipmentSimpleStatus.RELEASED => ShipmentSimpleStatus.IN_TRANSIT_TO_DESTINATION,
                ShipmentSimpleStatus.IN_TRANSIT_TO_DESTINATION => ShipmentSimpleStatus.DELIVERED,
                _ => ShipmentSimpleStatus.DELIVERED
            };
            _store.UpdateShipmentSimpleStatus(shp.Id, next);
            Refresh();
            StatusMessage = $"Moved {shp.TrackingNumber} ({shp.Vehicle.FullDescription}) → {next.ToString().Replace('_', ' ')}";
        });

        Refresh();
    }

    public void Refresh()
    {
        OnHandShipments.Clear();
        DispatchingShipments.Clear();
        InTransitShipments.Clear();
        ReleasedShipments.Clear();
        DestinationTransitShipments.Clear();
        DeliveredShipments.Clear();

        foreach (var s in _store.GetShipments())
        {
            switch (s.SimpleStatus)
            {
                case ShipmentSimpleStatus.ON_HAND: OnHandShipments.Add(s); break;
                case ShipmentSimpleStatus.DISPATCHING: DispatchingShipments.Add(s); break;
                case ShipmentSimpleStatus.IN_TRANSIT: InTransitShipments.Add(s); break;
                case ShipmentSimpleStatus.RELEASED: ReleasedShipments.Add(s); break;
                case ShipmentSimpleStatus.IN_TRANSIT_TO_DESTINATION: DestinationTransitShipments.Add(s); break;
                case ShipmentSimpleStatus.DELIVERED: DeliveredShipments.Add(s); break;
            }
        }
    }
}
