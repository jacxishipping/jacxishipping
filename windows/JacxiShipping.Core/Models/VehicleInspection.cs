namespace JacxiShipping.WindowsApp.Models;

public class VehicleInspection
{
    public string Vin { get; set; } = string.Empty;
    public int Year { get; set; }
    public string Make { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public string LotNumber { get; set; } = string.Empty;
    public string AuctionYard { get; set; } = string.Empty;
    public bool RunsAndDrives { get; set; } = true;
    public bool HasKeys { get; set; } = true;
    public string TitleStatus { get; set; } = "Clean / Exportable";
    public string ConditionNotes { get; set; } = "Minor scratch on front bumper; interior clean.";
    public int PhotoCount { get; set; } = 12;

    public string FullDescription => $"{Year} {Make} {Model}".Trim();
}
