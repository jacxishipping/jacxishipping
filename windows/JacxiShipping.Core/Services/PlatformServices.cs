using System.Diagnostics;

namespace JacxiShipping.WindowsApp.Services;

public interface IPlatformInteractionService
{
    bool IsDarkMode { get; }
    string? OpenFileDialog(string title, string filter);
    string? SaveFileDialog(string title, string filter, string defaultFileName);
    bool ConfirmAction(string title, string message, string confirmText = "Confirm", bool isDestructive = false);
    bool OpenPathWithShell(string pathOrUrl);
    void CopyToClipboard(string text);
    void SetThemeMode(bool isDarkMode);
}

/// <summary>
/// Headless / Core fallback implementation used for tests or CLI execution.
/// Overridden in WPF via WpfPlatformInteractionService.
/// </summary>
public class HeadlessPlatformInteractionService : IPlatformInteractionService
{
    public bool IsDarkMode { get; private set; }
    public string? LastOpenedPath { get; private set; }
    public string? LastCopiedText { get; private set; }

    public string? OpenFileDialog(string title, string filter) => null;

    public string? SaveFileDialog(string title, string filter, string defaultFileName) => defaultFileName;

    public bool ConfirmAction(string title, string message, string confirmText = "Confirm", bool isDestructive = false) => true;

    public bool OpenPathWithShell(string pathOrUrl)
    {
        LastOpenedPath = pathOrUrl;
        return !string.IsNullOrWhiteSpace(pathOrUrl);
    }

    public void CopyToClipboard(string text)
    {
        LastCopiedText = text;
    }

    public void SetThemeMode(bool isDarkMode)
    {
        IsDarkMode = isDarkMode;
    }
}

public static class ShellLauncher
{
    public static bool TryOpen(string pathOrUrl)
    {
        if (string.IsNullOrWhiteSpace(pathOrUrl)) return false;
        try
        {
            Process.Start(new ProcessStartInfo(pathOrUrl) { UseShellExecute = true });
            return true;
        }
        catch
        {
            return false;
        }
    }
}
