using System.Collections.ObjectModel;
using JacxiShipping.WindowsApp.Models;
using JacxiShipping.WindowsApp.Services;

namespace JacxiShipping.WindowsApp.ViewModels;

public class DashboardViewModel : ViewModelBase
{
    private readonly IShipmentService _shipmentService;
    private readonly Action<string> _navigateAction;
    private DashboardStats _stats = new();

    public DashboardStats Stats
    {
        get => _stats;
        set => SetProperty(ref _stats, value);
    }

    public ObservableCollection<Shipment> RecentShipments { get; } = new();

    public RelayCommand GoToShipmentsCommand { get; }
    public RelayCommand GoToCalculatorCommand { get; }
    public RelayCommand GoToTrackingCommand { get; }

    public DashboardViewModel(IShipmentService shipmentService, Action<string> navigateAction)
    {
        _shipmentService = shipmentService;
        _navigateAction = navigateAction;

        GoToShipmentsCommand = new RelayCommand(() => _navigateAction("Shipments"));
        GoToCalculatorCommand = new RelayCommand(() => _navigateAction("Calculator"));
        GoToTrackingCommand = new RelayCommand(() => _navigateAction("Tracking"));

        RefreshData();
    }

    public void RefreshData()
    {
        Stats = _shipmentService.GetDashboardStats();
        RecentShipments.Clear();
        foreach (var s in _shipmentService.GetAllShipments().Take(5))
        {
            RecentShipments.Add(s);
        }
    }
}
