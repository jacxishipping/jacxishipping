using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using JacxiShipping.WindowsApp.Models;

namespace JacxiShipping.WindowsApp.Services;

public interface IPdfExportService
{
    string GenerateInvoicePdf(UserInvoiceRecord invoice, AdminUser? customer, string outputPath);
    string GenerateReleaseTokenPdf(Shipment shipment, string outputPath);
    string GenerateCustomsPacketPdf(Shipment shipment, ContainerRecord? container, string outputPath);
    string GenerateCustomerStatementPdf(AdminUser customer, IEnumerable<LedgerEntryRecord> entries, string outputPath);
}

public class PdfExportService : IPdfExportService
{
    private const string BrandDark = "#111827";
    private const string BrandGold = "#D4AF37";
    private const string BrandGoldLight = "#FEF9E7";
    private const string BrandBg = "#F9FAFB";
    private const string BrandBorder = "#E5E7EB";
    private const string TextPrimary = "#1C1C1E";
    private const string TextSecondary = "#5F6368";

    static PdfExportService()
    {
        QuestPDF.Settings.License = LicenseType.Community;
    }

    public string GenerateInvoicePdf(UserInvoiceRecord invoice, AdminUser? customer, string outputPath)
    {
        EnsureDirectory(outputPath);

        Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(36);
                page.DefaultTextStyle(x => x.FontSize(10).FontColor(TextPrimary));

                page.Header().Element(c => ComposeBrandedHeader(c, "OFFICIAL TAX & FREIGHT INVOICE", invoice.InvoiceNumber));

                page.Content().PaddingVertical(16).Column(col =>
                {
                    col.Spacing(14);

                    col.Item().Row(row =>
                    {
                        row.RelativeItem().Background(BrandBg).Border(1).BorderColor(BrandBorder).Padding(12).Column(left =>
                        {
                            left.Item().Text("BILL TO CONSIGNEE").FontSize(8).Bold().FontColor(TextSecondary);
                            left.Item().PaddingTop(4).Text(invoice.CustomerName).FontSize(12).Bold();
                            left.Item().Text(customer?.Email ?? invoice.CustomerEmail).FontColor(TextSecondary);
                            if (!string.IsNullOrWhiteSpace(customer?.Phone))
                                left.Item().Text(customer.Phone).FontColor(TextSecondary);
                        });
                        row.ConstantItem(14);
                        row.RelativeItem().Background(BrandGoldLight).Border(1).BorderColor(BrandGold).Padding(12).Column(right =>
                        {
                            right.Item().Text("INVOICE SUMMARY").FontSize(8).Bold().FontColor(TextSecondary);
                            right.Item().PaddingTop(4).Text($"Status: {invoice.StatusLabel}").Bold();
                            right.Item().Text($"Issued: {invoice.IssueDate}");
                            right.Item().Text($"Due Date: {invoice.DueDate}");
                            if (!string.IsNullOrWhiteSpace(invoice.ContainerNumber))
                                right.Item().Text($"Container: {invoice.ContainerNumber}");
                        });
                    });

                    col.Item().Table(table =>
                    {
                        table.ColumnsDefinition(cols =>
                        {
                            cols.RelativeColumn(4);
                            cols.RelativeColumn(1);
                            cols.RelativeColumn(1.2f);
                            cols.RelativeColumn(1.2f);
                        });

                        table.Header(h =>
                        {
                            h.Cell().Background(BrandDark).Padding(8).Text("DESCRIPTION").FontSize(9).Bold().FontColor("#FFFFFF");
                            h.Cell().Background(BrandDark).Padding(8).AlignRight().Text("QTY").FontSize(9).Bold().FontColor("#FFFFFF");
                            h.Cell().Background(BrandDark).Padding(8).AlignRight().Text("UNIT PRICE").FontSize(9).Bold().FontColor("#FFFFFF");
                            h.Cell().Background(BrandDark).Padding(8).AlignRight().Text("AMOUNT").FontSize(9).Bold().FontColor("#FFFFFF");
                        });

                        foreach (var item in invoice.LineItems)
                        {
                            table.Cell().BorderBottom(1).BorderColor(BrandBorder).Padding(8).Text(item.Description);
                            table.Cell().BorderBottom(1).BorderColor(BrandBorder).Padding(8).AlignRight().Text(item.Quantity.ToString("0.##"));
                            table.Cell().BorderBottom(1).BorderColor(BrandBorder).Padding(8).AlignRight().Text($"${item.UnitPrice:N2}");
                            table.Cell().BorderBottom(1).BorderColor(BrandBorder).Padding(8).AlignRight().Text(item.AmountFormatted).Bold();
                        }
                    });

                    col.Item().AlignRight().Width(240).Background(BrandBg).Border(1).BorderColor(BrandBorder).Padding(12).Column(sum =>
                    {
                        sum.Spacing(4);
                        sum.Item().Row(r => { r.RelativeItem().Text("Subtotal:"); r.ConstantItem(90).AlignRight().Text($"${invoice.Subtotal:N2}"); });
                        sum.Item().Row(r => { r.RelativeItem().Text("Total Invoice:"); r.ConstantItem(90).AlignRight().Text(invoice.TotalFormatted).Bold(); });
                        sum.Item().Row(r => { r.RelativeItem().Text("Amount Paid:"); r.ConstantItem(90).AlignRight().Text(invoice.AmountPaidFormatted).FontColor("#10B981"); });
                        sum.Item().PaddingTop(4).BorderTop(1).BorderColor(BrandBorder).Row(r =>
                        {
                            r.RelativeItem().Text("Balance Due:").Bold();
                            r.ConstantItem(90).AlignRight().Text(invoice.AmountRemainingFormatted).FontSize(13).Bold().FontColor(BrandDark);
                        });
                    });

                    if (!string.IsNullOrWhiteSpace(invoice.Notes))
                    {
                        col.Item().PaddingTop(8).Text($"Notes: {invoice.Notes}").FontSize(9).FontColor(TextSecondary);
                    }
                });

                page.Footer().AlignCenter().Text("JACXI Shipping LLC • Official Global Vehicle Logistics Invoice").FontSize(8).FontColor(TextSecondary);
            });
        }).GeneratePdf(outputPath);

        return outputPath;
    }

    public string GenerateReleaseTokenPdf(Shipment shipment, string outputPath)
    {
        EnsureDirectory(outputPath);
        var token = string.IsNullOrWhiteSpace(shipment.ReleaseToken)
            ? $"REL-{shipment.TrackingNumber.Replace("JCX-", "")}"
            : shipment.ReleaseToken;

        Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(36);
                page.DefaultTextStyle(x => x.FontSize(10).FontColor(TextPrimary));

                page.Header().Element(c => ComposeBrandedHeader(c, "PORT GATE RELEASE TOKEN", token));

                page.Content().PaddingVertical(20).Column(col =>
                {
                    col.Spacing(16);

                    col.Item().Background(BrandGoldLight).Border(2).BorderColor(BrandGold).Padding(18).Column(box =>
                    {
                        box.Item().AlignCenter().Text("VERIFIED RELEASE AUTHORIZATION CODE").FontSize(9).Bold().FontColor(TextSecondary);
                        box.Item().PaddingTop(6).AlignCenter().Text(token).FontSize(28).Bold().FontColor(BrandDark);
                        box.Item().PaddingTop(4).AlignCenter().Text($"Issued for Shipment {shipment.TrackingNumber} • Container {shipment.ContainerNumber}").FontSize(10);
                    });

                    col.Item().Background(BrandBg).Border(1).BorderColor(BrandBorder).Padding(14).Column(v =>
                    {
                        v.Spacing(5);
                        v.Item().Text("VEHICLE & CONSIGNEE PARTICULARS").FontSize(9).Bold().FontColor(TextSecondary);
                        v.Item().Text($"Vehicle: {shipment.Vehicle.FullDescription}").FontSize(12).Bold();
                        v.Item().Text($"VIN: {shipment.Vehicle.Vin}");
                        v.Item().Text($"Auction Lot: {shipment.Vehicle.LotNumber} ({shipment.Vehicle.AuctionYard})");
                        v.Item().Text($"Consignee: {shipment.CustomerName} ({shipment.CustomerPhone})");
                        v.Item().Text($"Port of Discharge: {shipment.DestinationPort}");
                        v.Item().Text($"Payment Status: {shipment.PaymentStatus}").Bold();
                    });
                });

                page.Footer().AlignCenter().Text("Present this official JACXI Release Token at destination port gate.").FontSize(8).FontColor(TextSecondary);
            });
        }).GeneratePdf(outputPath);

        return outputPath;
    }

    public string GenerateCustomsPacketPdf(Shipment shipment, ContainerRecord? containerRecord, string outputPath)
    {
        EnsureDirectory(outputPath);

        Document.Create(doc =>
        {
            doc.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(36);
                page.DefaultTextStyle(x => x.FontSize(10).FontColor(TextPrimary));

                page.Header().Element(c => ComposeBrandedHeader(c, "CUSTOMS EXPORT & BILL OF LADING PACKET", shipment.TrackingNumber));

                page.Content().PaddingVertical(16).Column(col =>
                {
                    col.Spacing(14);

                    col.Item().Background(BrandBg).Border(1).BorderColor(BrandBorder).Padding(14).Column(c =>
                    {
                        c.Spacing(4);
                        c.Item().Text("1. OCEAN CARRIER & ROUTING").FontSize(9).Bold().FontColor(TextSecondary);
                        c.Item().Text($"Vessel / Voyage: {shipment.VesselName} ({shipment.VoyageNumber})");
                        c.Item().Text($"Container #: {shipment.ContainerNumber} ({containerRecord?.ShippingLine ?? "Ocean Carrier"})");
                        c.Item().Text($"Port of Loading: {shipment.OriginPort}");
                        c.Item().Text($"Port of Discharge: {shipment.DestinationPort}");
                        c.Item().Text($"Estimated Arrival: {shipment.EstimatedDelivery}");
                    });

                    col.Item().Background(BrandBg).Border(1).BorderColor(BrandBorder).Padding(14).Column(c =>
                    {
                        c.Spacing(4);
                        c.Item().Text("2. CARGO & TITLE DECLARATION").FontSize(9).Bold().FontColor(TextSecondary);
                        c.Item().Text($"Description: {shipment.Vehicle.FullDescription}").Bold();
                        c.Item().Text($"VIN: {shipment.Vehicle.Vin}");
                        c.Item().Text($"Title Status: {shipment.Vehicle.TitleStatus}");
                        c.Item().Text($"Keys Present: {(shipment.Vehicle.HasKeys ? "YES" : "NO")} • Runs & Drives: {(shipment.Vehicle.RunsAndDrives ? "YES" : "NO")}");
                        c.Item().Text($"Declared Freight Value: {shipment.TotalCostFormatted}");
                    });

                    col.Item().Background(BrandBg).Border(1).BorderColor(BrandBorder).Padding(14).Column(c =>
                    {
                        c.Spacing(4);
                        c.Item().Text("3. CONSIGNEE & EXPORT CERTIFICATION").FontSize(9).Bold().FontColor(TextSecondary);
                        c.Item().Text($"Consignee: {shipment.CustomerName}");
                        c.Item().Text($"Contact: {shipment.CustomerEmail} • {shipment.CustomerPhone}");
                        c.Item().PaddingTop(8).Text("Certified true and correct for US CBP AES & Destination Port Customs Clearance.").FontSize(9).Italic();
                    });
                });

                page.Footer().AlignCenter().Text("JACXI Shipping LLC • Customs Compliance Packet").FontSize(8).FontColor(TextSecondary);
            });
        }).GeneratePdf(outputPath);

        return outputPath;
    }

    public string GenerateCustomerStatementPdf(AdminUser customer, IEnumerable<LedgerEntryRecord> entries, string outputPath)
    {
        EnsureDirectory(outputPath);
        var list = entries.ToList();

        Document.Create(doc =>
        {
            doc.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(36);
                page.DefaultTextStyle(x => x.FontSize(9.5f).FontColor(TextPrimary));

                page.Header().Element(c => ComposeBrandedHeader(c, "CUSTOMER ACCOUNT STATEMENT", customer.LoginCode));

                page.Content().PaddingVertical(16).Column(col =>
                {
                    col.Spacing(12);
                    col.Item().Background(BrandBg).Border(1).BorderColor(BrandBorder).Padding(12).Row(r =>
                    {
                        r.RelativeItem().Column(l =>
                        {
                            l.Item().Text(customer.Name).FontSize(12).Bold();
                            l.Item().Text($"{customer.Email} • {customer.Phone}").FontColor(TextSecondary);
                        });
                        r.ConstantItem(150).AlignRight().Column(rt =>
                        {
                            rt.Item().Text("CURRENT BALANCE DUE").FontSize(8).Bold().FontColor(TextSecondary);
                            rt.Item().Text(customer.BalanceFormatted).FontSize(16).Bold().FontColor(BrandDark);
                        });
                    });

                    col.Item().Table(table =>
                    {
                        table.ColumnsDefinition(cols =>
                        {
                            cols.ConstantColumn(75);
                            cols.RelativeColumn(3);
                            cols.ConstantColumn(65);
                            cols.ConstantColumn(80);
                            cols.ConstantColumn(80);
                        });

                        table.Header(h =>
                        {
                            h.Cell().Background(BrandDark).Padding(6).Text("DATE").Bold().FontColor("#FFFFFF");
                            h.Cell().Background(BrandDark).Padding(6).Text("DESCRIPTION").Bold().FontColor("#FFFFFF");
                            h.Cell().Background(BrandDark).Padding(6).Text("TYPE").Bold().FontColor("#FFFFFF");
                            h.Cell().Background(BrandDark).Padding(6).AlignRight().Text("AMOUNT").Bold().FontColor("#FFFFFF");
                            h.Cell().Background(BrandDark).Padding(6).AlignRight().Text("BALANCE").Bold().FontColor("#FFFFFF");
                        });

                        foreach (var e in list)
                        {
                            table.Cell().BorderBottom(1).BorderColor(BrandBorder).Padding(6).Text(e.TransactionDate);
                            table.Cell().BorderBottom(1).BorderColor(BrandBorder).Padding(6).Text(e.Description);
                            table.Cell().BorderBottom(1).BorderColor(BrandBorder).Padding(6).Text(e.Type.ToString());
                            table.Cell().BorderBottom(1).BorderColor(BrandBorder).Padding(6).AlignRight().Text(e.AmountFormatted);
                            table.Cell().BorderBottom(1).BorderColor(BrandBorder).Padding(6).AlignRight().Text(e.BalanceFormatted).Bold();
                        }
                    });
                });

                page.Footer().AlignCenter().Text("JACXI Shipping LLC • Financial Statement of Account").FontSize(8).FontColor(TextSecondary);
            });
        }).GeneratePdf(outputPath);

        return outputPath;
    }

    private static void ComposeBrandedHeader(IContainer container, string documentTitle, string referenceNumber)
    {
        container.Background(BrandDark).Padding(16).Row(row =>
        {
            row.RelativeItem().Column(left =>
            {
                left.Item().Text("JACXI SHIPPING").FontSize(16).Bold().FontColor("#FFFFFF");
                left.Item().Text("GLOBAL VEHICLE & CONTAINER LOGISTICS").FontSize(8).Bold().FontColor(BrandGold);
            });
            row.RelativeItem().AlignRight().Column(right =>
            {
                right.Item().AlignRight().Text(documentTitle).FontSize(10).Bold().FontColor(BrandGold);
                right.Item().AlignRight().Text(referenceNumber).FontSize(13).Bold().FontColor("#FFFFFF");
            });
        });
    }

    private static void EnsureDirectory(string path)
    {
        var dir = Path.GetDirectoryName(path);
        if (!string.IsNullOrWhiteSpace(dir)) Directory.CreateDirectory(dir);
    }
}
