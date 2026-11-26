using System.Windows;
using System.Windows.Controls;

namespace JacxiShipping.WindowsApp.Controls;

public partial class StatsCard : UserControl
{
    public static readonly DependencyProperty TitleProperty =
        DependencyProperty.Register(nameof(Title), typeof(string), typeof(StatsCard),
            new PropertyMetadata(string.Empty, (d, e) => ((StatsCard)d).TxtTitle.Text = e.NewValue?.ToString()?.ToUpperInvariant() ?? ""));

    public static readonly DependencyProperty ValueProperty =
        DependencyProperty.Register(nameof(Value), typeof(string), typeof(StatsCard),
            new PropertyMetadata(string.Empty, (d, e) => ((StatsCard)d).TxtValue.Text = e.NewValue?.ToString() ?? "0"));

    public static readonly DependencyProperty SubtitleProperty =
        DependencyProperty.Register(nameof(Subtitle), typeof(string), typeof(StatsCard),
            new PropertyMetadata(string.Empty, (d, e) => ((StatsCard)d).TxtSubtitle.Text = e.NewValue?.ToString() ?? ""));

    public string Title
    {
        get => (string)GetValue(TitleProperty);
        set => SetValue(TitleProperty, value);
    }

    public string Value
    {
        get => (string)GetValue(ValueProperty);
        set => SetValue(ValueProperty, value);
    }

    public string Subtitle
    {
        get => (string)GetValue(SubtitleProperty);
        set => SetValue(SubtitleProperty, value);
    }

    public StatsCard()
    {
        InitializeComponent();
    }
}
