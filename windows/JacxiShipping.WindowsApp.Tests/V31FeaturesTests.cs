using JacxiShipping.WindowsApp.Models;
using JacxiShipping.WindowsApp.Services;
using JacxiShipping.WindowsApp.ViewModels;
using Xunit;

namespace JacxiShipping.WindowsApp.Tests;

public class V31FeaturesTests
{
    private static AdminStoreService CreateIsolatedStore()
    {
        var tempPath = Path.Combine(Path.GetTempPath(), $"jacxi-v31-{Guid.NewGuid():N}.json");
        return new AdminStoreService(tempPath);
    }

    private class MockPlatformService : IPlatformInteractionService
    {
        public bool IsDarkMode { get; private set; }
        public string? NextOpenFile { get; set; }
        public bool NextConfirm { get; set; } = true;
        public string? LastOpenedShellPath { get; private set; }
        public string? LastCopied { get; private set; }

        public string? OpenFileDialog(string title, string filter) => NextOpenFile;
        public string? SaveFileDialog(string title, string filter, string defaultFileName) => defaultFileName;
        public bool ConfirmAction(string title, string message, string confirmText = "Confirm", bool isDestructive = false) => NextConfirm;
        public bool OpenPathWithShell(string pathOrUrl)
        {
            LastOpenedShellPath = pathOrUrl;
            return true;
        }
        public void CopyToClipboard(string text) => LastCopied = text;
        public void SetThemeMode(bool isDarkMode) => IsDarkMode = isDarkMode;
    }

    [Fact]
    public void RateCalculator_ImportRatesFromCsv_OverridesInlandAndOceanTariffs()
    {
        var calc = new RateCalculatorService();
        var imported = calc.ImportRatesFromCsvOrText("TX,410\nPort of Mersin, Turkey,1490\n# comment\nINVALID");

        Assert.Equal(2, imported);
        var quote = calc.CalculateQuote("TX", "Port of Mersin, Turkey", "Standard Sedan / Compact");
        Assert.Equal(410m, quote.InlandTowing);
        Assert.Equal(1490m, quote.OceanFreight);
    }

    [Fact]
    public void AdminStore_MergeCloudPayload_HydratesWithoutDuplicates()
    {
        var store = CreateIsolatedStore();
        var existingCount = store.GetShipments().Count;
        var payload = new CloudSyncPayload
        {
            Success = true,
            Shipments = new List<Shipment>
            {
                new() { Id = "cloud-shp-1", TrackingNumber = "JCX-CLOUD-1", CustomerName = "Cloud Buyer", Vehicle = new VehicleInspection { Vin = "CLOUDVIN123456789", Make = "Lexus", Model = "LX600", Year = 2024 } }
            },
            Containers = new List<ContainerRecord>
            {
                new() { Id = "cloud-cnt-1", ContainerNumber = "MSCU9999999", VesselName = "MSC CLOUD" }
            },
            Invoices = new List<UserInvoiceRecord>
            {
                new() { Id = "cloud-inv-1", InvoiceNumber = "INV-CLOUD-99", Subtotal = 2500m }
            }
        };

        var merged = store.MergeCloudPayload(payload);
        Assert.Equal(3, merged);
        Assert.Equal(existingCount + 1, store.GetShipments().Count);
        Assert.Contains(store.GetContainers(), c => c.ContainerNumber == "MSCU9999999");

        // Second merge of same VIN updates in place rather than duplicating
        store.MergeCloudPayload(payload);
        Assert.Equal(existingCount + 1, store.GetShipments().Count);
    }

    [Fact]
    public void McpServerViewModel_RunToolAndRotateKey_UpdatesLogsAndClipboard()
    {
        var store = CreateIsolatedStore();
        var platform = new MockPlatformService();
        var vm = new McpServerViewModel(store, new JacxiCloudClient(), platform);

        vm.CopyEndpointCommand.Execute(null);
        Assert.Equal("https://jacxishipping.com/api/mcp", platform.LastCopied);

        var oldKey = vm.Config.ApiKey;
        vm.RegenerateKeyCommand.Execute(null);
        Assert.NotEqual(oldKey, vm.Config.ApiKey);

        vm.SelectedTool = vm.Tools.First(t => t.Name == "get_ar_summary");
        vm.RunToolCommand.Execute(null);
        Assert.Contains("Open A/R", vm.ToolOutputPreview);
    }

    [Fact]
    public void CallAgentAndProfileViewModels_UpdateConfigAndPasswordValidation()
    {
        var store = CreateIsolatedStore();
        var platform = new MockPlatformService();
        var callVm = new CallAgentSettingsViewModel(store, new JacxiCloudClient(), platform);
        callVm.CopyWebhookCommand.Execute(null);
        Assert.Contains("jacxishipping.com/api/voice/webhook", platform.LastCopied);

        var profVm = new ProfileViewModel(store, new JacxiCloudClient(), platform);
        profVm.Name = "Tariq Admin Desk";
        profVm.Phone = "+1 201 555 0100";
        profVm.SaveProfileCommand.Execute(null);
        Assert.Equal("Tariq Admin Desk", store.Session.CurrentAdmin.Name);

        profVm.NewPassword = "123";
        profVm.ChangePasswordCommand.Execute(null);
        Assert.Contains("at least 6", profVm.StatusMessage);

        var prevCode = profVm.LoginCode;
        profVm.RegenerateLoginCodeCommand.Execute(null);
        Assert.NotEqual(prevCode, profVm.LoginCode);
    }

    [Fact]
    public void PlatformIntegrations_BankingCsv_ThemeToggle_And_PortalLauncher_Work()
    {
        var store = CreateIsolatedStore();
        var platform = new MockPlatformService();

        var csvFile = Path.Combine(Path.GetTempPath(), $"bank-{Guid.NewGuid():N}.csv");
        File.WriteAllText(csvFile, "2026-11-26,TEST WIRE DEPOSIT,2150.00,WIRE-TEST-1");
        platform.NextOpenFile = csvFile;

        var bankVm = new BankingViewModel(store, platform);
        bankVm.BrowseCsvFileCommand.Execute(null);
        Assert.Contains(store.GetBankTransactions(), t => t.Reference == "WIRE-TEST-1");
        File.Delete(csvFile);

        var mainVm = new MainViewModel(store, platform);
        mainVm.Navigate("McpServer");
        Assert.Equal("MCP AI Gateway", mainVm.CurrentPageTitle);

        mainVm.ToggleThemeCommand.Execute(null);
        Assert.True(platform.IsDarkMode);

        mainVm.OpenWebPortalCommand.Execute(null);
        Assert.Equal("https://jacxishipping.com/dashboard", platform.LastOpenedShellPath);
    }
}
