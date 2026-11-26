using System.Collections.ObjectModel;
using JacxiShipping.WindowsApp.Models;
using JacxiShipping.WindowsApp.Services;

namespace JacxiShipping.WindowsApp.ViewModels;

public class MainViewModel : ViewModelBase
{
    private readonly IAdminStoreService _store;
    private readonly IShipmentService _shipmentService;
    private readonly IRateCalculatorService _calculatorService;
    private readonly IDocumentService _documentService;
    private readonly IJacxiCloudClient _cloudClient;
    private readonly IPdfExportService _pdfService;
    private readonly IAdminCopilotService _copilotService;

    private string _currentTab = string.Empty;
    private object? _currentView;
    private string _globalSearchQuery = string.Empty;
    private NavBadges _badges = new();
    private bool _isAdminAuthenticated = true;
    private string _loginEmail = "admin@jacxishipping.com";
    private string _loginCodeInput = "JX884910";
    private string _loginStatus = string.Empty;

    private bool _isNotificationsOpen;
    private bool _isCopilotDrawerOpen;
    private int _unreadNotificationCount;

    public DashboardViewModel DashboardVM { get; }
    public ShipmentsViewModel ShipmentsVM { get; }
    public OperationsBoardViewModel OperationsBoardVM { get; }
    public ContainersViewModel ContainersVM { get; }
    public DispatchesViewModel DispatchesVM { get; }
    public TransitsViewModel TransitsVM { get; }
    public GatePassesViewModel GatePassesVM { get; }
    public InspectionsViewModel InspectionsVM { get; }
    public TrackingViewModel TrackingVM { get; }
    public TrackingDiagnosticsViewModel TrackingDiagnosticsVM { get; }
    public FinanceViewModel FinanceVM { get; }
    public BankingViewModel BankingVM { get; }
    public InvoicesViewModel InvoicesVM { get; }
    public OfficeExpensesViewModel OfficeExpensesVM { get; }
    public CompanyLedgersViewModel CompanyLedgersVM { get; }
    public PriceComparisonViewModel PriceComparisonVM { get; }
    public CustomersViewModel CustomersVM { get; }
    public PartnerPortalsViewModel PartnerPortalsVM { get; }
    public CalculatorViewModel CalculatorVM { get; }
    public DocumentsViewModel DocumentsVM { get; }
    public CommunicationsViewModel CommunicationsVM { get; }
    public AiCopilotViewModel AiCopilotVM { get; }
    public AnalyticsViewModel AnalyticsVM { get; }
    public SettingsViewModel SettingsVM { get; }

    public ObservableCollection<AdminNotificationItem> Notifications { get; } = new();

    public AdminUser CurrentAdmin => _store.Session.CurrentAdmin;
    public string CloudStatusLabel => _store.Session.IsCloudConnected ? "CLOUD SYNCED" : "LOCAL ADMIN SUITE v3.0";

    // RBAC Visibility Properties (from RbacService)
    public bool CanViewFinance => RbacService.HasPermission(CurrentAdmin.Role, "finance:view");
    public bool CanManageUsers => RbacService.HasPermission(CurrentAdmin.Role, "users:manage");
    public bool CanViewAnalytics => RbacService.HasPermission(CurrentAdmin.Role, "analytics:view");

    public NavBadges Badges { get => _badges; set => SetProperty(ref _badges, value); }
    public string CurrentTab { get => _currentTab; set { if (SetProperty(ref _currentTab, value)) UpdateCurrentView(); } }
    public object? CurrentView { get => _currentView; set => SetProperty(ref _currentView, value); }
    public string GlobalSearchQuery { get => _globalSearchQuery; set => SetProperty(ref _globalSearchQuery, value); }
    public bool IsAdminAuthenticated { get => _isAdminAuthenticated; set => SetProperty(ref _isAdminAuthenticated, value); }
    public string LoginEmail { get => _loginEmail; set => SetProperty(ref _loginEmail, value); }
    public string LoginCodeInput { get => _loginCodeInput; set => SetProperty(ref _loginCodeInput, value); }
    public string LoginStatus { get => _loginStatus; set => SetProperty(ref _loginStatus, value); }

    public bool IsNotificationsOpen { get => _isNotificationsOpen; set => SetProperty(ref _isNotificationsOpen, value); }
    public bool IsCopilotDrawerOpen { get => _isCopilotDrawerOpen; set => SetProperty(ref _isCopilotDrawerOpen, value); }
    public int UnreadNotificationCount { get => _unreadNotificationCount; set => SetProperty(ref _unreadNotificationCount, value); }

    public RelayCommand NavigateCommand { get; }
    public RelayCommand GlobalSearchCommand { get; }
    public RelayCommand SignOutCommand { get; }
    public RelayCommand SignInLocalCommand { get; }
    public RelayCommand ToggleNotificationsCommand { get; }
    public RelayCommand MarkNotificationsReadCommand { get; }
    public RelayCommand ToggleCopilotDrawerCommand { get; }
    public RelayCommand RefreshAllCommand { get; }

    public MainViewModel() : this(new AdminStoreService())
    {
    }

    public MainViewModel(IAdminStoreService store)
    {
        _store = store;
        _shipmentService = new ShipmentService(_store);
        _calculatorService = new RateCalculatorService();
        _documentService = new DocumentService();
        _cloudClient = new JacxiCloudClient();
        _pdfService = new PdfExportService();
        _copilotService = new AdminCopilotService(_store, _cloudClient);

        DashboardVM = new DashboardViewModel(_store, Navigate);
        ShipmentsVM = new ShipmentsViewModel(_store, _shipmentService, _documentService);
        OperationsBoardVM = new OperationsBoardViewModel(_store);
        ContainersVM = new ContainersViewModel(_store);
        DispatchesVM = new DispatchesViewModel(_store);
        TransitsVM = new TransitsViewModel(_store);
        GatePassesVM = new GatePassesViewModel(_store);
        InspectionsVM = new InspectionsViewModel(_store);
        TrackingVM = new TrackingViewModel(_shipmentService);
        TrackingDiagnosticsVM = new TrackingDiagnosticsViewModel(_store);
        FinanceVM = new FinanceViewModel(_store);
        BankingVM = new BankingViewModel(_store);
        InvoicesVM = new InvoicesViewModel(_store);
        OfficeExpensesVM = new OfficeExpensesViewModel(_store);
        CompanyLedgersVM = new CompanyLedgersViewModel(_store);
        PriceComparisonVM = new PriceComparisonViewModel(_store);
        CustomersVM = new CustomersViewModel(_store);
        PartnerPortalsVM = new PartnerPortalsViewModel(_store);
        CalculatorVM = new CalculatorViewModel(_calculatorService, _shipmentService);
        DocumentsVM = new DocumentsViewModel(_documentService, _shipmentService, _store, _pdfService);
        CommunicationsVM = new CommunicationsViewModel(_store, _cloudClient);
        AiCopilotVM = new AiCopilotViewModel(_store, _copilotService);
        AnalyticsVM = new AnalyticsViewModel(_store);
        SettingsVM = new SettingsViewModel(_store, _cloudClient);

        NavigateCommand = new RelayCommand(param =>
        {
            if (param is string tab) Navigate(tab);
        });

        GlobalSearchCommand = new RelayCommand(() =>
        {
            if (string.IsNullOrWhiteSpace(GlobalSearchQuery)) return;
            ShipmentsVM.SearchQuery = GlobalSearchQuery;
            Navigate("Shipments");
        });

        SignOutCommand = new RelayCommand(() =>
        {
            IsAdminAuthenticated = false;
            LoginStatus = "Session locked. Sign in with your Admin Email or 8-char Login Code.";
        });

        SignInLocalCommand = new RelayCommand(() =>
        {
            var matched = _store.GetUsers().FirstOrDefault(u =>
                u.Email.Equals(LoginEmail, StringComparison.OrdinalIgnoreCase) ||
                (!string.IsNullOrWhiteSpace(LoginCodeInput) && u.LoginCode.Equals(LoginCodeInput.Trim(), StringComparison.OrdinalIgnoreCase)));

            if (matched != null)
            {
                _store.Session.CurrentAdmin = matched;
                OnPropertyChanged(nameof(CurrentAdmin));
                OnPropertyChanged(nameof(CanViewFinance));
                OnPropertyChanged(nameof(CanManageUsers));
                OnPropertyChanged(nameof(CanViewAnalytics));
            }

            IsAdminAuthenticated = true;
            LoginStatus = string.Empty;
        });

        ToggleNotificationsCommand = new RelayCommand(() =>
        {
            IsNotificationsOpen = !IsNotificationsOpen;
            if (IsNotificationsOpen) IsCopilotDrawerOpen = false;
            RefreshNotifications();
        });

        MarkNotificationsReadCommand = new RelayCommand(() =>
        {
            _store.MarkAllNotificationsRead();
            RefreshNotifications();
        });

        ToggleCopilotDrawerCommand = new RelayCommand(() =>
        {
            IsCopilotDrawerOpen = !IsCopilotDrawerOpen;
            if (IsCopilotDrawerOpen) IsNotificationsOpen = false;
        });

        RefreshAllCommand = new RelayCommand(() => Navigate(CurrentTab));

        Navigate("Dashboard");
    }

    public void Navigate(string tab)
    {
        CurrentTab = tab;
        Badges = _store.GetNavBadges();
        RefreshNotifications();

        switch (tab)
        {
            case "Dashboard": DashboardVM.RefreshData(); break;
            case "Shipments": ShipmentsVM.ApplyFilter(); break;
            case "OperationsBoard": OperationsBoardVM.Refresh(); break;
            case "Containers": ContainersVM.Refresh(); break;
            case "Dispatches": DispatchesVM.Refresh(); break;
            case "Transits": TransitsVM.Refresh(); break;
            case "GatePasses": GatePassesVM.Refresh(); break;
            case "Inspections": InspectionsVM.Refresh(); break;
            case "TrackingDiagnostics": TrackingDiagnosticsVM.Refresh(); break;
            case "Finance": FinanceVM.Refresh(); break;
            case "Banking": BankingVM.Refresh(); break;
            case "Invoices": InvoicesVM.Refresh(); break;
            case "OfficeExpenses": OfficeExpensesVM.Refresh(); break;
            case "CompanyLedgers": CompanyLedgersVM.Refresh(); break;
            case "PriceComparison": PriceComparisonVM.Refresh(); break;
            case "Customers": CustomersVM.Refresh(); break;
            case "PartnerPortals": PartnerPortalsVM.Refresh(); break;
            case "Documents": DocumentsVM.LoadDocuments(); break;
            case "Communications": CommunicationsVM.Refresh(); break;
            case "AiCopilot": AiCopilotVM.Refresh(); break;
            case "Analytics": AnalyticsVM.Refresh(); break;
        }
    }

    private void RefreshNotifications()
    {
        Notifications.Clear();
        foreach (var n in _store.GetNotifications()) Notifications.Add(n);
        UnreadNotificationCount = Notifications.Count(n => !n.IsRead);
    }

    private void UpdateCurrentView()
    {
        CurrentView = CurrentTab switch
        {
            "Dashboard" => DashboardVM,
            "Shipments" => ShipmentsVM,
            "OperationsBoard" => OperationsBoardVM,
            "Containers" => ContainersVM,
            "Dispatches" => DispatchesVM,
            "Transits" => TransitsVM,
            "GatePasses" => GatePassesVM,
            "Inspections" => InspectionsVM,
            "Tracking" => TrackingVM,
            "TrackingDiagnostics" => TrackingDiagnosticsVM,
            "Finance" => FinanceVM,
            "Banking" => BankingVM,
            "Invoices" => InvoicesVM,
            "OfficeExpenses" => OfficeExpensesVM,
            "CompanyLedgers" => CompanyLedgersVM,
            "PriceComparison" => PriceComparisonVM,
            "Customers" => CustomersVM,
            "PartnerPortals" => PartnerPortalsVM,
            "Calculator" => CalculatorVM,
            "Documents" => DocumentsVM,
            "Communications" => CommunicationsVM,
            "AiCopilot" => AiCopilotVM,
            "Analytics" => AnalyticsVM,
            "Settings" => SettingsVM,
            _ => DashboardVM
        };
    }
}
