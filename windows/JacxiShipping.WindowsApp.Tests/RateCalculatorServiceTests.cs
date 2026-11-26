using JacxiShipping.WindowsApp.Services;
using Xunit;

namespace JacxiShipping.WindowsApp.Tests;

public class RateCalculatorServiceTests
{
    [Fact]
    public void CalculateQuote_TexasToMersin_CalculatesAccurateTotal()
    {
        var service = new RateCalculatorService();
        var quote = service.CalculateQuote("TX", "Port of Mersin, Turkey", "Standard Sedan / Compact");

        Assert.Equal("TX", quote.OriginState);
        Assert.Equal(350m, quote.InlandTowing);
        Assert.Equal(1350m, quote.OceanFreight);
        Assert.Equal(1.0m, quote.Multiplier);
        Assert.Equal(120m, quote.TerminalHandling);
        Assert.Equal(150m, quote.DocumentationFee);

        // Expected: (350 + 1350) * 1.0 + 120 + 150 = 1700 + 270 = 1970
        Assert.Equal(1970m, quote.Total);
        Assert.Equal("$1,970", quote.FormattedTotal);
    }

    [Fact]
    public void CalculateQuote_AppliesVehicleMultiplier()
    {
        var service = new RateCalculatorService();
        var sedanQuote = service.CalculateQuote("TX", "Port of Mersin, Turkey", "Standard Sedan / Compact");
        var suvQuote = service.CalculateQuote("TX", "Port of Mersin, Turkey", "Mid-Size SUV / Crossover");
        var truckQuote = service.CalculateQuote("TX", "Port of Mersin, Turkey", "Large SUV / Full-Size Truck");

        Assert.True(suvQuote.Total > sedanQuote.Total);
        Assert.True(truckQuote.Total > suvQuote.Total);
        Assert.Equal(1.15m, suvQuote.Multiplier);
        Assert.Equal(1.30m, truckQuote.Multiplier);
    }

    [Fact]
    public void GetSupportedOptions_ReturnsExpectedValues()
    {
        var service = new RateCalculatorService();
        var states = service.GetSupportedStates();
        var destinations = service.GetSupportedDestinations();
        var categories = service.GetVehicleCategories();

        Assert.Contains("TX", states);
        Assert.Contains("NJ", states);
        Assert.Contains("CA", states);
        Assert.Contains("Port of Mersin, Turkey", destinations);
        Assert.Contains("Jebel Ali Port, Dubai, UAE", destinations);
        Assert.Contains("Islam Qala Border, Afghanistan (via Bandar Abbas)", destinations);
        Assert.Equal(5, categories.Count);
    }
}
