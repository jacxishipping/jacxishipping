using System.Collections.ObjectModel;
using JacxiShipping.WindowsApp.Models;
using JacxiShipping.WindowsApp.Services;

namespace JacxiShipping.WindowsApp.ViewModels;

public class ContainersViewModel : ViewModelBase
{
    private readonly IAdminStoreService _store;
    private ContainerRecord? _selectedContainer;
    private string _searchQuery = string.Empty;
    private string _statusMessage = string.Empty;
    private bool _isCreateOpen;

    private string _newContainerNumber = string.Empty;
    private string _newVesselName = "MSC MEDITERRANEAN V";
    private string _newVoyage = "TX2026-C";
    private string _newShippingLine = "MSC";
    private string _newLoadingPort = "Port of Newark, NJ";
    private string _newDestinationPort = "Port of Mersin, Turkey";
    private string _newMaxCapacity = "4";

    public ObservableCollection<ContainerRecord> FilteredContainers { get; } = new();
    public ObservableCollection<Shipment> ContainerShipments { get; } = new();
    public ObservableCollection<Shipment> UnassignedShipments { get; } = new();

    public ContainerRecord? SelectedContainer
    {
        get => _selectedContainer;
        set
        {
            if (SetProperty(ref _selectedContainer, value))
                LoadSelectedContainerShipments();
        }
    }

    public string SearchQuery
    {
        get => _searchQuery;
        set { if (SetProperty(ref _searchQuery, value)) Refresh(); }
    }

    public string StatusMessage
    {
        get => _statusMessage;
        set => SetProperty(ref _statusMessage, value);
    }

    public bool IsCreateOpen
    {
        get => _isCreateOpen;
        set => SetProperty(ref _isCreateOpen, value);
    }

    public string NewContainerNumber { get => _newContainerNumber; set => SetProperty(ref _newContainerNumber, value); }
    public string NewVesselName { get => _newVesselName; set => SetProperty(ref _newVesselName, value); }
    public string NewVoyage { get => _newVoyage; set => SetProperty(ref _newVoyage, value); }
    public string NewShippingLine { get => _newShippingLine; set => SetProperty(ref _newShippingLine, value); }
    public string NewLoadingPort { get => _newLoadingPort; set => SetProperty(ref _newLoadingPort, value); }
    public string NewDestinationPort { get => _newDestinationPort; set => SetProperty(ref _newDestinationPort, value); }
    public string NewMaxCapacity { get => _newMaxCapacity; set => SetProperty(ref _newMaxCapacity, value); }

    public RelayCommand ToggleCreateCommand { get; }
    public RelayCommand CreateContainerCommand { get; }
    public RelayCommand AdvanceLifecycleCommand { get; }
    public RelayCommand AssignShipmentCommand { get; }

    public ContainersViewModel(IAdminStoreService store)
    {
        _store = store;

        ToggleCreateCommand = new RelayCommand(() => IsCreateOpen = !IsCreateOpen);

        CreateContainerCommand = new RelayCommand(() =>
        {
            int.TryParse(NewMaxCapacity, out var cap);
            if (cap <= 0) cap = 4;

            var c = new ContainerRecord
            {
                ContainerNumber = string.IsNullOrWhiteSpace(NewContainerNumber)
                    ? $"MSCU{Random.Shared.Next(1000000, 9999999)}"
                    : NewContainerNumber.Trim().ToUpperInvariant(),
                VesselName = NewVesselName,
                VoyageNumber = NewVoyage,
                ShippingLine = NewShippingLine,
                CompanyName = NewShippingLine + " Line",
                LoadingPort = NewLoadingPort,
                DestinationPort = NewDestinationPort,
                MaxCapacity = cap,
                Status = ContainerLifecycleStatus.CREATED,
                Progress = 10
            };

            _store.AddContainer(c);
            IsCreateOpen = false;
            NewContainerNumber = string.Empty;
            Refresh();
            SelectedContainer = c;
            StatusMessage = $"Created container {c.ContainerNumber}.";
        });

        AdvanceLifecycleCommand = new RelayCommand(() =>
        {
            if (SelectedContainer == null) return;
            var next = SelectedContainer.Status switch
            {
                ContainerLifecycleStatus.CREATED => ContainerLifecycleStatus.WAITING_FOR_LOADING,
                ContainerLifecycleStatus.WAITING_FOR_LOADING => ContainerLifecycleStatus.LOADED,
                ContainerLifecycleStatus.LOADED => ContainerLifecycleStatus.IN_TRANSIT,
                ContainerLifecycleStatus.IN_TRANSIT => ContainerLifecycleStatus.ARRIVED_PORT,
                ContainerLifecycleStatus.ARRIVED_PORT => ContainerLifecycleStatus.CUSTOMS_CLEARANCE,
                ContainerLifecycleStatus.CUSTOMS_CLEARANCE => ContainerLifecycleStatus.RELEASED,
                ContainerLifecycleStatus.RELEASED => ContainerLifecycleStatus.CLOSED,
                _ => ContainerLifecycleStatus.CLOSED
            };

            var id = SelectedContainer.Id;
            _store.UpdateContainerStatus(id, next);
            Refresh();
            SelectedContainer = FilteredContainers.FirstOrDefault(x => x.Id == id) ?? FilteredContainers.FirstOrDefault();
            StatusMessage = $"Container {SelectedContainer?.ContainerNumber} moved to {SelectedContainer?.StatusLabel} ({SelectedContainer?.Progress}%).";
        });

        AssignShipmentCommand = new RelayCommand(param =>
        {
            if (SelectedContainer == null || param is not Shipment shp) return;
            var cid = SelectedContainer.Id;
            _store.AssignShipmentToContainer(shp.Id, cid);
            Refresh();
            SelectedContainer = FilteredContainers.FirstOrDefault(x => x.Id == cid);
            StatusMessage = $"Assigned {shp.Vehicle.FullDescription} to {SelectedContainer?.ContainerNumber}.";
        });

        Refresh();
        SelectedContainer = FilteredContainers.FirstOrDefault();
    }

    public void Refresh()
    {
        var q = (SearchQuery ?? string.Empty).Trim().ToLowerInvariant();
        var items = _store.GetContainers().Where(c =>
            string.IsNullOrEmpty(q) ||
            c.ContainerNumber.ToLowerInvariant().Contains(q) ||
            c.VesselName.ToLowerInvariant().Contains(q) ||
            c.DestinationPort.ToLowerInvariant().Contains(q));

        FilteredContainers.Clear();
        foreach (var c in items) FilteredContainers.Add(c);
        LoadSelectedContainerShipments();
    }

    private void LoadSelectedContainerShipments()
    {
        ContainerShipments.Clear();
        UnassignedShipments.Clear();

        var allShipments = _store.GetShipments();
        if (SelectedContainer != null)
        {
            foreach (var s in allShipments.Where(x => x.ContainerId == SelectedContainer.Id || x.ContainerNumber == SelectedContainer.ContainerNumber))
            {
                ContainerShipments.Add(s);
            }
        }

        foreach (var s in allShipments.Where(x => string.IsNullOrWhiteSpace(x.ContainerId)))
        {
            UnassignedShipments.Add(s);
        }
    }
}
