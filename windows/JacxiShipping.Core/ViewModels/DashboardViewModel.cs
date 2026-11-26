using System.Collections.ObjectModel;
using JacxiShipping.WindowsApp.Models;
using JacxiShipping.WindowsApp.Services;

namespace JacxiShipping.WindowsApp.ViewModels;

public class DashboardViewModel : ViewModelBase
{
    private readonly IAdminStoreService _store;
    private readonly Action<string> _navigateAction;
    private DashboardStats _stats = new();

    public DashboardStats Stats
    {
        get => _stats;
        set => SetProperty(ref _stats, value);
    }

    public ObservableCollection<Shipment> RecentShipments { get; } = new();
    public ObservableCollection<ContainerRecord> ContainerUtilization { get; } = new();
    public ObservableCollection<ExceptionAlertItem> ExceptionAlerts { get; } = new();

    public RelayCommand GoToShipmentsCommand { get; }
    public RelayCommand GoToCalculatorCommand { get; }
    public RelayCommand GoToTrackingCommand { get; }
    public RelayCommand NavigateAlertCommand { get; }

    public DashboardViewModel(IShipmentService shipmentService, Action<string> navigateAction)
        : this(new AdminStoreService(Path.Combine(Path.GetTempPath(), $"jacxi-dash-{Guid.NewGuid():N}.json")), navigateAction)
    {
    }

    public DashboardViewModel(IAdminStoreService store, Action<string> navigateAction)
    {
        _store = store;
        _navigateAction = navigateAction;

        GoToShipmentsCommand = new RelayCommand(() => _navigateAction("Shipments"));
        GoToCalculatorCommand = new RelayCommand(() => _navigateAction("Calculator"));
        GoToTrackingCommand = new RelayCommand(() => _navigateAction("Tracking"));
        NavigateAlertCommand = new RelayCommand(param =>
        {
            if (param is string target && !string.IsNullOrWhiteSpace(target))
                _navigateAction(target);
        });

        RefreshData();
    }

    public void RefreshData()
    {
        Stats = _store.GetDashboardStats();

        RecentShipments.Clear();
        foreach (var s in _store.GetShipments().Take(6))
        {
            RecentShipments.Add(s);
        }

        ContainerUtilization.Clear();
        foreach (var c in _store.GetContainers().Take(5))
        {
            ContainerUtilization.Add(c);
        }

        ExceptionAlerts.Clear();
        foreach (var alert in _store.GetExceptionAlerts())
        {
            ExceptionAlerts.Add(alert);
        }
    }
}
