using JacxiShipping.WindowsApp.Models;
using JacxiShipping.WindowsApp.Services;

namespace JacxiShipping.WindowsApp.ViewModels;

public class TrackingViewModel : ViewModelBase
{
    private readonly IShipmentService _shipmentService;
    private string _searchNumber = "JCX-2601-88491";
    private Shipment? _trackedShipment;
    private string _errorMessage = string.Empty;

    public string SearchNumber
    {
        get => _searchNumber;
        set => SetProperty(ref _searchNumber, value);
    }

    public Shipment? TrackedShipment
    {
        get => _trackedShipment;
        set => SetProperty(ref _trackedShipment, value);
    }

    public string ErrorMessage
    {
        get => _errorMessage;
        set => SetProperty(ref _errorMessage, value);
    }

    public RelayCommand TrackCommand { get; }
    public RelayCommand QuickSearchCommand { get; }

    public TrackingViewModel(IShipmentService shipmentService)
    {
        _shipmentService = shipmentService;

        TrackCommand = new RelayCommand(PerformLookup);
        QuickSearchCommand = new RelayCommand(param =>
        {
            if (param is string query)
            {
                SearchNumber = query;
                PerformLookup();
            }
        });

        PerformLookup();
    }

    public void PerformLookup()
    {
        ErrorMessage = string.Empty;
        if (string.IsNullOrWhiteSpace(SearchNumber))
        {
            ErrorMessage = "Please enter a tracking number or VIN.";
            TrackedShipment = null;
            return;
        }

        var found = _shipmentService.GetByTrackingNumber(SearchNumber) ?? _shipmentService.GetByVin(SearchNumber);
        if (found == null)
        {
            // Case-insensitive fallback partial search
            found = _shipmentService.SearchShipments(SearchNumber, null).FirstOrDefault();
        }

        if (found != null)
        {
            TrackedShipment = found;
        }
        else
        {
            TrackedShipment = null;
            ErrorMessage = $"No active shipment found matching \"{SearchNumber}\".";
        }
    }
}
