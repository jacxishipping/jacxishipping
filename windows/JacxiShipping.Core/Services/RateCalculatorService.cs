using JacxiShipping.WindowsApp.Models;

namespace JacxiShipping.WindowsApp.Services;

public class RateCalculatorService : IRateCalculatorService
{
    private static readonly Dictionary<string, decimal> StateInlandRates = new(StringComparer.OrdinalIgnoreCase)
    {
        ["NJ"] = 280m, ["NY"] = 320m, ["PA"] = 380m, ["CT"] = 350m, ["MA"] = 420m,
        ["MD"] = 390m, ["DE"] = 360m, ["VA"] = 480m, ["NC"] = 520m, ["SC"] = 450m,
        ["GA"] = 350m, ["FL"] = 420m, ["AL"] = 480m, ["TN"] = 550m, ["TX"] = 350m,
        ["LA"] = 480m, ["OK"] = 580m, ["AR"] = 590m, ["OH"] = 620m, ["MI"] = 680m,
        ["IN"] = 650m, ["IL"] = 690m, ["MO"] = 720m, ["KY"] = 610m, ["CA"] = 380m,
        ["AZ"] = 550m, ["NV"] = 580m, ["OR"] = 720m, ["WA"] = 750m, ["CO"] = 920m,
        ["UT"] = 980m, ["ID"] = 1050m, ["MN"] = 820m, ["WI"] = 780m, ["IA"] = 790m
    };

    private static readonly Dictionary<string, decimal> DestinationOceanRates = new(StringComparer.OrdinalIgnoreCase)
    {
        ["Port of Mersin, Turkey"] = 1350m,
        ["Jebel Ali Port, Dubai, UAE"] = 1250m,
        ["Port of Poti, Georgia"] = 1450m,
        ["Hairatan Border, Afghanistan (via Mersin/Bandar Abbas)"] = 2100m,
        ["Islam Qala Border, Afghanistan (via Bandar Abbas)"] = 2250m
    };

    private static readonly Dictionary<string, decimal> VehicleMultipliers = new(StringComparer.OrdinalIgnoreCase)
    {
        ["Standard Sedan / Compact"] = 1.0m,
        ["Mid-Size SUV / Crossover"] = 1.15m,
        ["Large SUV / Full-Size Truck"] = 1.30m,
        ["Heavy Machinery / Commercial"] = 1.75m,
        ["Motorcycle"] = 0.60m
    };

    public IReadOnlyList<string> GetSupportedStates() => StateInlandRates.Keys.OrderBy(k => k).ToList();

    public IReadOnlyList<string> GetSupportedDestinations() => DestinationOceanRates.Keys.ToList();

    public IReadOnlyList<string> GetVehicleCategories() => VehicleMultipliers.Keys.ToList();

    public RateQuote CalculateQuote(string stateCode, string destination, string vehicleCategory)
    {
        if (!StateInlandRates.TryGetValue(stateCode, out var inland))
        {
            inland = 500m;
        }

        if (!DestinationOceanRates.TryGetValue(destination, out var ocean))
        {
            ocean = 1350m;
        }

        if (!VehicleMultipliers.TryGetValue(vehicleCategory, out var multiplier))
        {
            multiplier = 1.0m;
        }

        const decimal terminalHandling = 120m;
        const decimal docFee = 150m;

        return new RateQuote
        {
            OriginState = stateCode.ToUpperInvariant(),
            OriginYard = $"Auction Yards, {stateCode.ToUpperInvariant()}",
            Destination = destination,
            VehicleType = vehicleCategory,
            Multiplier = multiplier,
            InlandTowing = inland,
            OceanFreight = ocean,
            TerminalHandling = terminalHandling,
            DocumentationFee = docFee
        };
    }
}
