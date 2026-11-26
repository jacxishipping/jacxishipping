using System.Collections.ObjectModel;
using JacxiShipping.WindowsApp.Models;
using JacxiShipping.WindowsApp.Services;

namespace JacxiShipping.WindowsApp.ViewModels;

public class CalculatorViewModel : ViewModelBase
{
    private readonly IRateCalculatorService _calculatorService;
    private readonly IShipmentService _shipmentService;

    private string _selectedState = "TX";
    private string _selectedDestination = "Port of Mersin, Turkey";
    private string _selectedVehicleCategory = "Standard Sedan / Compact";
    private string _vinInput = "1HGCR2F83HA001234";
    private string _customerNameInput = "Al-Madina Auto Traders";
    private string _customerPhoneInput = "+971 50 123 4567";
    private string _makeModelInput = "2024 Honda Accord Touring";
    private string _successMessage = string.Empty;

    private RateQuote _currentQuote = new();

    public ObservableCollection<string> States { get; } = new();
    public ObservableCollection<string> Destinations { get; } = new();
    public ObservableCollection<string> VehicleCategories { get; } = new();

    public string SelectedState
    {
        get => _selectedState;
        set
        {
            if (SetProperty(ref _selectedState, value))
            {
                Recalculate();
            }
        }
    }

    public string SelectedDestination
    {
        get => _selectedDestination;
        set
        {
            if (SetProperty(ref _selectedDestination, value))
            {
                Recalculate();
            }
        }
    }

    public string SelectedVehicleCategory
    {
        get => _selectedVehicleCategory;
        set
        {
            if (SetProperty(ref _selectedVehicleCategory, value))
            {
                Recalculate();
            }
        }
    }

    public string VinInput
    {
        get => _vinInput;
        set => SetProperty(ref _vinInput, value);
    }

    public string CustomerNameInput
    {
        get => _customerNameInput;
        set => SetProperty(ref _customerNameInput, value);
    }

    public string CustomerPhoneInput
    {
        get => _customerPhoneInput;
        set => SetProperty(ref _customerPhoneInput, value);
    }

    public string MakeModelInput
    {
        get => _makeModelInput;
        set => SetProperty(ref _makeModelInput, value);
    }

    public string SuccessMessage
    {
        get => _successMessage;
        set => SetProperty(ref _successMessage, value);
    }

    public RateQuote CurrentQuote
    {
        get => _currentQuote;
        set => SetProperty(ref _currentQuote, value);
    }

    public RelayCommand CreateBookingCommand { get; }

    public CalculatorViewModel(IRateCalculatorService calculatorService, IShipmentService shipmentService)
    {
        _calculatorService = calculatorService;
        _shipmentService = shipmentService;

        foreach (var s in _calculatorService.GetSupportedStates()) States.Add(s);
        foreach (var d in _calculatorService.GetSupportedDestinations()) Destinations.Add(d);
        foreach (var v in _calculatorService.GetVehicleCategories()) VehicleCategories.Add(v);

        Recalculate();

        CreateBookingCommand = new RelayCommand(() =>
        {
            var parts = (MakeModelInput ?? "2024 Vehicle").Split(' ', 3);
            int year = 2024;
            string make = "Toyota";
            string model = "Camry";

            if (parts.Length > 0 && int.TryParse(parts[0], out var y)) year = y;
            if (parts.Length > 1) make = parts[1];
            if (parts.Length > 2) model = parts[2];

            var shipment = new Shipment
            {
                CustomerName = string.IsNullOrWhiteSpace(CustomerNameInput) ? "Valued Client" : CustomerNameInput,
                CustomerPhone = CustomerPhoneInput,
                OriginPort = $"Port of {GetPortForState(SelectedState)}",
                DestinationPort = SelectedDestination,
                Status = ShipmentStatus.Booked,
                OceanFreightCost = CurrentQuote.OceanFreight * CurrentQuote.Multiplier,
                InlandTowingCost = CurrentQuote.InlandTowing,
                DocumentationFee = CurrentQuote.DocumentationFee + CurrentQuote.TerminalHandling,
                Vehicle = new VehicleInspection
                {
                    Vin = string.IsNullOrWhiteSpace(VinInput) ? $"VIN{Random.Shared.Next(10000000, 99999999)}" : VinInput.Trim(),
                    Year = year,
                    Make = make,
                    Model = model,
                    AuctionYard = CurrentQuote.OriginYard,
                    TitleStatus = "Clean Export Title",
                    RunsAndDrives = true,
                    HasKeys = true
                }
            };

            _shipmentService.AddShipment(shipment);
            SuccessMessage = $"Booking created successfully! Tracking Number: {shipment.TrackingNumber} (Total: {shipment.TotalCostFormatted})";
        });
    }

    private void Recalculate()
    {
        if (string.IsNullOrWhiteSpace(SelectedState) || string.IsNullOrWhiteSpace(SelectedDestination)) return;
        CurrentQuote = _calculatorService.CalculateQuote(SelectedState, SelectedDestination, SelectedVehicleCategory);
        SuccessMessage = string.Empty;
    }

    private static string GetPortForState(string state)
    {
        return state switch
        {
            "NJ" or "NY" or "PA" or "CT" or "MA" => "Newark, NJ",
            "GA" or "FL" or "NC" or "SC" => "Savannah, GA",
            "TX" or "LA" or "OK" => "Houston, TX",
            "CA" or "AZ" or "NV" or "WA" or "OR" => "Los Angeles, CA",
            _ => "Newark, NJ"
        };
    }
}
