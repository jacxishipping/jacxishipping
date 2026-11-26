using System.Collections;
using System.Windows;
using System.Windows.Controls;

namespace JacxiShipping.WindowsApp.Controls;

public partial class MilestoneStepper : UserControl
{
    public static readonly DependencyProperty MilestonesProperty =
        DependencyProperty.Register(
            nameof(Milestones),
            typeof(IEnumerable),
            typeof(MilestoneStepper),
            new PropertyMetadata(null));

    public IEnumerable? Milestones
    {
        get => (IEnumerable?)GetValue(MilestonesProperty);
        set => SetValue(MilestonesProperty, value);
    }

    public MilestoneStepper()
    {
        InitializeComponent();
    }
}
