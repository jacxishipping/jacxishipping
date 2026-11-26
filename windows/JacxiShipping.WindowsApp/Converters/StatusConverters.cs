using System.Globalization;
using System.Windows;
using System.Windows.Data;
using System.Windows.Media;
using JacxiShipping.WindowsApp.Models;

namespace JacxiShipping.WindowsApp.Converters;

public class StatusToBrushConverter : IValueConverter
{
    public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
    {
        if (value is ShipmentStatus status)
        {
            return status switch
            {
                ShipmentStatus.Delivered => Application.Current.TryFindResource("JacxiSuccessBrush") as Brush ?? Brushes.Green,
                ShipmentStatus.InTransit => Application.Current.TryFindResource("JacxiInfoBrush") as Brush ?? Brushes.DodgerBlue,
                ShipmentStatus.ContainerLoaded => Application.Current.TryFindResource("JacxiInfoBrush") as Brush ?? Brushes.DodgerBlue,
                ShipmentStatus.VehicleReceived => Application.Current.TryFindResource("JacxiGoldActiveBrush") as Brush ?? Brushes.DarkGoldenrod,
                ShipmentStatus.Booked => Application.Current.TryFindResource("JacxiTextSecondaryBrush") as Brush ?? Brushes.Gray,
                ShipmentStatus.CustomsHold => Application.Current.TryFindResource("JacxiWarningBrush") as Brush ?? Brushes.Orange,
                ShipmentStatus.CustomsCleared => Application.Current.TryFindResource("JacxiSuccessBrush") as Brush ?? Brushes.Green,
                _ => Application.Current.TryFindResource("JacxiTextSecondaryBrush") as Brush ?? Brushes.Gray
            };
        }
        return Application.Current.TryFindResource("JacxiTextSecondaryBrush") as Brush ?? Brushes.Gray;
    }

    public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture) => throw new NotImplementedException();
}

public class StatusToBackgroundConverter : IValueConverter
{
    public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
    {
        if (value is ShipmentStatus status)
        {
            return status switch
            {
                ShipmentStatus.Delivered => Application.Current.TryFindResource("JacxiSuccessBgBrush") as Brush ?? Brushes.Honeydew,
                ShipmentStatus.InTransit => Application.Current.TryFindResource("JacxiInfoBgBrush") as Brush ?? Brushes.AliceBlue,
                ShipmentStatus.ContainerLoaded => Application.Current.TryFindResource("JacxiInfoBgBrush") as Brush ?? Brushes.AliceBlue,
                ShipmentStatus.VehicleReceived => Application.Current.TryFindResource("JacxiGoldLightBrush") as Brush ?? Brushes.LightYellow,
                ShipmentStatus.Booked => Application.Current.TryFindResource("JacxiBorderSubtleBrush") as Brush ?? Brushes.LightGray,
                ShipmentStatus.CustomsHold => Application.Current.TryFindResource("JacxiWarningBgBrush") as Brush ?? Brushes.LemonChiffon,
                ShipmentStatus.CustomsCleared => Application.Current.TryFindResource("JacxiSuccessBgBrush") as Brush ?? Brushes.Honeydew,
                _ => Application.Current.TryFindResource("JacxiBorderSubtleBrush") as Brush ?? Brushes.LightGray
            };
        }
        return Application.Current.TryFindResource("JacxiBorderSubtleBrush") as Brush ?? Brushes.LightGray;
    }

    public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture) => throw new NotImplementedException();
}

public class StatusToBorderConverter : IValueConverter
{
    public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
    {
        if (value is ShipmentStatus status)
        {
            return status switch
            {
                ShipmentStatus.Delivered => Application.Current.TryFindResource("JacxiSuccessBorderBrush") as Brush ?? Brushes.LightGreen,
                ShipmentStatus.InTransit => Application.Current.TryFindResource("JacxiInfoBorderBrush") as Brush ?? Brushes.LightBlue,
                ShipmentStatus.ContainerLoaded => Application.Current.TryFindResource("JacxiInfoBorderBrush") as Brush ?? Brushes.LightBlue,
                ShipmentStatus.VehicleReceived => Application.Current.TryFindResource("JacxiGoldBorderBrush") as Brush ?? Brushes.Goldenrod,
                ShipmentStatus.Booked => Application.Current.TryFindResource("JacxiBorderBrush") as Brush ?? Brushes.Silver,
                ShipmentStatus.CustomsHold => Application.Current.TryFindResource("JacxiWarningBorderBrush") as Brush ?? Brushes.Gold,
                ShipmentStatus.CustomsCleared => Application.Current.TryFindResource("JacxiSuccessBorderBrush") as Brush ?? Brushes.LightGreen,
                _ => Application.Current.TryFindResource("JacxiBorderBrush") as Brush ?? Brushes.Silver
            };
        }
        return Application.Current.TryFindResource("JacxiBorderBrush") as Brush ?? Brushes.Silver;
    }

    public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture) => throw new NotImplementedException();
}
