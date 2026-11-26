using System.Windows;
using System.Windows.Media;
using JacxiShipping.WindowsApp.Views.Dialogs;
using Microsoft.Win32;

namespace JacxiShipping.WindowsApp.Services;

public class WpfPlatformInteractionService : IPlatformInteractionService
{
    public bool IsDarkMode { get; private set; }

    public string? OpenFileDialog(string title, string filter)
    {
        var dlg = new OpenFileDialog
        {
            Title = title,
            Filter = filter,
            CheckFileExists = true
        };
        return dlg.ShowDialog(Application.Current?.MainWindow) == true ? dlg.FileName : null;
    }

    public string? SaveFileDialog(string title, string filter, string defaultFileName)
    {
        var dlg = new SaveFileDialog
        {
            Title = title,
            Filter = filter,
            FileName = defaultFileName
        };
        return dlg.ShowDialog(Application.Current?.MainWindow) == true ? dlg.FileName : null;
    }

    public bool ConfirmAction(string title, string message, string confirmText = "Confirm", bool isDestructive = false)
    {
        var owner = Application.Current?.MainWindow;
        var dlg = new ConfirmDialog(title, message, confirmText, isDestructive)
        {
            Owner = owner
        };
        return dlg.ShowDialog() == true;
    }

    public bool OpenPathWithShell(string pathOrUrl) => ShellLauncher.TryOpen(pathOrUrl);

    public void CopyToClipboard(string text)
    {
        try
        {
            Clipboard.SetText(text ?? string.Empty);
        }
        catch
        {
            // Clipboard may be locked transiently by another Windows process
        }
    }

    public void SetThemeMode(bool isDarkMode)
    {
        IsDarkMode = isDarkMode;
        var res = Application.Current?.Resources;
        if (res == null) return;

        if (isDarkMode)
        {
            UpdateBrush(res, "JacxiBackgroundBrush", "#0B1120");
            UpdateBrush(res, "JacxiPanelBrush", "#111827");
            UpdateBrush(res, "JacxiBorderBrush", "#1F2937");
            UpdateBrush(res, "JacxiBorderSubtleBrush", "#182235");
            UpdateBrush(res, "JacxiTextPrimaryBrush", "#F9FAFB");
            UpdateBrush(res, "JacxiTextSecondaryBrush", "#9CA3AF");
            UpdateBrush(res, "JacxiTextMutedBrush", "#6B7280");
            UpdateBrush(res, "JacxiGoldLightBrush", "#292313");
            UpdateBrush(res, "JacxiGoldBorderBrush", "#57481D");
        }
        else
        {
            UpdateBrush(res, "JacxiBackgroundBrush", "#F9FAFB");
            UpdateBrush(res, "JacxiPanelBrush", "#FFFFFF");
            UpdateBrush(res, "JacxiBorderBrush", "#E5E7EB");
            UpdateBrush(res, "JacxiBorderSubtleBrush", "#F3F4F6");
            UpdateBrush(res, "JacxiTextPrimaryBrush", "#1C1C1E");
            UpdateBrush(res, "JacxiTextSecondaryBrush", "#5F6368");
            UpdateBrush(res, "JacxiTextMutedBrush", "#9CA3AF");
            UpdateBrush(res, "JacxiGoldLightBrush", "#FEF9E7");
            UpdateBrush(res, "JacxiGoldBorderBrush", "#F3E5AB");
        }
    }

    private static void UpdateBrush(ResourceDictionary res, string key, string hex)
    {
        if (res.Contains(key) && res[key] is SolidColorBrush brush && !brush.IsFrozen)
        {
            brush.Color = (Color)ColorConverter.ConvertFromString(hex);
        }
        else
        {
            res[key] = new SolidColorBrush((Color)ColorConverter.ConvertFromString(hex));
        }
    }
}
