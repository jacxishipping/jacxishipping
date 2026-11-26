namespace JacxiShipping.WindowsApp.Models;

public class ShipmentMilestone
{
    public string Title { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public string Timestamp { get; set; } = string.Empty;
    public bool IsCompleted { get; set; }
    public bool IsCurrent { get; set; }
    public string Description { get; set; } = string.Empty;

    public ShipmentMilestone() { }

    public ShipmentMilestone(string title, string location, string timestamp, bool isCompleted, bool isCurrent, string description)
    {
        Title = title;
        Location = location;
        Timestamp = timestamp;
        IsCompleted = isCompleted;
        IsCurrent = isCurrent;
        Description = description;
    }
}
