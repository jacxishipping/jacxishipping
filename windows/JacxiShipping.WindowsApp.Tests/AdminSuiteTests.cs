using JacxiShipping.WindowsApp.Models;
using JacxiShipping.WindowsApp.Services;
using JacxiShipping.WindowsApp.ViewModels;
using Xunit;

namespace JacxiShipping.WindowsApp.Tests;

public class AdminSuiteTests
{
    private static AdminStoreService CreateIsolatedStore()
    {
        var tempFile = Path.Combine(Path.GetTempPath(), $"jacxi-admin-test-{Guid.NewGuid():N}.json");
        return new AdminStoreService(tempFile);
    }

    [Fact]
    public void MainViewModel_RoutesAcrossAllAdminModules()
    {
        var store = CreateIsolatedStore();
        var main = new MainViewModel(store);

        var tabs = new[]
        {
            "Dashboard", "Shipments", "OperationsBoard", "Containers", "Dispatches",
            "Transits", "GatePasses", "Tracking", "Finance", "Invoices",
            "OfficeExpenses", "CompanyLedgers", "Customers", "PartnerPortals",
            "Calculator", "Documents", "Analytics", "Settings"
        };

        foreach (var tab in tabs)
        {
            main.NavigateCommand.Execute(tab);
            Assert.Equal(tab, main.CurrentTab);
            Assert.NotNull(main.CurrentView);
        }
    }

    [Fact]
    public void OperationsBoard_AdvanceStage_MovesShipmentAcrossColumns()
    {
        var store = CreateIsolatedStore();
        var board = new OperationsBoardViewModel(store);

        var onHand = board.OnHandShipments.First();
        board.AdvanceStageCommand.Execute(onHand);

        Assert.DoesNotContain(board.OnHandShipments, s => s.Id == onHand.Id);
        Assert.Contains(board.DispatchingShipments, s => s.Id == onHand.Id);
    }

    [Fact]
    public void Containers_CreateAndAssignShipment_UpdatesCapacityAndCount()
    {
        var store = CreateIsolatedStore();
        var vm = new ContainersViewModel(store);

        vm.NewContainerNumber = "MSCU9990001";
        vm.NewDestinationPort = "Port of Mersin, Turkey";
        vm.CreateContainerCommand.Execute(null);

        Assert.NotNull(vm.SelectedContainer);
        Assert.Equal("MSCU9990001", vm.SelectedContainer.ContainerNumber);
        Assert.Equal(0, vm.SelectedContainer.CurrentCount);

        var unassigned = vm.UnassignedShipments.First();
        vm.AssignShipmentCommand.Execute(unassigned);

        Assert.Equal(1, vm.SelectedContainer.CurrentCount);
        Assert.Contains(vm.ContainerShipments, s => s.Id == unassigned.Id);
    }

    [Fact]
    public void Invoices_RecordPayment_UpdatesInvoiceAndPostsLedgerCredit()
    {
        var store = CreateIsolatedStore();
        var invVm = new InvoicesViewModel(store);
        var pending = invVm.Invoices.First(i => i.Status == UserInvoiceStatus.PENDING);

        var ledgerBefore = store.GetLedgerEntries().Count;
        var userBefore = store.GetUsers().First(u => u.Id == pending.UserId).Balance;

        invVm.SelectedInvoice = pending;
        invVm.PaymentAmount = "500";
        invVm.RecordPaymentCommand.Execute(null);

        Assert.Equal(UserInvoiceStatus.PARTIALLY_PAID, invVm.SelectedInvoice.Status);
        Assert.Equal(500m, invVm.SelectedInvoice.AmountPaid);
        Assert.Equal(ledgerBefore + 1, store.GetLedgerEntries().Count);
        Assert.Equal(userBefore - 500m, store.GetUsers().First(u => u.Id == pending.UserId).Balance);
    }

    [Fact]
    public void GatePasses_CompleteGatePass_MarksCompletedAndReleasesShipment()
    {
        var store = CreateIsolatedStore();
        var gpVm = new GatePassesViewModel(store);
        var pending = gpVm.GatePasses.First(g => g.Status != "COMPLETED");

        gpVm.CompleteGatePassCommand.Execute(pending);

        var updatedGp = store.GetGatePassRequests().First(g => g.Id == pending.Id);
        Assert.Equal("COMPLETED", updatedGp.Status);
        var shp = store.GetShipments().First(s => s.Id == pending.ShipmentId);
        Assert.Equal(ShipmentSimpleStatus.RELEASED, shp.SimpleStatus);
    }

    [Fact]
    public void Customers_CreateAndRegenerateLoginCode_Works()
    {
        var store = CreateIsolatedStore();
        var custVm = new CustomersViewModel(store);

        custVm.NewName = "Bosphorus Motors";
        custVm.NewEmail = "info@bosphorus.tr";
        custVm.NewRole = "user";
        custVm.CreateUserCommand.Execute(null);

        Assert.NotNull(custVm.SelectedUser);
        var oldCode = custVm.SelectedUser.LoginCode;
        Assert.Equal(8, oldCode.Length);

        custVm.RegenerateCodeCommand.Execute(null);
        Assert.Equal(8, custVm.SelectedUser.LoginCode.Length);
    }

    [Fact]
    public void OfficeExpenses_AddExpense_UpdatesBudgetAndTotalSpend()
    {
        var store = CreateIsolatedStore();
        var expVm = new OfficeExpensesViewModel(store);
        var beforeTotal = expVm.TotalMonthlySpend;

        expVm.NewTitle = "Port Security Badges";
        expVm.NewCategory = OfficeExpenseCategory.OFFICE_SUPPLIES;
        expVm.NewAmount = "180";
        expVm.AddExpenseCommand.Execute(null);

        Assert.Equal(beforeTotal + 180m, expVm.TotalMonthlySpend);
    }
}
