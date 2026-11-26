using System.Windows;
using System.Windows.Controls;

namespace JacxiShipping.WindowsApp.Controls;

/// <summary>
/// A responsive multi-column layout panel that adapts the number of equal-width columns
/// based on available width and minimum column width, keeping gaps uniform.
/// </summary>
public class ResponsiveColumnsPanel : Panel
{
    public static readonly DependencyProperty MinColumnWidthProperty =
        DependencyProperty.Register(nameof(MinColumnWidth), typeof(double), typeof(ResponsiveColumnsPanel),
            new FrameworkPropertyMetadata(230.0, FrameworkPropertyMetadataOptions.AffectsMeasure | FrameworkPropertyMetadataOptions.AffectsArrange));

    public static readonly DependencyProperty MaxColumnsProperty =
        DependencyProperty.Register(nameof(MaxColumns), typeof(int), typeof(ResponsiveColumnsPanel),
            new FrameworkPropertyMetadata(4, FrameworkPropertyMetadataOptions.AffectsMeasure | FrameworkPropertyMetadataOptions.AffectsArrange));

    public static readonly DependencyProperty ColumnGapProperty =
        DependencyProperty.Register(nameof(ColumnGap), typeof(double), typeof(ResponsiveColumnsPanel),
            new FrameworkPropertyMetadata(16.0, FrameworkPropertyMetadataOptions.AffectsMeasure | FrameworkPropertyMetadataOptions.AffectsArrange));

    public static readonly DependencyProperty RowGapProperty =
        DependencyProperty.Register(nameof(RowGap), typeof(double), typeof(ResponsiveColumnsPanel),
            new FrameworkPropertyMetadata(16.0, FrameworkPropertyMetadataOptions.AffectsMeasure | FrameworkPropertyMetadataOptions.AffectsArrange));

    public double MinColumnWidth { get => (double)GetValue(MinColumnWidthProperty); set => SetValue(MinColumnWidthProperty, value); }
    public int MaxColumns { get => (int)GetValue(MaxColumnsProperty); set => SetValue(MaxColumnsProperty, value); }
    public double ColumnGap { get => (double)GetValue(ColumnGapProperty); set => SetValue(ColumnGapProperty, value); }
    public double RowGap { get => (double)GetValue(RowGapProperty); set => SetValue(RowGapProperty, value); }

    private int CalculateColumnCount(double availableWidth)
    {
        if (double.IsInfinity(availableWidth) || availableWidth <= 0)
            return Math.Max(1, MaxColumns);

        int maxCols = Math.Max(1, MaxColumns);
        for (int cols = maxCols; cols >= 1; cols--)
        {
            double required = cols * MinColumnWidth + (cols - 1) * ColumnGap;
            if (availableWidth >= required)
                return cols;
        }
        return 1;
    }

    protected override Size MeasureOverride(Size availableSize)
    {
        int visibleCount = 0;
        foreach (UIElement child in InternalChildren)
        {
            if (child.Visibility != Visibility.Collapsed) visibleCount++;
        }
        if (visibleCount == 0) return new Size(0, 0);

        int cols = CalculateColumnCount(availableSize.Width);
        double colWidth = double.IsInfinity(availableSize.Width)
            ? MinColumnWidth
            : Math.Max(100, (availableSize.Width - (cols - 1) * ColumnGap) / cols);

        int row = 0;
        int col = 0;
        double currentRowHeight = 0;
        double totalHeight = 0;

        foreach (UIElement child in InternalChildren)
        {
            if (child.Visibility == Visibility.Collapsed) continue;
            child.Measure(new Size(colWidth, double.PositiveInfinity));
            currentRowHeight = Math.Max(currentRowHeight, child.DesiredSize.Height);

            col++;
            if (col >= cols)
            {
                totalHeight += currentRowHeight + (row > 0 ? RowGap : 0);
                currentRowHeight = 0;
                col = 0;
                row++;
            }
        }

        if (col > 0)
        {
            totalHeight += currentRowHeight + (row > 0 ? RowGap : 0);
        }

        double desiredWidth = double.IsInfinity(availableSize.Width)
            ? cols * MinColumnWidth + (cols - 1) * ColumnGap
            : availableSize.Width;

        return new Size(desiredWidth, totalHeight);
    }

    protected override Size ArrangeOverride(Size finalSize)
    {
        int cols = CalculateColumnCount(finalSize.Width);
        double colWidth = Math.Max(100, (finalSize.Width - (cols - 1) * ColumnGap) / cols);

        var rowHeights = new List<double>();
        int col = 0;
        double currentRowHeight = 0;

        foreach (UIElement child in InternalChildren)
        {
            if (child.Visibility == Visibility.Collapsed) continue;
            currentRowHeight = Math.Max(currentRowHeight, child.DesiredSize.Height);
            col++;
            if (col >= cols)
            {
                rowHeights.Add(currentRowHeight);
                currentRowHeight = 0;
                col = 0;
            }
        }
        if (col > 0) rowHeights.Add(currentRowHeight);

        int r = 0;
        col = 0;
        double y = 0;

        foreach (UIElement child in InternalChildren)
        {
            if (child.Visibility == Visibility.Collapsed) continue;
            double x = col * (colWidth + ColumnGap);
            double h = rowHeights[r];
            child.Arrange(new Rect(x, y, colWidth, h));

            col++;
            if (col >= cols)
            {
                y += h + RowGap;
                col = 0;
                r++;
            }
        }

        return finalSize;
    }
}
