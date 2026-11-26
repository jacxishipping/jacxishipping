using JacxiShipping.WindowsApp.Models;
using JacxiShipping.WindowsApp.Services;
using JacxiShipping.WindowsApp.ViewModels;
using Xunit;

namespace JacxiShipping.WindowsApp.Tests;

public class ViewModelTests
{
    [Fact]
    public void MainViewModel_InitializesToDashboard()
    {
        var mainVM = new MainViewModel();

        Assert.Equal("Dashboard", mainVM.CurrentTab);
        Assert.NotNull(mainVM.CurrentView);
        Assert.IsType<DashboardViewModel>(mainVM.CurrentView);
    }

    [Fact]
    public void MainViewModel_NavigateCommand_ChangesCurrentTabAndCurrentView()
    {
        var mainVM = new MainViewModel();

        mainVM.NavigateCommand.Execute("Shipments");
        Assert.Equal("Shipments", mainVM.CurrentTab);
        Assert.IsType<ShipmentsViewModel>(mainVM.CurrentView);

        mainVM.NavigateCommand.Execute("Calculator");
        Assert.Equal("Calculator", mainVM.CurrentTab);
        Assert.IsType<CalculatorViewModel>(mainVM.CurrentView);

        mainVM.NavigateCommand.Execute("Tracking");
        Assert.Equal("Tracking", mainVM.CurrentTab);
        Assert.IsType<TrackingViewModel>(mainVM.CurrentView);

        mainVM.NavigateCommand.Execute("Documents");
        Assert.Equal("Documents", mainVM.CurrentTab);
        Assert.IsType<DocumentsViewModel>(mainVM.CurrentView);
    }

    [Fact]
    public void ShipmentsViewModel_SearchQuery_FiltersList()
    {
        var shipmentService = new ShipmentService();
        var docService = new DocumentService();
        var vm = new ShipmentsViewModel(shipmentService, docService);

        vm.SearchQuery = "RAV4";
        Assert.Single(vm.FilteredShipments);
        Assert.Equal("JCX-2601-88491", vm.FilteredShipments.First().TrackingNumber);

        vm.SearchQuery = "";
        Assert.True(vm.FilteredShipments.Count >= 5);
    }

    [Fact]
    public void CalculatorViewModel_CreateBooking_AddsNewShipmentToService()
    {
        var calcService = new RateCalculatorService();
        var shipmentService = new ShipmentService();
        var vm = new CalculatorViewModel(calcService, shipmentService);

        var countBefore = shipmentService.GetAllShipments().Count;

        vm.SelectedState = "FL";
        vm.SelectedDestination = "Port of Mersin, Turkey";
        vm.CustomerNameInput = "Anatolia Trading Co.";
        vm.VinInput = "1HGCR2F83FL9990001";
        vm.MakeModelInput = "2024 Lexus GX 550";

        vm.CreateBookingCommand.Execute(null);

        var countAfter = shipmentService.GetAllShipments().Count;
        Assert.Equal(countBefore + 1, countAfter);
        Assert.Contains("Booking created successfully!", vm.SuccessMessage);

        var added = shipmentService.GetByVin("1HGCR2F83FL9990001");
        Assert.NotNull(added);
        Assert.Equal("Anatolia Trading Co.", added.CustomerName);
    }

    [Fact]
    public void TrackingViewModel_Lookup_FindsTrackedShipment()
    {
        var shipmentService = new ShipmentService();
        var vm = new TrackingViewModel(shipmentService);

        vm.SearchNumber = "JCX-2601-72940";
        vm.PerformLookup();

        Assert.NotNull(vm.TrackedShipment);
        Assert.Equal("JCX-2601-72940", vm.TrackedShipment.TrackingNumber);
        Assert.Equal("Jebel Ali Port, Dubai, UAE", vm.TrackedShipment.DestinationPort);
        Assert.Empty(vm.ErrorMessage);
    }
}
