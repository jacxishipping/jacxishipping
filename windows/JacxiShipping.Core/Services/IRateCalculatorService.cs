using JacxiShipping.WindowsApp.Models;

namespace JacxiShipping.WindowsApp.Services;

public interface IRateCalculatorService
{
    IReadOnlyList<string> GetSupportedStates();
    IReadOnlyList<string> GetSupportedDestinations();
    IReadOnlyList<string> GetVehicleCategories();
    RateQuote CalculateQuote(string stateCode, string destination, string vehicleCategory);
}
