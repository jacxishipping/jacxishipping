namespace JacxiShipping.WindowsApp.Models;

public class DashboardStats
{
    public int TotalShipments { get; set; }
    public int ActiveInTransit { get; set; }
    public int CustomsPending { get; set; }
    public int DeliveredMonth { get; set; }
    public decimal TotalRevenue { get; set; }

    // Online Admin Dashboard Parity Metrics
    public int ActiveShipmentsCount { get; set; }
    public int ActiveContainersCount { get; set; }
    public int TotalContainersCount { get; set; }
    public int ActiveDispatchesCount { get; set; }
    public int ActiveTransitsCount { get; set; }
    public int OverdueInvoicesCount { get; set; }
    public int PendingInvoicesCount { get; set; }
    public int PendingGatePassesCount { get; set; }
    public decimal PendingInvoicesTotal { get; set; }
    public decimal CollectedRevenueTotal { get; set; }
    public decimal OfficeExpensesTotal { get; set; }
    public decimal GrossProfitTotal { get; set; }

    public string TotalRevenueFormatted => $"${TotalRevenue:N0}";
    public string PendingInvoicesFormatted => $"${PendingInvoicesTotal:N0}";
    public string CollectedRevenueFormatted => $"${CollectedRevenueTotal:N0}";
    public string OfficeExpensesFormatted => $"${OfficeExpensesTotal:N0}";
    public string GrossProfitFormatted => $"${GrossProfitTotal:N0}";
}
