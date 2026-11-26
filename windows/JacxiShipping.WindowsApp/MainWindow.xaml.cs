using System.Windows;
using System.Windows.Input;
using JacxiShipping.WindowsApp.ViewModels;

namespace JacxiShipping.WindowsApp;

public partial class MainWindow : Window
{
    private bool _userToggledSidebar;

    public MainWindow()
    {
        InitializeComponent();
    }

    private void MainWindow_SizeChanged(object sender, SizeChangedEventArgs e)
    {
        if (DataContext is not MainViewModel vm) return;
        if (_userToggledSidebar) return;

        // Auto-collapse sidebar to sleek icon rail on compact widths (< 1160px)
        vm.IsSidebarCollapsed = e.NewSize.Width < 1160;
    }

    private void GlobalSearchBox_KeyDown(object sender, KeyEventArgs e)
    {
        if (e.Key == Key.Enter && DataContext is MainViewModel vm)
        {
            vm.GlobalSearchCommand.Execute(null);
            e.Handled = true;
        }
    }

    private void MainWindow_KeyDown(object sender, KeyEventArgs e)
    {
        if (DataContext is not MainViewModel vm) return;

        if (e.Key == Key.F5)
        {
            vm.RefreshAllCommand.Execute(null);
            e.Handled = true;
        }
        else if (e.Key == Key.K && (Keyboard.Modifiers & ModifierKeys.Control) == ModifierKeys.Control)
        {
            GlobalSearchBox.Focus();
            GlobalSearchBox.SelectAll();
            e.Handled = true;
        }
        else if (e.Key == Key.B && (Keyboard.Modifiers & ModifierKeys.Control) == ModifierKeys.Control)
        {
            _userToggledSidebar = true;
            vm.ToggleSidebarCommand.Execute(null);
            e.Handled = true;
        }
        else if (e.Key == Key.Escape)
        {
            vm.IsNotificationsOpen = false;
            vm.IsCopilotDrawerOpen = false;
        }
    }
}