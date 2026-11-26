namespace JacxiShipping.WindowsApp.Models;

public class RateQuote
{
    public string OriginState { get; set; } = "TX";
    public string OriginYard { get; set; } = "Copart Dallas, TX";
    public string Destination { get; set; } = "Port of Mersin, Turkey";
    public string VehicleType { get; set; } = "Standard Sedan";
    public decimal Multiplier { get; set; } = 1.0m;

    public decimal InlandTowing { get; set; } = 350m;
    public decimal OceanFreight { get; set; } = 1350m;
    public decimal TerminalHandling { get; set; } = 120m;
    public decimal DocumentationFee { get; set; } = 150m;

    public decimal Total => (InlandTowing + OceanFreight) * Multiplier + TerminalHandling + DocumentationFee;
    public string FormattedTotal => $"${Total:N0}";
}
