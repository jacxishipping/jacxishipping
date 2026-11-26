using System.Windows;
using System.Windows.Media;

namespace JacxiShipping.WindowsApp.Views.Dialogs;

public partial class ConfirmDialog : Window
{
    public ConfirmDialog(string title, string message, string confirmText = "Confirm", bool isDestructive = false)
    {
        InitializeComponent();
        TitleText.Text = title;
        MessageText.Text = message;
        ConfirmButton.Content = confirmText;
        if (isDestructive)
        {
            ConfirmButton.Background = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#EF4444"));
            ConfirmButton.Foreground = Brushes.White;
        }
    }

    private void Confirm_Click(object sender, RoutedEventArgs e)
    {
        DialogResult = true;
        Close();
    }

    private void Cancel_Click(object sender, RoutedEventArgs e)
    {
        DialogResult = false;
        Close();
    }
}
