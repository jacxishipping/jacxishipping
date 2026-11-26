using System.Collections.ObjectModel;
using JacxiShipping.WindowsApp.Models;
using JacxiShipping.WindowsApp.Services;

namespace JacxiShipping.WindowsApp.ViewModels;

public class DispatchesViewModel : ViewModelBase
{
    private readonly IAdminStoreService _store;
    private DispatchRecord? _selectedDispatch;
    private string _statusMessage = string.Empty;
    private string _newOrigin = "Copart Dallas, TX";
    private string _newDestination = "Port of Houston, TX";
    private string _newCost = "350";

    public ObservableCollection<DispatchRecord> Dispatches { get; } = new();

    public DispatchRecord? SelectedDispatch
    {
        get => _selectedDispatch;
        set => SetProperty(ref _selectedDispatch, value);
    }

    public string StatusMessage
    {
        get => _statusMessage;
        set => SetProperty(ref _statusMessage, value);
    }

    public string NewOrigin { get => _newOrigin; set => SetProperty(ref _newOrigin, value); }
    public string NewDestination { get => _newDestination; set => SetProperty(ref _newDestination, value); }
    public string NewCost { get => _newCost; set => SetProperty(ref _newCost, value); }

    public RelayCommand CreateDispatchCommand { get; }
    public RelayCommand AdvanceDispatchCommand { get; }

    public DispatchesViewModel(IAdminStoreService store)
    {
        _store = store;

        CreateDispatchCommand = new RelayCommand(() =>
        {
            decimal.TryParse(NewCost, out var cost);
            var company = _store.GetCompanies().FirstOrDefault(c => c.IsDispatch);
            var d = new DispatchRecord
            {
                CompanyId = company?.Id ?? "cmp-003",
                CompanyName = company?.Name ?? "Atlantic Auto Towing LLC",
                Origin = NewOrigin,
                Destination = NewDestination,
                Cost = cost > 0 ? cost : 350m,
                VehicleCount = 1,
                Status = DispatchStatus.PENDING,
                Notes = "Created by Operations Admin"
            };
            _store.AddDispatch(d);
            Refresh();
            SelectedDispatch = d;
            StatusMessage = $"Created Dispatch {d.ReferenceNumber}.";
        });

        AdvanceDispatchCommand = new RelayCommand(() =>
        {
            if (SelectedDispatch == null) return;
            var next = SelectedDispatch.Status switch
            {
                DispatchStatus.PENDING => DispatchStatus.DISPATCHED,
                DispatchStatus.DISPATCHED => DispatchStatus.ARRIVED_AT_PORT,
                DispatchStatus.ARRIVED_AT_PORT => DispatchStatus.COMPLETED,
                _ => DispatchStatus.COMPLETED
            };
            var id = SelectedDispatch.Id;
            _store.UpdateDispatchStatus(id, next);
            Refresh();
            SelectedDispatch = Dispatches.FirstOrDefault(x => x.Id == id);
            StatusMessage = $"Dispatch {SelectedDispatch?.ReferenceNumber} updated to {SelectedDispatch?.StatusLabel}.";
        });

        Refresh();
        SelectedDispatch = Dispatches.FirstOrDefault();
    }

    public void Refresh()
    {
        Dispatches.Clear();
        foreach (var d in _store.GetDispatches()) Dispatches.Add(d);
    }
}

public class TransitsViewModel : ViewModelBase
{
    private readonly IAdminStoreService _store;
    private TransitRecord? _selectedTransit;
    private string _statusMessage = string.Empty;
    private string _newOrigin = "Jebel Ali Port, UAE";
    private string _newDestination = "Kabul, Afghanistan";
    private string _newBorder = "Islam Qala";
    private string _newCost = "1200";
    private string _receiverName = "Abdul Karim";

    public ObservableCollection<TransitRecord> Transits { get; } = new();

    public TransitRecord? SelectedTransit
    {
        get => _selectedTransit;
        set => SetProperty(ref _selectedTransit, value);
    }

    public string StatusMessage { get => _statusMessage; set => SetProperty(ref _statusMessage, value); }
    public string NewOrigin { get => _newOrigin; set => SetProperty(ref _newOrigin, value); }
    public string NewDestination { get => _newDestination; set => SetProperty(ref _newDestination, value); }
    public string NewBorder { get => _newBorder; set => SetProperty(ref _newBorder, value); }
    public string NewCost { get => _newCost; set => SetProperty(ref _newCost, value); }
    public string ReceiverName { get => _receiverName; set => SetProperty(ref _receiverName, value); }

    public RelayCommand CreateTransitCommand { get; }
    public RelayCommand AdvanceTransitCommand { get; }

    public TransitsViewModel(IAdminStoreService store)
    {
        _store = store;

        CreateTransitCommand = new RelayCommand(() =>
        {
            decimal.TryParse(NewCost, out var cost);
            var company = _store.GetCompanies().FirstOrDefault(c => c.IsTransit);
            var t = new TransitRecord
            {
                CompanyId = company?.Id ?? "cmp-004",
                CompanyName = company?.Name ?? "Silk Road Border Transit",
                Origin = NewOrigin,
                Destination = NewDestination,
                BorderCrossing = NewBorder,
                Cost = cost > 0 ? cost : 1200m,
                VehicleCount = 1,
                Status = TransitStatus.PENDING,
                Notes = "Cross-border transit file opened."
            };
            _store.AddTransit(t);
            Refresh();
            SelectedTransit = t;
            StatusMessage = $"Created Transit {t.ReferenceNumber}.";
        });

        AdvanceTransitCommand = new RelayCommand(() =>
        {
            if (SelectedTransit == null) return;
            var next = SelectedTransit.Status switch
            {
                TransitStatus.PENDING => TransitStatus.DISPATCHED,
                TransitStatus.DISPATCHED => TransitStatus.IN_TRANSIT,
                TransitStatus.IN_TRANSIT => TransitStatus.ARRIVED,
                TransitStatus.ARRIVED => TransitStatus.DELIVERED,
                _ => TransitStatus.DELIVERED
            };
            var id = SelectedTransit.Id;
            _store.UpdateTransitStatus(id, next, ReceiverName);
            Refresh();
            SelectedTransit = Transits.FirstOrDefault(x => x.Id == id);
            StatusMessage = $"Transit {SelectedTransit?.ReferenceNumber} updated to {SelectedTransit?.StatusLabel}.";
        });

        Refresh();
        SelectedTransit = Transits.FirstOrDefault();
    }

    public void Refresh()
    {
        Transits.Clear();
        foreach (var t in _store.GetTransits()) Transits.Add(t);
    }
}

public class GatePassesViewModel : ViewModelBase
{
    private readonly IAdminStoreService _store;
    private string _statusMessage = string.Empty;

    public ObservableCollection<GatePassRequest> GatePasses { get; } = new();

    public string StatusMessage
    {
        get => _statusMessage;
        set => SetProperty(ref _statusMessage, value);
    }

    public RelayCommand CompleteGatePassCommand { get; }
    public RelayCommand RefreshCommand { get; }

    public GatePassesViewModel(IAdminStoreService store)
    {
        _store = store;

        RefreshCommand = new RelayCommand(Refresh);
        CompleteGatePassCommand = new RelayCommand(param =>
        {
            if (param is not GatePassRequest gp) return;
            _store.CompleteGatePass(gp.Id);
            Refresh();
            StatusMessage = $"Gate Pass completed for {gp.VehicleLabel} (Token: {gp.ReleaseToken}).";
        });

        Refresh();
    }

    public void Refresh()
    {
        GatePasses.Clear();
        foreach (var gp in _store.GetGatePassRequests()) GatePasses.Add(gp);
    }
}
