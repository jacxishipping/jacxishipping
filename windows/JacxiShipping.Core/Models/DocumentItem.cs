namespace JacxiShipping.WindowsApp.Models;

public class DocumentItem
{
    public string DocumentId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Type { get; set; } = "Bill of Lading";
    public string TrackingNumber { get; set; } = string.Empty;
    public string ContainerNumber { get; set; } = string.Empty;
    public string GeneratedDate { get; set; } = DateTime.UtcNow.ToString("yyyy-MM-dd");
    public string FileSize { get; set; } = "1.2 MB";
    public string Status { get; set; } = "Verified";
}
