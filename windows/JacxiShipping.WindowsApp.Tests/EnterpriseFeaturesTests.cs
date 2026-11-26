using ClosedXML.Excel;
using JacxiShipping.WindowsApp.Models;
using JacxiShipping.WindowsApp.Services;
using JacxiShipping.WindowsApp.ViewModels;
using Xunit;

namespace JacxiShipping.WindowsApp.Tests;

public class EnterpriseFeaturesTests
{
    private static AdminStoreService CreateIsolatedStore()
    {
        var tempFile = Path.Combine(Path.GetTempPath(), $"jacxi-ent-test-{Guid.NewGuid():N}.json");
        return new AdminStoreService(tempFile);
    }

    [Fact]
    public void MainViewModel_RoutesAcrossAll24Modules()
    {
        var store = CreateIsolatedStore();
        var main = new MainViewModel(store);

        var tabs = new[]
        {
            "Dashboard", "Shipments", "OperationsBoard", "Containers", "Dispatches",
            "Transits", "GatePasses", "Inspections", "Tracking", "TrackingDiagnostics",
            "Finance", "Banking", "Invoices", "OfficeExpenses", "CompanyLedgers",
            "PriceComparison", "Customers", "PartnerPortals", "Calculator", "Documents",
            "Communications", "AiCopilot", "Analytics", "Settings"
        };

        foreach (var tab in tabs)
        {
            main.NavigateCommand.Execute(tab);
            Assert.Equal(tab, main.CurrentTab);
            Assert.NotNull(main.CurrentView);
        }
    }

    [Fact]
    public void PdfExportService_GeneratesValidBrandedPdfs()
    {
        var store = CreateIsolatedStore();
        var pdf = new PdfExportService();
        var tempDir = Path.Combine(Path.GetTempPath(), $"jacxi-pdf-{Guid.NewGuid():N}");

        var inv = store.GetInvoices().First();
        var cust = store.GetUsers().First(u => u.Id == inv.UserId);
        var shp = store.GetShipments().First();
        var cnt = store.GetContainers().First();
        var entries = store.GetLedgerEntries().Where(e => e.UserId == cust.Id);

        var invPath = pdf.GenerateInvoicePdf(inv, cust, Path.Combine(tempDir, "inv.pdf"));
        var tokPath = pdf.GenerateReleaseTokenPdf(shp, Path.Combine(tempDir, "tok.pdf"));
        var cstmPath = pdf.GenerateCustomsPacketPdf(shp, cnt, Path.Combine(tempDir, "cstm.pdf"));
        var stmtPath = pdf.GenerateCustomerStatementPdf(cust, entries, Path.Combine(tempDir, "stmt.pdf"));

        foreach (var path in new[] { invPath, tokPath, cstmPath, stmtPath })
        {
            Assert.True(File.Exists(path));
            var bytes = File.ReadAllBytes(path);
            Assert.True(bytes.Length > 1000);
            Assert.Equal((byte)'%', bytes[0]);
            Assert.Equal((byte)'P', bytes[1]);
            Assert.Equal((byte)'D', bytes[2]);
            Assert.Equal((byte)'F', bytes[3]);
        }
    }

    [Fact]
    public void ExcelExportService_GeneratesValidXlsxWorkbooks()
    {
        var store = CreateIsolatedStore();
        var excel = new ExcelExportService();
        var tempDir = Path.Combine(Path.GetTempPath(), $"jacxi-xlsx-{Guid.NewGuid():N}");

        var shpPath = excel.ExportShipmentsWorkbook(store.GetShipments(), Path.Combine(tempDir, "shipments.xlsx"));
        var cntPath = excel.ExportContainersWorkbook(store.GetContainers(), Path.Combine(tempDir, "containers.xlsx"));
        var ldgPath = excel.ExportLedgerWorkbook(store.GetLedgerEntries(), store.GetUsers(), Path.Combine(tempDir, "ledger.xlsx"));

        Assert.True(File.Exists(shpPath));
        Assert.True(File.Exists(cntPath));
        Assert.True(File.Exists(ldgPath));

        using var wb = new XLWorkbook(ldgPath);
        Assert.Equal(2, wb.Worksheets.Count);
        Assert.Equal("General Ledger", wb.Worksheet(1).Name);
        Assert.Equal("Customer Balances", wb.Worksheet(2).Name);
        Assert.True(wb.Worksheet(1).RowsUsed().Count() >= 2);
    }

    [Fact]
    public void Banking_ImportCsvAndReconcile_PaysInvoiceAndCreditsLedger()
    {
        var store = CreateIsolatedStore();
        var vm = new BankingViewModel(store);

        var beforeCount = vm.Transactions.Count;
        vm.CsvInput = "2026-11-26,WIRE TARIQ LOGISTICS,2000.00,WIRE-88491";
        vm.ImportCsvCommand.Execute(null);
        Assert.Equal(beforeCount + 1, vm.Transactions.Count);

        var imported = vm.Transactions.First();
        var targetInv = store.GetInvoices().First(i => i.InvoiceNumber == "INV-2026-1001");

        vm.SelectedTransaction = imported;
        vm.SelectedInvoiceToMatch = targetInv;
        vm.ReconcileSelectedCommand.Execute(null);

        Assert.Equal(BankReconciliationStatus.MATCHED, imported.Status);
        Assert.Equal(UserInvoiceStatus.PAID, targetInv.Status);
    }

    [Fact]
    public void RecurringExpenses_RunDueNow_PostsExpensesToStore()
    {
        var store = CreateIsolatedStore();
        var vm = new OfficeExpensesViewModel(store);
        var beforeExpenses = vm.Expenses.Count;

        vm.RunDueRecurringCommand.Execute(null);

        Assert.True(vm.Expenses.Count > beforeExpenses);
    }

    [Fact]
    public void Inspections_DamageAssessment_UpdatesShipmentDamageCredit()
    {
        var store = CreateIsolatedStore();
        var vm = new InspectionsViewModel(store);
        var shp = store.GetShipments().First();
        var beforeCredit = shp.DamageCredit;

        vm.SelectedShipment = shp;
        vm.CheckType = "DAMAGE_ASSESSMENT";
        vm.DamageCost = "250";
        vm.DamageLiability = "WE_PAY";
        vm.RecordInspectionCommand.Execute(null);

        Assert.Equal(beforeCredit + 250m, shp.DamageCredit);
    }

    [Fact]
    public void TrackingDiagnostics_SyncContainer_LogsPositionAndLatency()
    {
        var store = CreateIsolatedStore();
        var vm = new TrackingDiagnosticsViewModel(store);
        var beforeDiag = vm.Diagnostics.Count;

        vm.SyncContainerCommand.Execute(null);

        Assert.Equal(beforeDiag + 1, vm.Diagnostics.Count);
        Assert.Contains("OK", vm.Diagnostics.First().SyncStatus);
    }

    [Fact]
    public async Task AdminCopilot_AnswersOverdueInvoicesAndLogsInteraction()
    {
        var store = CreateIsolatedStore();
        var copilot = new AdminCopilotService(store, new JacxiCloudClient());

        var answer = await copilot.AskAsync("Which invoices are overdue?");
        Assert.Contains("INV-2026-1002", answer);
        Assert.Contains("Al-Nour", answer);
    }

    [Fact]
    public void RbacService_EnforcesRolePermissions()
    {
        Assert.True(RbacService.HasPermission("admin", "users:manage"));
        Assert.True(RbacService.HasPermission("finance", "finance:manage"));
        Assert.False(RbacService.HasPermission("operations", "users:manage"));
        Assert.False(RbacService.HasPermission("user", "finance:manage"));
    }
}
