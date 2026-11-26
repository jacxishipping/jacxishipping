using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using JacxiShipping.WindowsApp.Models;

namespace JacxiShipping.WindowsApp.Controls;

public partial class StatusBadge : UserControl
{
    public static readonly DependencyProperty StatusProperty =
        DependencyProperty.Register(
            nameof(Status),
            typeof(ShipmentStatus),
            typeof(StatusBadge),
            new PropertyMetadata(ShipmentStatus.Booked, OnStatusChanged));

    public ShipmentStatus Status
    {
        get => (ShipmentStatus)GetValue(StatusProperty);
        set => SetValue(StatusProperty, value);
    }

    public StatusBadge()
    {
        InitializeComponent();
        UpdateAppearance();
    }

    private static void OnStatusChanged(DependencyObject d, DependencyPropertyChangedEventArgs e)
    {
        if (d is StatusBadge badge)
        {
            badge.UpdateAppearance();
        }
    }

    private void UpdateAppearance()
    {
        Brush bgBrush;
        Brush borderBrush;
        Brush textBrush;
        string label;

        switch (Status)
        {
            case ShipmentStatus.Delivered:
                bgBrush = TryFindResource("JacxiSuccessBgBrush") as Brush ?? Brushes.Honeydew;
                borderBrush = TryFindResource("JacxiSuccessBorderBrush") as Brush ?? Brushes.LightGreen;
                textBrush = TryFindResource("JacxiSuccessBrush") as Brush ?? Brushes.Green;
                label = "Delivered";
                break;
            case ShipmentStatus.InTransit:
                bgBrush = TryFindResource("JacxiInfoBgBrush") as Brush ?? Brushes.AliceBlue;
                borderBrush = TryFindResource("JacxiInfoBorderBrush") as Brush ?? Brushes.LightBlue;
                textBrush = TryFindResource("JacxiInfoBrush") as Brush ?? Brushes.DodgerBlue;
                label = "In Transit";
                break;
            case ShipmentStatus.ContainerLoaded:
                bgBrush = TryFindResource("JacxiInfoBgBrush") as Brush ?? Brushes.AliceBlue;
                borderBrush = TryFindResource("JacxiInfoBorderBrush") as Brush ?? Brushes.LightBlue;
                textBrush = TryFindResource("JacxiInfoBrush") as Brush ?? Brushes.DodgerBlue;
                label = "Container Loaded";
                break;
            case ShipmentStatus.VehicleReceived:
                bgBrush = TryFindResource("JacxiGoldLightBrush") as Brush ?? Brushes.LightYellow;
                borderBrush = TryFindResource("JacxiGoldBorderBrush") as Brush ?? Brushes.Goldenrod;
                textBrush = TryFindResource("JacxiGoldActiveBrush") as Brush ?? Brushes.DarkGoldenrod;
                label = "Vehicle Received";
                break;
            case ShipmentStatus.CustomsHold:
                bgBrush = TryFindResource("JacxiWarningBgBrush") as Brush ?? Brushes.LemonChiffon;
                borderBrush = TryFindResource("JacxiWarningBorderBrush") as Brush ?? Brushes.Gold;
                textBrush = TryFindResource("JacxiWarningBrush") as Brush ?? Brushes.Orange;
                label = "Customs Hold";
                break;
            case ShipmentStatus.CustomsCleared:
                bgBrush = TryFindResource("JacxiSuccessBgBrush") as Brush ?? Brushes.Honeydew;
                borderBrush = TryFindResource("JacxiSuccessBorderBrush") as Brush ?? Brushes.LightGreen;
                textBrush = TryFindResource("JacxiSuccessBrush") as Brush ?? Brushes.Green;
                label = "Customs Cleared";
                break;
            case ShipmentStatus.Booked:
            default:
                bgBrush = TryFindResource("JacxiBorderSubtleBrush") as Brush ?? Brushes.LightGray;
                borderBrush = TryFindResource("JacxiBorderBrush") as Brush ?? Brushes.Silver;
                textBrush = TryFindResource("JacxiTextSecondaryBrush") as Brush ?? Brushes.Gray;
                label = "Booked";
                break;
        }

        BadgeBorder.Background = bgBrush;
        BadgeBorder.BorderBrush = borderBrush;
        StatusDot.Fill = textBrush;
        StatusLabel.Foreground = textBrush;
        StatusLabel.Text = label;
    }
}
