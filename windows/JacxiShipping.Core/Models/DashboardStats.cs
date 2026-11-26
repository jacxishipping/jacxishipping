namespace JacxiShipping.WindowsApp.Models;

public class DashboardStats
{
    public int TotalShipments { get; set; } = 158;
    public int ActiveInTransit { get; set; } = 89;
    public int CustomsPending { get; set; } = 12;
    public int DeliveredMonth { get; set; } = 42;
    public decimal TotalRevenue { get; set; } = 482500m;

    public string TotalRevenueFormatted => $"${TotalRevenue:N0}";
}
