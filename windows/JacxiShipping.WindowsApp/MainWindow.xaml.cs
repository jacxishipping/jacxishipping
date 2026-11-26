using System.Windows;
using System.Windows.Input;
using JacxiShipping.WindowsApp.ViewModels;

namespace JacxiShipping.WindowsApp;

public partial class MainWindow : Window
{
    public MainWindow()
    {
        InitializeComponent();
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
        else if (e.Key == Key.Escape)
        {
            vm.IsNotificationsOpen = false;
            vm.IsCopilotDrawerOpen = false;
        }
    }
}