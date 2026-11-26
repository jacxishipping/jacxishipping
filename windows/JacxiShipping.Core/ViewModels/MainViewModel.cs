using JacxiShipping.WindowsApp.Models;
using JacxiShipping.WindowsApp.Services;

namespace JacxiShipping.WindowsApp.ViewModels;

public class MainViewModel : ViewModelBase
{
    private readonly IShipmentService _shipmentService;
    private readonly IRateCalculatorService _calculatorService;
    private readonly IDocumentService _documentService;

    private string _currentTab = "Dashboard";
    private object? _currentView;

    public DashboardViewModel DashboardVM { get; }
    public ShipmentsViewModel ShipmentsVM { get; }
    public CalculatorViewModel CalculatorVM { get; }
    public TrackingViewModel TrackingVM { get; }
    public DocumentsViewModel DocumentsVM { get; }

    public string CurrentTab
    {
        get => _currentTab;
        set
        {
            if (SetProperty(ref _currentTab, value))
            {
                UpdateCurrentView();
            }
        }
    }

    public object? CurrentView
    {
        get => _currentView;
        set => SetProperty(ref _currentView, value);
    }

    public RelayCommand NavigateCommand { get; }

    public MainViewModel()
    {
        _shipmentService = new ShipmentService();
        _calculatorService = new RateCalculatorService();
        _documentService = new DocumentService();

        DashboardVM = new DashboardViewModel(_shipmentService, Navigate);
        ShipmentsVM = new ShipmentsViewModel(_shipmentService, _documentService);
        CalculatorVM = new CalculatorViewModel(_calculatorService, _shipmentService);
        TrackingVM = new TrackingViewModel(_shipmentService);
        DocumentsVM = new DocumentsViewModel(_documentService, _shipmentService);

        NavigateCommand = new RelayCommand(param =>
        {
            if (param is string tab)
            {
                Navigate(tab);
            }
        });

        _currentTab = string.Empty;
        Navigate("Dashboard");
    }

    public void Navigate(string tab)
    {
        CurrentTab = tab;
        if (tab == "Dashboard") DashboardVM.RefreshData();
        if (tab == "Shipments") ShipmentsVM.ApplyFilter();
        if (tab == "Documents") DocumentsVM.LoadDocuments();
    }

    private void UpdateCurrentView()
    {
        CurrentView = CurrentTab switch
        {
            "Dashboard" => DashboardVM,
            "Shipments" => ShipmentsVM,
            "Calculator" => CalculatorVM,
            "Tracking" => TrackingVM,
            "Documents" => DocumentsVM,
            _ => DashboardVM
        };
    }
}
