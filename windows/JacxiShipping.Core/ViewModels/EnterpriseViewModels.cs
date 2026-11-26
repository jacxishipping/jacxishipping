using System.Collections.ObjectModel;
using JacxiShipping.WindowsApp.Models;
using JacxiShipping.WindowsApp.Services;

namespace JacxiShipping.WindowsApp.ViewModels;

public class BankingViewModel : ViewModelBase
{
    private readonly IAdminStoreService _store;
    private readonly IPlatformInteractionService _platform;
    private BankTransactionRecord? _selectedTransaction;
    private UserInvoiceRecord? _selectedInvoiceToMatch;
    private string _csvInput = "2026-11-26,WIRE FROM ARIANA TRANSIT,1950.00,WIRE-51289";
    private string _statusMessage = string.Empty;

    public ObservableCollection<BankTransactionRecord> Transactions { get; } = new();
    public ObservableCollection<UserInvoiceRecord> OpenInvoices { get; } = new();

    public BankTransactionRecord? SelectedTransaction { get => _selectedTransaction; set => SetProperty(ref _selectedTransaction, value); }
    public UserInvoiceRecord? SelectedInvoiceToMatch { get => _selectedInvoiceToMatch; set => SetProperty(ref _selectedInvoiceToMatch, value); }
    public string CsvInput { get => _csvInput; set => SetProperty(ref _csvInput, value); }
    public string StatusMessage { get => _statusMessage; set => SetProperty(ref _statusMessage, value); }

    public RelayCommand BrowseCsvFileCommand { get; }
    public RelayCommand ImportCsvCommand { get; }
    public RelayCommand ReconcileSelectedCommand { get; }

    public BankingViewModel(IAdminStoreService store, IPlatformInteractionService? platform = null)
    {
        _store = store;
        _platform = platform ?? new HeadlessPlatformInteractionService();

        BrowseCsvFileCommand = new RelayCommand(() =>
        {
            var path = _platform.OpenFileDialog("Import Bank Statement CSV", "CSV Files (*.csv;*.txt)|*.csv;*.txt|All Files (*.*)|*.*");
            if (string.IsNullOrWhiteSpace(path) || !File.Exists(path)) return;
            CsvInput = File.ReadAllText(path);
            var count = _store.ImportBankCsv(CsvInput);
            Refresh();
            StatusMessage = $"Loaded `{Path.GetFileName(path)}` -> Imported {count} bank transaction(s).";
        });

        ImportCsvCommand = new RelayCommand(() =>
        {
            var count = _store.ImportBankCsv(CsvInput);
            Refresh();
            StatusMessage = count > 0
                ? $"Imported {count} bank transaction(s) from CSV."
                : "No valid CSV rows found (format: Date,Description,Amount,Reference).";
        });

        ReconcileSelectedCommand = new RelayCommand(() =>
        {
            if (SelectedTransaction == null || SelectedInvoiceToMatch == null)
            {
                StatusMessage = "Select both an unmatched bank deposit and an open invoice.";
                return;
            }
            if (SelectedTransaction.Status == BankReconciliationStatus.MATCHED)
            {
                StatusMessage = "This bank transaction is already reconciled.";
                return;
            }

            _store.ReconcileBankTransaction(SelectedTransaction.Id, SelectedInvoiceToMatch.InvoiceNumber);
            Refresh();
            StatusMessage = $"Matched {SelectedTransaction?.AmountFormatted} to {SelectedInvoiceToMatch.InvoiceNumber} & credited ledger.";
        });

        Refresh();
        SelectedTransaction = Transactions.FirstOrDefault();
        SelectedInvoiceToMatch = OpenInvoices.FirstOrDefault();
    }

    public void Refresh()
    {
        Transactions.Clear();
        foreach (var t in _store.GetBankTransactions()) Transactions.Add(t);

        OpenInvoices.Clear();
        foreach (var i in _store.GetInvoices().Where(x => x.AmountRemaining > 0)) OpenInvoices.Add(i);
    }
}

public class PriceComparisonViewModel : ViewModelBase
{
    private readonly IAdminStoreService _store;
    private ExchangeRateRecord? _selectedRate;
    private string _editedRateValue = string.Empty;
    private string _statusMessage = string.Empty;

    public ObservableCollection<CarrierPriceQuote> CarrierQuotes { get; } = new();
    public ObservableCollection<ExchangeRateRecord> ExchangeRates { get; } = new();

    public ExchangeRateRecord? SelectedRate
    {
        get => _selectedRate;
        set
        {
            if (SetProperty(ref _selectedRate, value) && value != null)
                EditedRateValue = value.RateFromUsd.ToString("0.####");
        }
    }

    public string EditedRateValue { get => _editedRateValue; set => SetProperty(ref _editedRateValue, value); }
    public string StatusMessage { get => _statusMessage; set => SetProperty(ref _statusMessage, value); }

    public RelayCommand UpdateRateCommand { get; }

    public PriceComparisonViewModel(IAdminStoreService store)
    {
        _store = store;
        UpdateRateCommand = new RelayCommand(() =>
        {
            if (SelectedRate == null || !decimal.TryParse(EditedRateValue, out var val) || val <= 0)
            {
                StatusMessage = "Select a currency and enter a valid positive FX rate.";
                return;
            }
            _store.UpdateExchangeRate(SelectedRate.Currency, val);
            var cur = SelectedRate.Currency;
            Refresh();
            SelectedRate = ExchangeRates.FirstOrDefault(r => r.Currency == cur);
            StatusMessage = $"Updated FX rate: 1 USD = {val:N4} {cur}.";
        });

        Refresh();
        SelectedRate = ExchangeRates.FirstOrDefault(r => r.Currency != "USD");
    }

    public void Refresh()
    {
        CarrierQuotes.Clear();
        foreach (var q in _store.GetCarrierQuotes()) CarrierQuotes.Add(q);

        ExchangeRates.Clear();
        foreach (var r in _store.GetExchangeRates()) ExchangeRates.Add(r);
    }
}

public class InspectionsViewModel : ViewModelBase
{
    private readonly IAdminStoreService _store;
    private QualityCheckRecord? _selectedCheck;
    private Shipment? _selectedShipment;
    private string _checkType = "PRE_LOADING";
    private string _notes = "Exterior body verified, keys & title present, 4-point tie-down inspected.";
    private string _damageCost = "0";
    private string _damageLiability = "NONE";
    private readonly IPlatformInteractionService _platform;
    private string _photoName = "container_loading_photo.jpg";
    private string _photoPreviewPath = string.Empty;
    private string _statusMessage = string.Empty;

    public ObservableCollection<QualityCheckRecord> QualityChecks { get; } = new();
    public ObservableCollection<Shipment> Shipments { get; } = new();
    public ObservableCollection<string> CheckTypes { get; } = new() { "INITIAL_INSPECTION", "PRE_LOADING", "POST_LOADING", "DELIVERY_INSPECTION", "DAMAGE_ASSESSMENT" };
    public ObservableCollection<string> Liabilities { get; } = new() { "NONE", "WE_PAY", "COMPANY_PAYS" };

    public QualityCheckRecord? SelectedCheck { get => _selectedCheck; set => SetProperty(ref _selectedCheck, value); }
    public Shipment? SelectedShipment { get => _selectedShipment; set => SetProperty(ref _selectedShipment, value); }
    public string CheckType { get => _checkType; set => SetProperty(ref _checkType, value); }
    public string Notes { get => _notes; set => SetProperty(ref _notes, value); }
    public string DamageCost { get => _damageCost; set => SetProperty(ref _damageCost, value); }
    public string DamageLiability { get => _damageLiability; set => SetProperty(ref _damageLiability, value); }
    public string PhotoName { get => _photoName; set => SetProperty(ref _photoName, value); }
    public string PhotoPreviewPath { get => _photoPreviewPath; set => SetProperty(ref _photoPreviewPath, value); }
    public string StatusMessage { get => _statusMessage; set => SetProperty(ref _statusMessage, value); }

    public RelayCommand BrowsePhotoCommand { get; }
    public RelayCommand RecordInspectionCommand { get; }

    public InspectionsViewModel(IAdminStoreService store, IPlatformInteractionService? platform = null)
    {
        _store = store;
        _platform = platform ?? new HeadlessPlatformInteractionService();

        BrowsePhotoCommand = new RelayCommand(() =>
        {
            var path = _platform.OpenFileDialog("Select Vehicle Inspection Photo", "Image Files (*.jpg;*.jpeg;*.png;*.webp)|*.jpg;*.jpeg;*.png;*.webp|All Files (*.*)|*.*");
            if (string.IsNullOrWhiteSpace(path)) return;
            PhotoPreviewPath = path;
            PhotoName = Path.GetFileName(path);
            StatusMessage = $"Attached photo `{PhotoName}` for inspection.";
        });

        RecordInspectionCommand = new RelayCommand(() =>
        {
            if (SelectedShipment == null) return;
            decimal.TryParse(DamageCost, out var dmg);

            var photos = new List<string>();
            if (!string.IsNullOrWhiteSpace(PhotoPreviewPath)) photos.Add(PhotoPreviewPath);
            else photos.Add(PhotoName);
            photos.Add("vin_plate_verified.jpg");

            var qc = new QualityCheckRecord
            {
                ShipmentId = SelectedShipment.Id,
                TrackingNumber = SelectedShipment.TrackingNumber,
                VehicleLabel = SelectedShipment.Vehicle.FullDescription,
                CheckType = CheckType,
                Status = dmg > 0 ? "REQUIRES_ATTENTION" : "PASSED",
                Notes = Notes,
                DamageCost = dmg,
                DamageLiability = DamageLiability,
                PhotoUrls = photos
            };

            _store.AddQualityCheck(qc);
            Refresh();
            SelectedCheck = qc;
            StatusMessage = $"Logged {qc.CheckType} for {qc.TrackingNumber} ({qc.Status}).";
        });

        Refresh();
        SelectedCheck = QualityChecks.FirstOrDefault();
        SelectedShipment = Shipments.FirstOrDefault();
    }

    public void Refresh()
    {
        QualityChecks.Clear();
        foreach (var q in _store.GetQualityChecks()) QualityChecks.Add(q);

        Shipments.Clear();
        foreach (var s in _store.GetShipments()) Shipments.Add(s);
    }
}

public class TrackingDiagnosticsViewModel : ViewModelBase
{
    private readonly IAdminStoreService _store;
    private readonly IPlatformInteractionService _platform;
    private ContainerRecord? _selectedContainer;
    private string _statusMessage = string.Empty;

    public ObservableCollection<ContainerRecord> Containers { get; } = new();
    public ObservableCollection<TrackingDiagnosticRecord> Diagnostics { get; } = new();

    public ContainerRecord? SelectedContainer { get => _selectedContainer; set => SetProperty(ref _selectedContainer, value); }
    public string StatusMessage { get => _statusMessage; set => SetProperty(ref _statusMessage, value); }

    public RelayCommand SyncContainerCommand { get; }
    public RelayCommand OpenVesselMapCommand { get; }

    public TrackingDiagnosticsViewModel(IAdminStoreService store, IPlatformInteractionService? platform = null)
    {
        _store = store;
        _platform = platform ?? new HeadlessPlatformInteractionService();

        SyncContainerCommand = new RelayCommand(() =>
        {
            if (SelectedContainer == null) return;
            var diag = _store.RunTrackingSync(SelectedContainer.ContainerNumber);
            Refresh();
            StatusMessage = $"AIS Sync OK ({diag.LatencyMs}ms): {diag.ContainerNumber} at {diag.VesselPosition}";
        });

        OpenVesselMapCommand = new RelayCommand(() =>
        {
            var query = SelectedContainer?.ContainerNumber ?? "MSC";
            var url = $"https://www.marinetraffic.com/en/ais/home/centerx:-5.35/centery:36.14/zoom:6";
            _platform.OpenPathWithShell(url);
            StatusMessage = $"Opened live MarineTraffic AIS map for {query}.";
        });

        Refresh();
        SelectedContainer = Containers.FirstOrDefault();
    }

    public void Refresh()
    {
        Containers.Clear();
        foreach (var c in _store.GetContainers()) Containers.Add(c);

        Diagnostics.Clear();
        foreach (var d in _store.GetTrackingDiagnostics()) Diagnostics.Add(d);
    }
}

public class AiCopilotViewModel : ViewModelBase
{
    private readonly IAdminStoreService _store;
    private readonly IAdminCopilotService _copilot;
    private string _promptInput = "Which invoices are overdue?";
    private string _latestAnswer = string.Empty;

    public ObservableCollection<AiInteractionRecord> AiLogs { get; } = new();
    public ObservableCollection<VoiceCallLogRecord> VoiceLogs { get; } = new();

    public string PromptInput { get => _promptInput; set => SetProperty(ref _promptInput, value); }
    public string LatestAnswer { get => _latestAnswer; set => SetProperty(ref _latestAnswer, value); }

    public RelayCommand AskCopilotCommand { get; }
    public RelayCommand QuickPromptCommand { get; }

    public AiCopilotViewModel(IAdminStoreService store, IAdminCopilotService copilot)
    {
        _store = store;
        _copilot = copilot;

        AskCopilotCommand = new RelayCommand(async () =>
        {
            if (string.IsNullOrWhiteSpace(PromptInput)) return;
            LatestAnswer = await _copilot.AskAsync(PromptInput);
            Refresh();
        });

        QuickPromptCommand = new RelayCommand(async param =>
        {
            if (param is string q)
            {
                PromptInput = q;
                LatestAnswer = await _copilot.AskAsync(q);
                Refresh();
            }
        });

        Refresh();
        LatestAnswer = AiLogs.FirstOrDefault()?.Response ?? "Ask me anything about shipments, containers, customs holds, or invoices.";
    }

    public void Refresh()
    {
        AiLogs.Clear();
        foreach (var a in _store.GetAiInteractions()) AiLogs.Add(a);

        VoiceLogs.Clear();
        foreach (var v in _store.GetVoiceCallLogs()) VoiceLogs.Add(v);
    }
}

public class CommunicationsViewModel : ViewModelBase
{
    private readonly IAdminStoreService _store;
    private readonly IJacxiCloudClient _cloud;
    private string _channel = "WHATSAPP";
    private string _recipient = "+90 532 994 1283";
    private string _subject = "Shipment Update & Release Token";
    private string _body = "Hello, your vehicle shipment status has been updated in the JACXI Portal.";
    private string _statusMessage = string.Empty;

    public ObservableCollection<CommunicationDispatchRecord> Dispatches { get; } = new();
    public ObservableCollection<string> Channels { get; } = new() { "WHATSAPP", "EMAIL", "SMS", "TELEGRAM" };

    public string Channel { get => _channel; set => SetProperty(ref _channel, value); }
    public string Recipient { get => _recipient; set => SetProperty(ref _recipient, value); }
    public string Subject { get => _subject; set => SetProperty(ref _subject, value); }
    public string Body { get => _body; set => SetProperty(ref _body, value); }
    public string StatusMessage { get => _statusMessage; set => SetProperty(ref _statusMessage, value); }

    public RelayCommand SendMessageCommand { get; }

    public CommunicationsViewModel(IAdminStoreService store, IJacxiCloudClient cloud)
    {
        _store = store;
        _cloud = cloud;

        SendMessageCommand = new RelayCommand(async () =>
        {
            if (string.IsNullOrWhiteSpace(Recipient) || string.IsNullOrWhiteSpace(Body))
            {
                StatusMessage = "Recipient and message body are required.";
                return;
            }

            var rec = new CommunicationDispatchRecord
            {
                Channel = Channel,
                Recipient = Recipient.Trim(),
                Subject = Subject.Trim(),
                Body = Body.Trim(),
                Status = "SENT"
            };

            if (_store.Session.IsCloudConnected && !string.IsNullOrWhiteSpace(_store.Session.BearerToken))
            {
                await _cloud.DispatchCommunicationAsync(_store.Session.ServerUrl, _store.Session.BearerToken, rec);
            }

            _store.AddCommunicationDispatch(rec);
            Refresh();
            StatusMessage = $"Dispatched {rec.Channel} notification to {rec.Recipient}.";
        });

        Refresh();
    }

    public void Refresh()
    {
        Dispatches.Clear();
        foreach (var d in _store.GetCommunicationDispatches()) Dispatches.Add(d);
    }
}
