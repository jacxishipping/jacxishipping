using ClosedXML.Excel;
using JacxiShipping.WindowsApp.Models;

namespace JacxiShipping.WindowsApp.Services;

public interface IExcelExportService
{
    string ExportShipmentsWorkbook(IEnumerable<Shipment> shipments, string outputPath);
    string ExportContainersWorkbook(IEnumerable<ContainerRecord> containers, string outputPath);
    string ExportLedgerWorkbook(IEnumerable<LedgerEntryRecord> entries, IEnumerable<AdminUser> balances, string outputPath);
}

public class ExcelExportService : IExcelExportService
{
    public string ExportShipmentsWorkbook(IEnumerable<Shipment> shipments, string outputPath)
    {
        EnsureDirectory(outputPath);
        using var wb = new XLWorkbook();
        var ws = wb.Worksheets.Add("Shipments");

        var headers = new[]
        {
            "Tracking #", "Container #", "Customer", "Vehicle", "VIN", "Lot #",
            "Auction Yard", "Origin Port", "Destination Port", "Workflow Stage",
            "Status", "Payment", "Total Cost", "Company Fare", "Gross Margin", "Release Token"
        };

        WriteHeaderRow(ws, headers);

        int row = 2;
        foreach (var s in shipments)
        {
            ws.Cell(row, 1).Value = s.TrackingNumber;
            ws.Cell(row, 2).Value = s.ContainerNumber;
            ws.Cell(row, 3).Value = s.CustomerName;
            ws.Cell(row, 4).Value = s.Vehicle.FullDescription;
            ws.Cell(row, 5).Value = s.Vehicle.Vin;
            ws.Cell(row, 6).Value = s.Vehicle.LotNumber;
            ws.Cell(row, 7).Value = s.Vehicle.AuctionYard;
            ws.Cell(row, 8).Value = s.OriginPort;
            ws.Cell(row, 9).Value = s.DestinationPort;
            ws.Cell(row, 10).Value = s.SimpleStatusLabel;
            ws.Cell(row, 11).Value = s.StatusDisplayText;
            ws.Cell(row, 12).Value = s.PaymentStatus.ToString();
            ws.Cell(row, 13).Value = s.TotalCost;
            ws.Cell(row, 14).Value = s.CompanyShippingFare;
            ws.Cell(row, 15).Value = s.GrossMargin;
            ws.Cell(row, 16).Value = s.ReleaseToken ?? "";

            ws.Cell(row, 13).Style.NumberFormat.Format = "$#,##0.00";
            ws.Cell(row, 14).Style.NumberFormat.Format = "$#,##0.00";
            ws.Cell(row, 15).Style.NumberFormat.Format = "$#,##0.00";
            row++;
        }

        ws.Columns().AdjustToContents();
        wb.SaveAs(outputPath);
        return outputPath;
    }

    public string ExportContainersWorkbook(IEnumerable<ContainerRecord> containers, string outputPath)
    {
        EnsureDirectory(outputPath);
        using var wb = new XLWorkbook();
        var ws = wb.Worksheets.Add("Containers");

        var headers = new[]
        {
            "Container #", "Tracking #", "Shipping Line", "Vessel", "Voyage",
            "Loading Port", "Destination Port", "Status", "Progress %",
            "Vehicles Loaded", "Max Capacity", "ETA", "Total Expenses"
        };

        WriteHeaderRow(ws, headers);

        int row = 2;
        foreach (var c in containers)
        {
            ws.Cell(row, 1).Value = c.ContainerNumber;
            ws.Cell(row, 2).Value = c.TrackingNumber;
            ws.Cell(row, 3).Value = c.ShippingLine;
            ws.Cell(row, 4).Value = c.VesselName;
            ws.Cell(row, 5).Value = c.VoyageNumber;
            ws.Cell(row, 6).Value = c.LoadingPort;
            ws.Cell(row, 7).Value = c.DestinationPort;
            ws.Cell(row, 8).Value = c.StatusLabel;
            ws.Cell(row, 9).Value = c.Progress;
            ws.Cell(row, 10).Value = c.CurrentCount;
            ws.Cell(row, 11).Value = c.MaxCapacity;
            ws.Cell(row, 12).Value = c.EstimatedArrival;
            ws.Cell(row, 13).Value = c.ExpensesTotal;
            ws.Cell(row, 13).Style.NumberFormat.Format = "$#,##0.00";
            row++;
        }

        ws.Columns().AdjustToContents();
        wb.SaveAs(outputPath);
        return outputPath;
    }

    public string ExportLedgerWorkbook(IEnumerable<LedgerEntryRecord> entries, IEnumerable<AdminUser> balances, string outputPath)
    {
        EnsureDirectory(outputPath);
        using var wb = new XLWorkbook();

        var ledgerSheet = wb.Worksheets.Add("General Ledger");
        WriteHeaderRow(ledgerSheet, new[] { "Date", "Account", "Description", "Type", "Amount", "Running Balance", "Created By" });
        int row = 2;
        foreach (var e in entries)
        {
            ledgerSheet.Cell(row, 1).Value = e.TransactionDate;
            ledgerSheet.Cell(row, 2).Value = e.CustomerName;
            ledgerSheet.Cell(row, 3).Value = e.Description;
            ledgerSheet.Cell(row, 4).Value = e.Type.ToString();
            ledgerSheet.Cell(row, 5).Value = e.Type == LedgerEntryType.CREDIT ? e.Amount : -e.Amount;
            ledgerSheet.Cell(row, 6).Value = e.Balance;
            ledgerSheet.Cell(row, 7).Value = e.CreatedBy;
            ledgerSheet.Cell(row, 5).Style.NumberFormat.Format = "$#,##0.00";
            ledgerSheet.Cell(row, 6).Style.NumberFormat.Format = "$#,##0.00";
            row++;
        }
        ledgerSheet.Columns().AdjustToContents();

        var balSheet = wb.Worksheets.Add("Customer Balances");
        WriteHeaderRow(balSheet, new[] { "Customer", "Email", "Phone", "City", "Country", "Collection Status", "Shipments", "Balance Due" });
        row = 2;
        foreach (var u in balances)
        {
            balSheet.Cell(row, 1).Value = u.Name;
            balSheet.Cell(row, 2).Value = u.Email;
            balSheet.Cell(row, 3).Value = u.Phone;
            balSheet.Cell(row, 4).Value = u.City;
            balSheet.Cell(row, 5).Value = u.Country;
            balSheet.Cell(row, 6).Value = u.CollectionStatus.ToString();
            balSheet.Cell(row, 7).Value = u.ShipmentCount;
            balSheet.Cell(row, 8).Value = u.Balance;
            balSheet.Cell(row, 8).Style.NumberFormat.Format = "$#,##0.00";
            row++;
        }
        balSheet.Columns().AdjustToContents();

        wb.SaveAs(outputPath);
        return outputPath;
    }

    private static void WriteHeaderRow(IXLWorksheet ws, string[] headers)
    {
        for (int i = 0; i < headers.Length; i++)
        {
            var cell = ws.Cell(1, i + 1);
            cell.Value = headers[i];
            cell.Style.Font.Bold = true;
            cell.Style.Font.FontColor = XLColor.White;
            cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#111827");
            cell.Style.Border.BottomBorder = XLBorderStyleValues.Medium;
            cell.Style.Border.BottomBorderColor = XLColor.FromHtml("#D4AF37");
        }
    }

    private static void EnsureDirectory(string path)
    {
        var dir = Path.GetDirectoryName(path);
        if (!string.IsNullOrWhiteSpace(dir)) Directory.CreateDirectory(dir);
    }
}
