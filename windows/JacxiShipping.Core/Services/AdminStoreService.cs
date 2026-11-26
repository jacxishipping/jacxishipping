using System.Text.Json;
using JacxiShipping.WindowsApp.Models;

namespace JacxiShipping.WindowsApp.Services;

public class AdminStoreService : IAdminStoreService
{
    private readonly object _lock = new();
    private readonly string _storagePath;
    private AdminDatabaseState _state = new();

    public CloudSessionConfig Session => _state.Session;

    public AdminStoreService(string? customStoragePath = null)
    {
        if (!string.IsNullOrWhiteSpace(customStoragePath))
        {
            _storagePath = customStoragePath;
        }
        else
        {
            var appData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            var dir = Path.Combine(appData, "JacxiShipping");
            Directory.CreateDirectory(dir);
            _storagePath = Path.Combine(dir, "admin-state.json");
        }

        if (!TryLoadState())
        {
            SeedDemoData();
        }
    }

    public IReadOnlyList<Shipment> GetShipments() { lock (_lock) return _state.Shipments.ToList(); }
    public IReadOnlyList<ContainerRecord> GetContainers() { lock (_lock) return _state.Containers.ToList(); }
    public IReadOnlyList<DispatchRecord> GetDispatches() { lock (_lock) return _state.Dispatches.ToList(); }
    public IReadOnlyList<TransitRecord> GetTransits() { lock (_lock) return _state.Transits.ToList(); }
    public IReadOnlyList<AdminUser> GetUsers() { lock (_lock) return _state.Users.ToList(); }
    public IReadOnlyList<ShippingCompany> GetCompanies() { lock (_lock) return _state.Companies.ToList(); }
    public IReadOnlyList<UserInvoiceRecord> GetInvoices() { lock (_lock) return _state.Invoices.ToList(); }
    public IReadOnlyList<LedgerEntryRecord> GetLedgerEntries() { lock (_lock) return _state.LedgerEntries.ToList(); }
    public IReadOnlyList<OfficeExpenseRecord> GetOfficeExpenses() { lock (_lock) return _state.OfficeExpenses.ToList(); }
    public IReadOnlyList<ExpenseBudgetRecord> GetExpenseBudgets() { lock (_lock) return _state.ExpenseBudgets.ToList(); }
    public IReadOnlyList<RecurringExpenseRecord> GetRecurringExpenses() { lock (_lock) return _state.RecurringExpenses.ToList(); }
    public IReadOnlyList<LedgerTransferRecord> GetLedgerTransfers() { lock (_lock) return _state.LedgerTransfers.ToList(); }
    public IReadOnlyList<PartnerPortalRecord> GetPartnerPortals() { lock (_lock) return _state.PartnerPortals.ToList(); }
    public IReadOnlyList<GatePassRequest> GetGatePassRequests() { lock (_lock) return _state.GatePassRequests.ToList(); }
    public IReadOnlyList<BankTransactionRecord> GetBankTransactions() { lock (_lock) return _state.BankTransactions.ToList(); }
    public IReadOnlyList<ExchangeRateRecord> GetExchangeRates() { lock (_lock) return _state.ExchangeRates.ToList(); }
    public IReadOnlyList<CarrierPriceQuote> GetCarrierQuotes() { lock (_lock) return _state.CarrierQuotes.ToList(); }
    public IReadOnlyList<QualityCheckRecord> GetQualityChecks() { lock (_lock) return _state.QualityChecks.ToList(); }
    public IReadOnlyList<TrackingDiagnosticRecord> GetTrackingDiagnostics() { lock (_lock) return _state.TrackingDiagnostics.ToList(); }
    public IReadOnlyList<AiInteractionRecord> GetAiInteractions() { lock (_lock) return _state.AiInteractions.ToList(); }
    public IReadOnlyList<VoiceCallLogRecord> GetVoiceCallLogs() { lock (_lock) return _state.VoiceCallLogs.ToList(); }
    public IReadOnlyList<CommunicationDispatchRecord> GetCommunicationDispatches() { lock (_lock) return _state.CommunicationDispatches.ToList(); }
    public IReadOnlyList<AdminNotificationItem> GetNotifications() { lock (_lock) return _state.Notifications.ToList(); }

    public DashboardStats GetDashboardStats()
    {
        lock (_lock)
        {
            var shipments = _state.Shipments;
            var containers = _state.Containers;
            var invoices = _state.Invoices;

            var activeShipments = shipments.Count(s =>
                s.SimpleStatus is ShipmentSimpleStatus.ON_HAND
                    or ShipmentSimpleStatus.DISPATCHING
                    or ShipmentSimpleStatus.IN_TRANSIT
                    or ShipmentSimpleStatus.IN_TRANSIT_TO_DESTINATION);

            var activeContainers = containers.Count(c =>
                c.Status is ContainerLifecycleStatus.LOADED
                    or ContainerLifecycleStatus.IN_TRANSIT
                    or ContainerLifecycleStatus.ARRIVED_PORT
                    or ContainerLifecycleStatus.CUSTOMS_CLEARANCE);

            var pendingInvoices = invoices
                .Where(i => i.Status is UserInvoiceStatus.PENDING or UserInvoiceStatus.OVERDUE or UserInvoiceStatus.PARTIALLY_PAID or UserInvoiceStatus.SENT)
                .ToList();

            var collected = invoices.Sum(i => i.AmountPaid);
            var opEx = _state.OfficeExpenses.Sum(e => e.Amount);
            var grossMargin = shipments.Sum(s => s.GrossMargin);

            return new DashboardStats
            {
                TotalShipments = shipments.Count,
                ActiveInTransit = shipments.Count(s => s.Status == ShipmentStatus.InTransit),
                CustomsPending = shipments.Count(s => s.Status == ShipmentStatus.CustomsHold),
                DeliveredMonth = shipments.Count(s => s.Status == ShipmentStatus.Delivered),
                TotalRevenue = shipments.Sum(s => s.TotalCost),
                ActiveShipmentsCount = activeShipments,
                ActiveContainersCount = activeContainers,
                TotalContainersCount = containers.Count,
                ActiveDispatchesCount = _state.Dispatches.Count(d => d.Status is DispatchStatus.PENDING or DispatchStatus.DISPATCHED),
                ActiveTransitsCount = _state.Transits.Count(t => t.Status is TransitStatus.PENDING or TransitStatus.DISPATCHED or TransitStatus.IN_TRANSIT),
                OverdueInvoicesCount = invoices.Count(i => i.Status == UserInvoiceStatus.OVERDUE),
                PendingInvoicesCount = pendingInvoices.Count,
                PendingGatePassesCount = _state.GatePassRequests.Count(g => g.Status != "COMPLETED"),
                PendingInvoicesTotal = pendingInvoices.Sum(i => i.AmountRemaining),
                CollectedRevenueTotal = collected,
                OfficeExpensesTotal = opEx,
                GrossProfitTotal = grossMargin - opEx
            };
        }
    }

    public NavBadges GetNavBadges()
    {
        lock (_lock)
        {
            return new NavBadges
            {
                AgingShipments = _state.Shipments.Count(s => s.Status == ShipmentStatus.CustomsHold || s.SimpleStatus == ShipmentSimpleStatus.ON_HAND),
                OverdueInvoices = _state.Invoices.Count(i => i.Status == UserInvoiceStatus.OVERDUE),
                PendingGatePasses = _state.GatePassRequests.Count(g => g.Status != "COMPLETED"),
                CustomsHoldCount = _state.Shipments.Count(s => s.Status == ShipmentStatus.CustomsHold)
            };
        }
    }

    public IReadOnlyList<ExceptionAlertItem> GetExceptionAlerts()
    {
        lock (_lock)
        {
            var alerts = new List<ExceptionAlertItem>();

            foreach (var inv in _state.Invoices.Where(i => i.Status == UserInvoiceStatus.OVERDUE))
            {
                alerts.Add(new ExceptionAlertItem
                {
                    Title = $"Overdue Invoice {inv.InvoiceNumber} ({inv.CustomerName})",
                    Subtitle = $"Remaining balance: {inv.AmountRemainingFormatted} · Due {inv.DueDate}",
                    Severity = "Error",
                    TargetTab = "Invoices",
                    AgeDays = 9
                });
            }

            foreach (var shp in _state.Shipments.Where(s => s.Status == ShipmentStatus.CustomsHold))
            {
                alerts.Add(new ExceptionAlertItem
                {
                    Title = $"Customs Hold: {shp.Vehicle.FullDescription}",
                    Subtitle = $"{shp.TrackingNumber} · {shp.DestinationPort} · {shp.Vehicle.TitleStatus}",
                    Severity = "Warning",
                    TargetTab = "Shipments",
                    AgeDays = 5
                });
            }

            foreach (var gp in _state.GatePassRequests.Where(g => g.Status != "COMPLETED"))
            {
                alerts.Add(new ExceptionAlertItem
                {
                    Title = $"Gate Pass Requested: {gp.VehicleLabel}",
                    Subtitle = $"{gp.ContainerNumber} · Token {gp.ReleaseToken} · {gp.CustomerName}",
                    Severity = "Info",
                    TargetTab = "GatePasses",
                    AgeDays = 2
                });
            }

            return alerts;
        }
    }

    public void AddShipment(Shipment shipment)
    {
        lock (_lock)
        {
            if (string.IsNullOrWhiteSpace(shipment.TrackingNumber))
                shipment.TrackingNumber = $"JCX-{DateTime.UtcNow:yyMM}-{Random.Shared.Next(10000, 99999)}";
            if (string.IsNullOrWhiteSpace(shipment.ContainerNumber))
                shipment.ContainerNumber = $"MSCU{Random.Shared.Next(1000000, 9999999)}";

            if (shipment.Milestones.Count == 0)
            {
                shipment.Milestones = new List<ShipmentMilestone>
                {
                    new("Booking Confirmed", shipment.OriginPort, DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm"), true, false, "Shipment file opened by admin desk."),
                    new("Vehicle Dispatch & Inspection", shipment.Vehicle.AuctionYard, "Scheduled", false, true, "Flatbed dispatch assigned."),
                    new("Loaded in Container", shipment.ContainerNumber, "Pending", false, false, "Awaiting terminal stuffing."),
                    new("Ocean Transit", shipment.VesselName, "Pending", false, false, "Scheduled ocean leg."),
                    new("Customs Clearance", shipment.DestinationPort, "Pending", false, false, "Destination port clearance."),
                    new("Final Delivery", shipment.DestinationPort, "Estimated " + shipment.EstimatedDelivery, false, false, "Consignee handover.")
                };
            }

            _state.Shipments.Insert(0, shipment);

            var user = _state.Users.FirstOrDefault(u => u.Id == shipment.UserId || u.Name.Equals(shipment.CustomerName, StringComparison.OrdinalIgnoreCase));
            if (user != null)
            {
                user.ShipmentCount++;
                user.Balance += shipment.TotalCost;
            }

            AddNotificationInternal("New Shipment Created", $"{shipment.TrackingNumber} ({shipment.Vehicle.FullDescription})", "SUCCESS");
            SaveStateInternal();
        }
    }

    public void UpdateShipmentSimpleStatus(string shipmentId, ShipmentSimpleStatus newStatus)
    {
        lock (_lock)
        {
            var s = _state.Shipments.FirstOrDefault(x => x.Id == shipmentId || x.TrackingNumber == shipmentId);
            if (s == null) return;

            s.SimpleStatus = newStatus;
            s.Status = newStatus switch
            {
                ShipmentSimpleStatus.ON_HAND => ShipmentStatus.VehicleReceived,
                ShipmentSimpleStatus.DISPATCHING => ShipmentStatus.Booked,
                ShipmentSimpleStatus.IN_TRANSIT => ShipmentStatus.InTransit,
                ShipmentSimpleStatus.RELEASED => ShipmentStatus.CustomsCleared,
                ShipmentSimpleStatus.IN_TRANSIT_TO_DESTINATION => ShipmentStatus.InTransit,
                ShipmentSimpleStatus.DELIVERED => ShipmentStatus.Delivered,
                _ => s.Status
            };

            UpdateMilestoneProgress(s);
            SaveStateInternal();
        }
    }

    public void UpdateShipmentStatus(string trackingNumber, ShipmentStatus newStatus)
    {
        lock (_lock)
        {
            var s = _state.Shipments.FirstOrDefault(x => x.TrackingNumber == trackingNumber || x.Id == trackingNumber);
            if (s == null) return;

            s.Status = newStatus;
            s.SimpleStatus = newStatus switch
            {
                ShipmentStatus.Booked => ShipmentSimpleStatus.DISPATCHING,
                ShipmentStatus.VehicleReceived => ShipmentSimpleStatus.ON_HAND,
                ShipmentStatus.ContainerLoaded => ShipmentSimpleStatus.IN_TRANSIT,
                ShipmentStatus.InTransit => ShipmentSimpleStatus.IN_TRANSIT,
                ShipmentStatus.CustomsHold => ShipmentSimpleStatus.IN_TRANSIT,
                ShipmentStatus.CustomsCleared => ShipmentSimpleStatus.RELEASED,
                ShipmentStatus.Delivered => ShipmentSimpleStatus.DELIVERED,
                _ => s.SimpleStatus
            };

            UpdateMilestoneProgress(s);
            SaveStateInternal();
        }
    }

    public void AssignShipmentToContainer(string shipmentId, string containerId)
    {
        lock (_lock)
        {
            var s = _state.Shipments.FirstOrDefault(x => x.Id == shipmentId || x.TrackingNumber == shipmentId);
            var c = _state.Containers.FirstOrDefault(x => x.Id == containerId || x.ContainerNumber == containerId);
            if (s == null || c == null) return;

            if (!string.IsNullOrWhiteSpace(s.ContainerId))
            {
                var prev = _state.Containers.FirstOrDefault(x => x.Id == s.ContainerId);
                if (prev != null && prev.CurrentCount > 0) prev.CurrentCount--;
            }

            s.ContainerId = c.Id;
            s.ContainerNumber = c.ContainerNumber;
            s.VesselName = c.VesselName;
            s.VoyageNumber = c.VoyageNumber;
            s.DestinationPort = c.DestinationPort;
            c.CurrentCount++;
            SaveStateInternal();
        }
    }

    public void IssueReleaseToken(string shipmentId)
    {
        lock (_lock)
        {
            var s = _state.Shipments.FirstOrDefault(x => x.Id == shipmentId || x.TrackingNumber == shipmentId);
            if (s == null) return;
            s.ReleaseToken = $"REL-{Random.Shared.Next(100000, 999999)}";
            AddNotificationInternal("Release Token Issued", $"{s.TrackingNumber}: {s.ReleaseToken}", "INFO");
            SaveStateInternal();
        }
    }

    public void AddContainer(ContainerRecord container)
    {
        lock (_lock)
        {
            if (string.IsNullOrWhiteSpace(container.TrackingNumber))
                container.TrackingNumber = $"TRK-{Random.Shared.Next(100000, 999999)}";
            _state.Containers.Insert(0, container);
            SaveStateInternal();
        }
    }

    public void UpdateContainerStatus(string containerId, ContainerLifecycleStatus newStatus)
    {
        lock (_lock)
        {
            var c = _state.Containers.FirstOrDefault(x => x.Id == containerId || x.ContainerNumber == containerId);
            if (c == null) return;
            c.Status = newStatus;
            c.Progress = newStatus switch
            {
                ContainerLifecycleStatus.CREATED => 10,
                ContainerLifecycleStatus.WAITING_FOR_LOADING => 20,
                ContainerLifecycleStatus.LOADED => 35,
                ContainerLifecycleStatus.IN_TRANSIT => 60,
                ContainerLifecycleStatus.ARRIVED_PORT => 80,
                ContainerLifecycleStatus.CUSTOMS_CLEARANCE => 90,
                ContainerLifecycleStatus.RELEASED => 95,
                ContainerLifecycleStatus.CLOSED => 100,
                _ => c.Progress
            };
            SaveStateInternal();
        }
    }

    public void AddDispatch(DispatchRecord dispatch)
    {
        lock (_lock)
        {
            if (string.IsNullOrWhiteSpace(dispatch.ReferenceNumber))
                dispatch.ReferenceNumber = $"DSP-{DateTime.UtcNow:yyMM}-{Random.Shared.Next(100, 999)}";
            _state.Dispatches.Insert(0, dispatch);
            SaveStateInternal();
        }
    }

    public void UpdateDispatchStatus(string dispatchId, DispatchStatus newStatus)
    {
        lock (_lock)
        {
            var d = _state.Dispatches.FirstOrDefault(x => x.Id == dispatchId || x.ReferenceNumber == dispatchId);
            if (d == null) return;
            d.Status = newStatus;
            SaveStateInternal();
        }
    }

    public void AddTransit(TransitRecord transit)
    {
        lock (_lock)
        {
            if (string.IsNullOrWhiteSpace(transit.ReferenceNumber))
                transit.ReferenceNumber = $"TRN-{DateTime.UtcNow:yyMM}-{Random.Shared.Next(100, 999)}";
            _state.Transits.Insert(0, transit);
            SaveStateInternal();
        }
    }

    public void UpdateTransitStatus(string transitId, TransitStatus newStatus, string? receiverName = null)
    {
        lock (_lock)
        {
            var t = _state.Transits.FirstOrDefault(x => x.Id == transitId || x.ReferenceNumber == transitId);
            if (t == null) return;
            t.Status = newStatus;
            if (newStatus == TransitStatus.DELIVERED)
            {
                t.ActualDelivery = DateTime.UtcNow.ToString("yyyy-MM-dd");
                if (!string.IsNullOrWhiteSpace(receiverName)) t.DeliveryReceiverName = receiverName;
            }
            SaveStateInternal();
        }
    }

    public void RequestGatePass(string shipmentId)
    {
        lock (_lock)
        {
            var s = _state.Shipments.FirstOrDefault(x => x.Id == shipmentId || x.TrackingNumber == shipmentId);
            if (s == null) return;

            if (string.IsNullOrWhiteSpace(s.ReleaseToken))
                s.ReleaseToken = $"REL-{Random.Shared.Next(100000, 999999)}";

            s.CompanyGatePassRequested = true;
            s.CompanyGatePassRequestedAt = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm");

            if (!_state.GatePassRequests.Any(g => g.ShipmentId == s.Id && g.Status != "COMPLETED"))
            {
                _state.GatePassRequests.Insert(0, new GatePassRequest
                {
                    ShipmentId = s.Id,
                    TrackingNumber = s.TrackingNumber,
                    VehicleLabel = s.Vehicle.FullDescription,
                    Vin = s.Vehicle.Vin,
                    CustomerName = s.CustomerName,
                    ContainerNumber = s.ContainerNumber,
                    ReleaseToken = s.ReleaseToken,
                    Status = "REQUESTED"
                });
            }
            AddNotificationInternal("Gate Pass Requested", $"{s.Vehicle.FullDescription} ({s.ReleaseToken})", "WARNING");
            SaveStateInternal();
        }
    }

    public void CompleteGatePass(string gatePassId)
    {
        lock (_lock)
        {
            var gp = _state.GatePassRequests.FirstOrDefault(g => g.Id == gatePassId || g.ShipmentId == gatePassId);
            if (gp == null) return;

            gp.Status = "COMPLETED";
            gp.CompletedAt = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm");
            gp.DurationMinutes = Random.Shared.Next(18, 95);

            var shp = _state.Shipments.FirstOrDefault(s => s.Id == gp.ShipmentId);
            if (shp != null)
            {
                shp.CompanyGatePassCompletedAt = gp.CompletedAt;
                shp.SimpleStatus = ShipmentSimpleStatus.RELEASED;
                shp.Status = ShipmentStatus.CustomsCleared;
            }
            SaveStateInternal();
        }
    }

    public UserInvoiceRecord GenerateInvoiceForShipment(string shipmentId)
    {
        lock (_lock)
        {
            var s = _state.Shipments.FirstOrDefault(x => x.Id == shipmentId || x.TrackingNumber == shipmentId)
                ?? throw new InvalidOperationException("Shipment not found.");

            var existing = _state.Invoices.FirstOrDefault(i => i.ShipmentId == s.Id && i.Status != UserInvoiceStatus.VOID);
            if (existing != null) return existing;

            var lineItems = new List<InvoiceLineItemRecord>();
            if (s.PurchasePrice.HasValue && s.PurchasePrice.Value > 0)
            {
                lineItems.Add(new InvoiceLineItemRecord
                {
                    Description = $"{s.Vehicle.FullDescription} — Vehicle Purchase Price",
                    Type = "PURCHASE_PRICE",
                    Quantity = 1,
                    UnitPrice = s.PurchasePrice.Value
                });
            }
            lineItems.Add(new InvoiceLineItemRecord
            {
                Description = $"Inland Auction Towing ({s.Vehicle.AuctionYard} → {s.OriginPort})",
                Type = "HANDLING_FEE",
                Quantity = 1,
                UnitPrice = s.InlandTowingCost
            });
            lineItems.Add(new InvoiceLineItemRecord
            {
                Description = $"Ocean Container Freight ({s.OriginPort} → {s.DestinationPort})",
                Type = "SHIPPING_FEE",
                Quantity = 1,
                UnitPrice = s.OceanFreightCost
            });
            lineItems.Add(new InvoiceLineItemRecord
            {
                Description = "Customs Export & Title Validation Fee",
                Type = "CUSTOMS_FEE",
                Quantity = 1,
                UnitPrice = s.DocumentationFee
            });

            var inv = new UserInvoiceRecord
            {
                InvoiceNumber = $"INV-{DateTime.UtcNow:yyyy}-{Random.Shared.Next(1000, 9999)}",
                UserId = s.UserId,
                CustomerName = s.CustomerName,
                CustomerEmail = s.CustomerEmail,
                ShipmentId = s.Id,
                ContainerNumber = s.ContainerNumber,
                Status = UserInvoiceStatus.PENDING,
                Subtotal = lineItems.Sum(l => l.Amount),
                LineItems = lineItems,
                Notes = $"Auto-generated for {s.TrackingNumber} ({s.Vehicle.Vin})"
            };

            _state.Invoices.Insert(0, inv);
            SaveStateInternal();
            return inv;
        }
    }

    public void RecordInvoicePayment(string invoiceId, decimal amount, string method)
    {
        lock (_lock)
        {
            RecordInvoicePaymentInternal(invoiceId, amount, method);
            SaveStateInternal();
        }
    }

    private void RecordInvoicePaymentInternal(string invoiceId, decimal amount, string method)
    {
        var inv = _state.Invoices.FirstOrDefault(i => i.Id == invoiceId || i.InvoiceNumber == invoiceId);
        if (inv == null || amount <= 0) return;

        var applied = Math.Min(amount, inv.AmountRemaining);
        if (applied <= 0) applied = amount;

        inv.AmountPaid += applied;
        inv.PaymentMethod = method;
        if (inv.AmountRemaining <= 0.01m)
        {
            inv.Status = UserInvoiceStatus.PAID;
            inv.PaidDate = DateTime.UtcNow.ToString("yyyy-MM-dd");
        }
        else
        {
            inv.Status = UserInvoiceStatus.PARTIALLY_PAID;
        }

        if (!string.IsNullOrWhiteSpace(inv.ShipmentId))
        {
            var shp = _state.Shipments.FirstOrDefault(s => s.Id == inv.ShipmentId);
            if (shp != null)
            {
                shp.PaymentStatus = inv.Status == UserInvoiceStatus.PAID
                    ? PaymentStatus.COMPLETED
                    : PaymentStatus.PROCESSING;
            }
        }

        AddLedgerEntryInternal(inv.UserId, $"Payment for {inv.InvoiceNumber} ({method})", LedgerEntryType.CREDIT, applied, "SHIPPING_PAYMENT");
        AddNotificationInternal("Payment Recorded", $"{inv.InvoiceNumber}: ${applied:N2} ({method})", "SUCCESS");
    }

    public void MarkInvoiceOverdue(string invoiceId)
    {
        lock (_lock)
        {
            var inv = _state.Invoices.FirstOrDefault(i => i.Id == invoiceId || i.InvoiceNumber == invoiceId);
            if (inv == null) return;
            inv.Status = UserInvoiceStatus.OVERDUE;
            SaveStateInternal();
        }
    }

    public void AddLedgerEntry(string userId, string description, LedgerEntryType type, decimal amount, string infoType)
    {
        lock (_lock)
        {
            AddLedgerEntryInternal(userId, description, type, amount, infoType);
            SaveStateInternal();
        }
    }

    private void AddLedgerEntryInternal(string userId, string description, LedgerEntryType type, decimal amount, string infoType)
    {
        var user = _state.Users.FirstOrDefault(u => u.Id == userId) ?? _state.Users.FirstOrDefault();
        if (user == null) return;

        if (type == LedgerEntryType.DEBIT)
            user.Balance += amount;
        else
            user.Balance -= amount;

        _state.LedgerEntries.Insert(0, new LedgerEntryRecord
        {
            UserId = user.Id,
            CustomerName = user.Name,
            Description = description,
            Type = type,
            Amount = amount,
            Balance = user.Balance,
            TransactionInfoType = infoType,
            CreatedBy = _state.Session.CurrentAdmin.Name
        });
    }

    public void AddOfficeExpense(OfficeExpenseRecord expense)
    {
        lock (_lock)
        {
            _state.OfficeExpenses.Insert(0, expense);
            var budget = _state.ExpenseBudgets.FirstOrDefault(b => b.Category == expense.Category);
            if (budget != null) budget.SpentAmount += expense.Amount;
            SaveStateInternal();
        }
    }

    public void AddRecurringExpense(RecurringExpenseRecord recurring)
    {
        lock (_lock)
        {
            _state.RecurringExpenses.Insert(0, recurring);
            SaveStateInternal();
        }
    }

    public int RunDueRecurringExpenses()
    {
        lock (_lock)
        {
            int count = 0;
            foreach (var rec in _state.RecurringExpenses.Where(r => r.IsActive))
            {
                var exp = new OfficeExpenseRecord
                {
                    Title = $"{rec.Title} ({rec.Frequency})",
                    Category = rec.Category,
                    Amount = rec.Amount,
                    Vendor = rec.Vendor,
                    ReferenceNumber = $"AUTO-{Random.Shared.Next(1000, 9999)}",
                    Notes = $"Generated from recurring schedule {rec.Id}"
                };
                _state.OfficeExpenses.Insert(0, exp);
                var budget = _state.ExpenseBudgets.FirstOrDefault(b => b.Category == exp.Category);
                if (budget != null) budget.SpentAmount += exp.Amount;
                count++;
            }
            if (count > 0)
            {
                AddNotificationInternal("Recurring OpEx Posted", $"Generated {count} office expenses from active schedules.", "INFO");
                SaveStateInternal();
            }
            return count;
        }
    }

    public void AddLedgerTransfer(LedgerTransferType type, string sourceName, string destName, decimal amount, string reference)
    {
        lock (_lock)
        {
            _state.LedgerTransfers.Insert(0, new LedgerTransferRecord
            {
                TransferNumber = $"TRF-{DateTime.UtcNow:yyMM}-{Random.Shared.Next(1000, 9999)}",
                TransferType = type,
                SourceName = sourceName,
                DestName = destName,
                Amount = amount,
                Reference = reference,
                Status = "COMPLETED"
            });
            SaveStateInternal();
        }
    }

    public int ImportBankCsv(string csvContent)
    {
        lock (_lock)
        {
            int added = 0;
            var lines = (csvContent ?? string.Empty).Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries);
            foreach (var line in lines)
            {
                var parts = line.Split(',');
                if (parts.Length < 3) continue;
                if (!decimal.TryParse(parts[2].Trim().Trim('$'), out var amt) || amt <= 0) continue;

                _state.BankTransactions.Insert(0, new BankTransactionRecord
                {
                    BankSource = "BOA_CSV",
                    TransactionDate = parts[0].Trim(),
                    Description = parts[1].Trim(),
                    Amount = amt,
                    Reference = parts.Length > 3 ? parts[3].Trim() : $"CSV-{Random.Shared.Next(1000, 9999)}",
                    Status = BankReconciliationStatus.UNMATCHED
                });
                added++;
            }
            if (added > 0) SaveStateInternal();
            return added;
        }
    }

    public void ReconcileBankTransaction(string bankTxnId, string invoiceNumber)
    {
        lock (_lock)
        {
            var txn = _state.BankTransactions.FirstOrDefault(b => b.Id == bankTxnId);
            var inv = _state.Invoices.FirstOrDefault(i => i.InvoiceNumber == invoiceNumber);
            if (txn == null || inv == null) return;

            txn.Status = BankReconciliationStatus.MATCHED;
            txn.MatchedInvoiceNumber = inv.InvoiceNumber;
            txn.MatchedCustomerName = inv.CustomerName;

            RecordInvoicePaymentInternal(inv.Id, txn.Amount, $"BANK_{txn.BankSource}");
            SaveStateInternal();
        }
    }

    public void UpdateExchangeRate(string currency, decimal rateFromUsd)
    {
        lock (_lock)
        {
            var ex = _state.ExchangeRates.FirstOrDefault(r => r.Currency.Equals(currency, StringComparison.OrdinalIgnoreCase));
            if (ex != null)
            {
                ex.RateFromUsd = rateFromUsd;
                ex.EffectiveDate = DateTime.UtcNow.ToString("yyyy-MM-dd");
                ex.Source = "MANUAL";
                SaveStateInternal();
            }
        }
    }

    public void AddQualityCheck(QualityCheckRecord check)
    {
        lock (_lock)
        {
            _state.QualityChecks.Insert(0, check);
            if (check.DamageCost > 0)
            {
                var shp = _state.Shipments.FirstOrDefault(s => s.Id == check.ShipmentId || s.TrackingNumber == check.TrackingNumber);
                if (shp != null)
                {
                    if (check.DamageLiability == "WE_PAY") shp.DamageCredit += check.DamageCost;
                    else shp.DamageCost += check.DamageCost;
                }
            }
            SaveStateInternal();
        }
    }

    public TrackingDiagnosticRecord RunTrackingSync(string containerNumber)
    {
        lock (_lock)
        {
            var c = _state.Containers.FirstOrDefault(x => x.ContainerNumber.Equals(containerNumber, StringComparison.OrdinalIgnoreCase));
            if (c != null && c.Progress < 95)
            {
                c.Progress = Math.Min(95, c.Progress + 5);
            }

            var diag = new TrackingDiagnosticRecord
            {
                ContainerNumber = containerNumber,
                CarrierApi = "MarineTraffic AIS + Carrier EDI",
                SyncStatus = "OK (200)",
                LatencyMs = Random.Shared.Next(120, 340),
                VesselPosition = $"{32 + Random.Shared.NextDouble() * 8:F4}° N, {10 + Random.Shared.NextDouble() * 18:F4}° E",
                LastLocation = c?.CurrentLocation ?? "Mid-Atlantic Corridor"
            };
            _state.TrackingDiagnostics.Insert(0, diag);
            SaveStateInternal();
            return diag;
        }
    }

    public void AddAiInteraction(AiInteractionRecord log)
    {
        lock (_lock)
        {
            _state.AiInteractions.Insert(0, log);
            SaveStateInternal();
        }
    }

    public void AddCommunicationDispatch(CommunicationDispatchRecord dispatch)
    {
        lock (_lock)
        {
            _state.CommunicationDispatches.Insert(0, dispatch);
            AddNotificationInternal($"{dispatch.Channel} Sent", $"To {dispatch.Recipient}: {dispatch.Subject}", "SUCCESS");
            SaveStateInternal();
        }
    }

    public void AddNotification(string title, string description, string type = "INFO")
    {
        lock (_lock)
        {
            AddNotificationInternal(title, description, type);
            SaveStateInternal();
        }
    }

    private void AddNotificationInternal(string title, string description, string type)
    {
        _state.Notifications.Insert(0, new AdminNotificationItem
        {
            Title = title,
            Description = description,
            Type = type
        });
    }

    public void MarkAllNotificationsRead()
    {
        lock (_lock)
        {
            foreach (var n in _state.Notifications) n.IsRead = true;
            SaveStateInternal();
        }
    }

    public void AddUser(AdminUser user)
    {
        lock (_lock)
        {
            if (string.IsNullOrWhiteSpace(user.LoginCode))
                user.LoginCode = GenerateRandomLoginCode();
            _state.Users.Insert(0, user);
            SaveStateInternal();
        }
    }

    public void UpdateUserRole(string userId, string newRole)
    {
        lock (_lock)
        {
            var u = _state.Users.FirstOrDefault(x => x.Id == userId);
            if (u == null) return;
            u.Role = newRole;
            SaveStateInternal();
        }
    }

    public void UpdateUserCollectionStatus(string userId, CollectionStatus status)
    {
        lock (_lock)
        {
            var u = _state.Users.FirstOrDefault(x => x.Id == userId);
            if (u == null) return;
            u.CollectionStatus = status;
            SaveStateInternal();
        }
    }

    public string RegenerateUserLoginCode(string userId)
    {
        lock (_lock)
        {
            var u = _state.Users.FirstOrDefault(x => x.Id == userId);
            var code = GenerateRandomLoginCode();
            if (u != null)
            {
                u.LoginCode = code;
                SaveStateInternal();
            }
            return code;
        }
    }

    public void AddPartnerPortal(PartnerPortalRecord portal)
    {
        lock (_lock)
        {
            _state.PartnerPortals.Insert(0, portal);
            SaveStateInternal();
        }
    }

    public void TogglePartnerPortalActive(string portalId)
    {
        lock (_lock)
        {
            var p = _state.PartnerPortals.FirstOrDefault(x => x.Id == portalId);
            if (p == null) return;
            p.IsActive = !p.IsActive;
            SaveStateInternal();
        }
    }

    public string ExportSnapshotJson()
    {
        lock (_lock)
        {
            return JsonSerializer.Serialize(_state, new JsonSerializerOptions { WriteIndented = true });
        }
    }

    public void ResetToDemoData()
    {
        lock (_lock)
        {
            SeedDemoData();
            SaveStateInternal();
        }
    }

    public void SaveState()
    {
        lock (_lock) SaveStateInternal();
    }

    private void SaveStateInternal()
    {
        try
        {
            var dir = Path.GetDirectoryName(_storagePath);
            if (!string.IsNullOrWhiteSpace(dir)) Directory.CreateDirectory(dir);
            var json = JsonSerializer.Serialize(_state, new JsonSerializerOptions { WriteIndented = true });
            File.WriteAllText(_storagePath, json);
        }
        catch { }
    }

    private bool TryLoadState()
    {
        try
        {
            if (!File.Exists(_storagePath)) return false;
            var json = File.ReadAllText(_storagePath);
            var loaded = JsonSerializer.Deserialize<AdminDatabaseState>(json);
            if (loaded == null || loaded.Shipments.Count == 0) return false;
            _state = loaded;
            if (_state.BankTransactions.Count == 0) SeedEnterpriseModules();
            return true;
        }
        catch
        {
            return false;
        }
    }

    private static string GenerateRandomLoginCode()
    {
        const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        return new string(Enumerable.Range(0, 8).Select(_ => chars[Random.Shared.Next(chars.Length)]).ToArray());
    }

    private static void UpdateMilestoneProgress(Shipment s)
    {
        var targetIndex = s.Status switch
        {
            ShipmentStatus.Booked => 0,
            ShipmentStatus.VehicleReceived => 1,
            ShipmentStatus.ContainerLoaded => 2,
            ShipmentStatus.InTransit => 3,
            ShipmentStatus.CustomsHold => 4,
            ShipmentStatus.CustomsCleared => 4,
            ShipmentStatus.Delivered => 5,
            _ => 0
        };

        for (int i = 0; i < s.Milestones.Count; i++)
        {
            s.Milestones[i].IsCompleted = i < targetIndex || (i == targetIndex && s.Status == ShipmentStatus.Delivered);
            s.Milestones[i].IsCurrent = i == targetIndex && s.Status != ShipmentStatus.Delivered;
        }
    }

    private void SeedDemoData()
    {
        _state = new AdminDatabaseState();

        _state.Users.AddRange(new[]
        {
            new AdminUser { Id = "adm-001", Name = "JACXI Operations Admin", Email = "admin@jacxishipping.com", Role = "admin", Phone = "+1 (201) 555-0100", City = "Newark", Country = "USA", LoginCode = "JX884910", CollectionStatus = CollectionStatus.CURRENT, Balance = 0m, ShipmentCount = 0 },
            new AdminUser { Id = "usr-001", Name = "Tariq Logistics Ltd", Email = "dispatch@tariqlogistics.tr", Role = "user", Phone = "+90 532 994 1283", City = "Mersin", Country = "Turkey", LoginCode = "TRQ44910", CollectionStatus = CollectionStatus.CURRENT, Balance = 2000m, ShipmentCount = 2 },
            new AdminUser { Id = "usr-002", Name = "Al-Nour Auto Trading", Email = "accounts@alnourauto.ae", Role = "user", Phone = "+971 4 883 9102", City = "Dubai", Country = "UAE", LoginCode = "ALN72940", CollectionStatus = CollectionStatus.IN_COLLECTIONS, Balance = 1850m, ShipmentCount = 1, PromiseToPayDate = "2026-12-01" },
            new AdminUser { Id = "usr-003", Name = "Caucasus Motor Group", Email = "ops@caucasusmotors.ge", Role = "user", Phone = "+995 32 291 0044", City = "Poti", Country = "Georgia", LoginCode = "CMG93012", CollectionStatus = CollectionStatus.CURRENT, Balance = 0m, ShipmentCount = 1 },
            new AdminUser { Id = "usr-004", Name = "Ariana Transit Services", Email = "import@arianatransit.af", Role = "user", Phone = "+93 70 029 8831", City = "Kabul", Country = "Afghanistan", LoginCode = "ARN51289", CollectionStatus = CollectionStatus.FOLLOW_UP, Balance = 2950m, ShipmentCount = 1 },
            new AdminUser { Id = "usr-005", Name = "Khorasan Transport Co.", Email = "khorasan@freight.af", Role = "user", Phone = "+93 79 912 3456", City = "Herat", Country = "Afghanistan", LoginCode = "KHR64819", CollectionStatus = CollectionStatus.CURRENT, Balance = 2850m, ShipmentCount = 1 },
            new AdminUser { Id = "stf-002", Name = "Sarah Jenkins (Finance)", Email = "finance@jacxishipping.com", Role = "finance", Phone = "+1 (201) 555-0142", City = "Newark", Country = "USA", LoginCode = "FIN2026X", CollectionStatus = CollectionStatus.CURRENT },
            new AdminUser { Id = "stf-003", Name = "Omar Karim (Operations)", Email = "omar@jacxishipping.com", Role = "operations", Phone = "+971 50 442 1190", City = "Dubai", Country = "UAE", LoginCode = "OPS2026Y", CollectionStatus = CollectionStatus.CURRENT }
        });

        _state.Companies.AddRange(new[]
        {
            new ShippingCompany { Id = "cmp-001", Name = "MSC Mediterranean Shipping", Code = "MSC", Email = "booking@msc.example", Phone = "+1 800 672 5463", Country = "Switzerland / Global", IsShipping = true, Balance = -14200m },
            new ShippingCompany { Id = "cmp-002", Name = "CMA CGM Group", Code = "CMA", Email = "export@cmacgm.example", Phone = "+1 877 556 6308", Country = "France / Global", IsShipping = true, Balance = -6850m },
            new ShippingCompany { Id = "cmp-003", Name = "Atlantic Auto Towing LLC", Code = "AAT", Email = "dispatch@atlantictow.example", Phone = "+1 973 555 0198", Country = "USA", IsDispatch = true, Balance = -2450m },
            new ShippingCompany { Id = "cmp-004", Name = "Silk Road Border Transit", Code = "SRBT", Email = "border@silkroadtransit.af", Phone = "+971 4 555 8890", Country = "UAE / Afghanistan", IsTransit = true, Balance = -4100m }
        });

        _state.Containers.AddRange(new[]
        {
            new ContainerRecord { Id = "cnt-001", ContainerNumber = "MSCU7829104", TrackingNumber = "TRK-884910", CompanyId = "cmp-001", CompanyName = "MSC Mediterranean Shipping", VesselName = "MSC MEDITERRANEAN V", VoyageNumber = "TX2026-B", ShippingLine = "MSC", BookingNumber = "EBKG994012", LoadingPort = "Port of Newark, NJ", DestinationPort = "Port of Mersin, Turkey", Status = ContainerLifecycleStatus.IN_TRANSIT, CurrentLocation = "Mid-Atlantic Corridor", Progress = 65, MaxCapacity = 4, CurrentCount = 2, ExpensesTotal = 4600m },
            new ContainerRecord { Id = "cnt-002", ContainerNumber = "CMAU4920193", TrackingNumber = "TRK-729401", CompanyId = "cmp-002", CompanyName = "CMA CGM Group", VesselName = "CMA CGM ANTOINE", VoyageNumber = "UAE441-X", ShippingLine = "CMA CGM", BookingNumber = "CMA881203", LoadingPort = "Port of Houston, TX", DestinationPort = "Jebel Ali Port, Dubai, UAE", Status = ContainerLifecycleStatus.CUSTOMS_CLEARANCE, CurrentLocation = "Jebel Ali Gate 3", Progress = 90, MaxCapacity = 4, CurrentCount = 1, ExpensesTotal = 4100m },
            new ContainerRecord { Id = "cnt-003", ContainerNumber = "HLXU9182746", TrackingNumber = "TRK-930120", CompanyId = "cmp-001", CompanyName = "Hapag-Lloyd", VesselName = "HAPAG-LLOYD EXPRESS", VoyageNumber = "GE2026-09", ShippingLine = "Hapag-Lloyd", BookingNumber = "HLCU220194", LoadingPort = "Port of Savannah, GA", DestinationPort = "Port of Poti, Georgia", Status = ContainerLifecycleStatus.CLOSED, CurrentLocation = "Poti Sea Port Terminal", Progress = 100, MaxCapacity = 4, CurrentCount = 1, ExpensesTotal = 4450m },
            new ContainerRecord { Id = "cnt-004", ContainerNumber = "ONEU8819203", TrackingNumber = "TRK-648190", CompanyId = "cmp-002", CompanyName = "ONE Line", VesselName = "ONE INTEGRITY", VoyageNumber = "ONE-084E", ShippingLine = "ONE", BookingNumber = "ONEY881920", LoadingPort = "Port of Newark, NJ", DestinationPort = "Islam Qala Border, Afghanistan", Status = ContainerLifecycleStatus.LOADED, CurrentLocation = "Newark Berth 12", Progress = 35, MaxCapacity = 4, CurrentCount = 1, ExpensesTotal = 4900m }
        });

        _state.Dispatches.AddRange(new[]
        {
            new DispatchRecord { Id = "dsp-001", ReferenceNumber = "DSP-2611-101", CompanyId = "cmp-003", CompanyName = "Atlantic Auto Towing LLC", Origin = "Copart North Boston, MA", Destination = "Port of Newark, NJ", Status = DispatchStatus.COMPLETED, Cost = 400m, VehicleCount = 1, Notes = "Delivered to Yard 4 on schedule." },
            new DispatchRecord { Id = "dsp-002", ReferenceNumber = "DSP-2611-102", CompanyId = "cmp-003", CompanyName = "Atlantic Auto Towing LLC", Origin = "Copart Los Angeles, CA", Destination = "Port of Los Angeles, CA", Status = DispatchStatus.DISPATCHED, Cost = 650m, VehicleCount = 1, Notes = "Flatbed en route to Pier 400." },
            new DispatchRecord { Id = "dsp-003", ReferenceNumber = "DSP-2611-103", CompanyId = "cmp-003", CompanyName = "Atlantic Auto Towing LLC", Origin = "Copart Hartford, CT", Destination = "Port of Newark, NJ", Status = DispatchStatus.COMPLETED, Cost = 400m, VehicleCount = 1, Notes = "Gate verified." }
        });

        _state.Transits.AddRange(new[]
        {
            new TransitRecord { Id = "trn-001", ReferenceNumber = "TRN-2611-401", CompanyId = "cmp-004", CompanyName = "Silk Road Border Transit", Origin = "Jebel Ali Port, UAE", Destination = "Kabul, Afghanistan", BorderCrossing = "Islam Qala", Status = TransitStatus.IN_TRANSIT, Cost = 1150m, VehicleCount = 1, Notes = "Bonded flatbed convoy cleared customs zone." },
            new TransitRecord { Id = "trn-002", ReferenceNumber = "TRN-2611-402", CompanyId = "cmp-004", CompanyName = "Silk Road Border Transit", Origin = "Bandar Abbas Port", Destination = "Hairatan, Afghanistan", BorderCrossing = "Hairatan Rail", Status = TransitStatus.PENDING, Cost = 1250m, VehicleCount = 1, Notes = "Awaiting vessel discharge." }
        });

        _state.Shipments.AddRange(new[]
        {
            new Shipment
            {
                Id = "shp-001", TrackingNumber = "JCX-2601-88491", ContainerId = "cnt-001", ContainerNumber = "MSCU7829104", DispatchId = "dsp-001", UserId = "usr-001",
                ServiceType = ServiceType.SHIPPING_ONLY, SimpleStatus = ShipmentSimpleStatus.IN_TRANSIT, BookingDate = "2026-11-12", EstimatedDelivery = "2026-12-10",
                OriginPort = "Port of Newark, NJ", DestinationPort = "Port of Mersin, Turkey", Status = ShipmentStatus.InTransit, PaymentStatus = PaymentStatus.PENDING,
                CustomerName = "Tariq Logistics Ltd", CustomerEmail = "dispatch@tariqlogistics.tr", CustomerPhone = "+90 532 994 1283",
                OceanFreightCost = 1450m, InlandTowingCost = 400m, DocumentationFee = 150m, CompanyShippingFare = 1420m, VesselName = "MSC MEDITERRANEAN V", VoyageNumber = "TX2026-B",
                Vehicle = new VehicleInspection { Vin = "1HGCR2F83HA029184", Year = 2023, Make = "Toyota", Model = "RAV4 XLE AWD", LotNumber = "54889576", AuctionYard = "Copart North Boston, MA", RunsAndDrives = true, HasKeys = true, TitleStatus = "Clean Export Title", ConditionNotes = "Clean run & drive. Front bumper scuff.", PhotoCount = 16 },
                Milestones = new List<ShipmentMilestone>
                {
                    new("Booking Confirmed", "Port of Newark, NJ", "2026-11-12 09:30", true, false, "Booking generated."),
                    new("Vehicle Received at Terminal", "Newark Terminal Yard 4", "2026-11-15 14:10", true, false, "16 photos logged."),
                    new("Loaded in Container", "Container MSCU7829104", "2026-11-18 11:45", true, false, "Sealed #JCX-99401."),
                    new("Ocean Transit", "MSC MEDITERRANEAN V", "2026-11-20 06:00", false, true, "Mid-Atlantic underway."),
                    new("Customs Clearance", "Port of Mersin, Turkey", "Est. 2026-12-05", false, false, "Manifest queued."),
                    new("Final Delivery", "Mersin Free Zone Yard B", "Est. 2026-12-10", false, false, "Token release.")
                }
            },
            new Shipment
            {
                Id = "shp-002", TrackingNumber = "JCX-2601-72940", ContainerId = "cnt-002", ContainerNumber = "CMAU4920193", UserId = "usr-002",
                ServiceType = ServiceType.PURCHASE_AND_SHIPPING, PurchasePrice = 18500m, SimpleStatus = ShipmentSimpleStatus.IN_TRANSIT, BookingDate = "2026-11-05", EstimatedDelivery = "2026-12-02",
                OriginPort = "Port of Houston, TX", DestinationPort = "Jebel Ali Port, Dubai, UAE", Status = ShipmentStatus.CustomsHold, PaymentStatus = PaymentStatus.PENDING,
                CustomerName = "Al-Nour Auto Trading", CustomerEmail = "accounts@alnourauto.ae", CustomerPhone = "+971 4 883 9102",
                OceanFreightCost = 1350m, InlandTowingCost = 350m, DocumentationFee = 150m, CompanyShippingFare = 1310m, ReleaseToken = "REL-729401", CompanyGatePassRequested = true, CompanyGatePassRequestedAt = "2026-11-25 14:15", VesselName = "CMA CGM ANTOINE", VoyageNumber = "UAE441-X",
                Vehicle = new VehicleInspection { Vin = "4T1B11HK5JU773910", Year = 2024, Make = "Lexus", Model = "RX 350 Luxury", LotNumber = "61902844", AuctionYard = "Copart Dallas, TX", RunsAndDrives = true, HasKeys = true, TitleStatus = "Pending Title Validation", ConditionNotes = "Awaiting physical title original.", PhotoCount = 20 },
                Milestones = new List<ShipmentMilestone>
                {
                    new("Booking Confirmed", "Port of Houston, TX", "2026-11-05 10:00", true, false, "File opened."),
                    new("Vehicle Received", "Houston Bay Terminal", "2026-11-08 16:30", true, false, "Inspection complete."),
                    new("Loaded in Container", "CMAU4920193", "2026-11-11 13:00", true, false, "Signed."),
                    new("Ocean Transit", "CMA CGM ANTOINE", "2026-11-13 08:00", true, false, "Arrived Jebel Ali."),
                    new("Customs Clearance", "Jebel Ali Customs Gate 3", "2026-11-25 15:00", false, true, "Title certificate requested."),
                    new("Final Delivery", "Dubai Auto Zone Yard 7", "Est. 2026-12-02", false, false, "Pending clearance.")
                }
            },
            new Shipment
            {
                Id = "shp-003", TrackingNumber = "JCX-2601-93012", ContainerId = "cnt-003", ContainerNumber = "HLXU9182746", UserId = "usr-003",
                ServiceType = ServiceType.SHIPPING_ONLY, SimpleStatus = ShipmentSimpleStatus.DELIVERED, BookingDate = "2026-10-22", EstimatedDelivery = "2026-11-24",
                OriginPort = "Port of Savannah, GA", DestinationPort = "Port of Poti, Georgia", Status = ShipmentStatus.Delivered, PaymentStatus = PaymentStatus.COMPLETED,
                CustomerName = "Caucasus Motor Group", CustomerEmail = "ops@caucasusmotors.ge", CustomerPhone = "+995 32 291 0044",
                OceanFreightCost = 1550m, InlandTowingCost = 450m, DocumentationFee = 150m, CompanyShippingFare = 1580m, ReleaseToken = "REL-930120", VesselName = "HAPAG-LLOYD EXPRESS", VoyageNumber = "GE2026-09",
                Vehicle = new VehicleInspection { Vin = "WAUZZZF27NA019283", Year = 2022, Make = "Audi", Model = "Q5 45 TFSI Quattro", LotNumber = "49018273", AuctionYard = "IAAI Atlanta, GA", RunsAndDrives = true, HasKeys = true, TitleStatus = "Clean Export Title", ConditionNotes = "Released to customer.", PhotoCount = 18 },
                Milestones = new List<ShipmentMilestone>
                {
                    new("Booking Confirmed", "Port of Savannah, GA", "2026-10-22 11:00", true, false, "Completed."),
                    new("Vehicle Received", "Savannah Terminal", "2026-10-25 09:00", true, false, "Checked."),
                    new("Loaded in Container", "HLXU9182746", "2026-10-28 14:00", true, false, "40ft High Cube."),
                    new("Ocean Transit", "HAPAG-LLOYD EXPRESS", "2026-10-31 18:00", true, false, "Discharged Poti."),
                    new("Customs Clearance", "Poti Customs", "2026-11-20 10:00", true, false, "Cleared."),
                    new("Final Delivery", "Poti Terminal B", "2026-11-24 16:30", true, false, "Signed BOL.")
                }
            },
            new Shipment
            {
                Id = "shp-004", TrackingNumber = "JCX-2601-51289", ContainerNumber = "MSCU3019281", DispatchId = "dsp-002", TransitId = "trn-002", UserId = "usr-004",
                ServiceType = ServiceType.SHIPPING_ONLY, SimpleStatus = ShipmentSimpleStatus.DISPATCHING, BookingDate = "2026-11-22", EstimatedDelivery = "2026-12-28",
                OriginPort = "Port of Los Angeles, CA", DestinationPort = "Hairatan Border, Afghanistan", Status = ShipmentStatus.Booked, PaymentStatus = PaymentStatus.PENDING,
                CustomerName = "Ariana Transit Services", CustomerEmail = "import@arianatransit.af", CustomerPhone = "+93 70 029 8831",
                OceanFreightCost = 2100m, InlandTowingCost = 650m, DocumentationFee = 200m, CompanyShippingFare = 2250m, VesselName = "EVER GIVEN II", VoyageNumber = "AFG-PACIFIC-11",
                Vehicle = new VehicleInspection { Vin = "5UXCR6C04N9G20194", Year = 2023, Make = "BMW", Model = "X5 xDrive40i", LotNumber = "77291045", AuctionYard = "Copart Los Angeles, CA", RunsAndDrives = true, HasKeys = true, TitleStatus = "Clean Certificate of Title", ConditionNotes = "Flatbed dispatched.", PhotoCount = 8 },
                Milestones = new List<ShipmentMilestone>
                {
                    new("Booking Confirmed", "Port of Los Angeles, CA", "2026-11-22 08:30", true, false, "Confirmed."),
                    new("Vehicle Dispatch", "Copart LA", "In Progress", false, true, "Driver assigned."),
                    new("Loaded in Container", "LA Pier 400", "Pending", false, false, "Scheduled."),
                    new("Ocean & Rail", "EVER GIVEN II", "Est. 2026-12-02", false, false, "Multimodal."),
                    new("Customs Clearance", "Hairatan Border", "Est. 2026-12-22", false, false, "Border post."),
                    new("Final Delivery", "Hairatan Port", "Est. 2026-12-28", false, false, "Release.")
                }
            },
            new Shipment
            {
                Id = "shp-005", TrackingNumber = "JCX-2601-64819", ContainerId = "cnt-004", ContainerNumber = "ONEU8819203", DispatchId = "dsp-003", TransitId = "trn-001", UserId = "usr-005",
                ServiceType = ServiceType.SHIPPING_ONLY, SimpleStatus = ShipmentSimpleStatus.ON_HAND, BookingDate = "2026-11-19", EstimatedDelivery = "2026-12-22",
                OriginPort = "Port of Newark, NJ", DestinationPort = "Islam Qala Border, Afghanistan", Status = ShipmentStatus.ContainerLoaded, PaymentStatus = PaymentStatus.PENDING,
                CustomerName = "Khorasan Transport Co.", CustomerEmail = "khorasan@freight.af", CustomerPhone = "+93 79 912 3456",
                OceanFreightCost = 2250m, InlandTowingCost = 400m, DocumentationFee = 200m, CompanyShippingFare = 2190m, VesselName = "ONE INTEGRITY", VoyageNumber = "ONE-084E",
                Vehicle = new VehicleInspection { Vin = "3FA6P0HD8LR192840", Year = 2021, Make = "Ford", Model = "Fusion Titanium AWD", LotNumber = "58190284", AuctionYard = "Copart Hartford, CT", RunsAndDrives = true, HasKeys = true, TitleStatus = "Salvage Certificate (Export Allowed)", ConditionNotes = "Right quarter panel damage.", PhotoCount = 14 },
                Milestones = new List<ShipmentMilestone>
                {
                    new("Booking Confirmed", "Port of Newark, NJ", "2026-11-19 14:00", true, false, "Generated."),
                    new("Vehicle Received", "Newark Yard 2", "2026-11-21 11:20", true, false, "Staged."),
                    new("Loaded in Container", "ONEU8819203", "2026-11-24 16:00", true, false, "Sealed #JCX-88192."),
                    new("Ocean Transit", "ONE INTEGRITY", "Est. 2026-11-28", false, true, "Awaiting boarding."),
                    new("Customs Clearance", "Islam Qala", "Est. 2026-12-18", false, false, "Prepared."),
                    new("Final Delivery", "Islam Qala Yard", "Est. 2026-12-22", false, false, "Handover.")
                }
            },
            new Shipment
            {
                Id = "shp-006", TrackingNumber = "JCX-2601-33019", ContainerId = "cnt-001", ContainerNumber = "MSCU7829104", UserId = "usr-001",
                ServiceType = ServiceType.SHIPPING_ONLY, SimpleStatus = ShipmentSimpleStatus.RELEASED, BookingDate = "2026-11-10", EstimatedDelivery = "2026-11-30",
                OriginPort = "Port of Newark, NJ", DestinationPort = "Port of Mersin, Turkey", Status = ShipmentStatus.CustomsCleared, PaymentStatus = PaymentStatus.COMPLETED,
                CustomerName = "Tariq Logistics Ltd", CustomerEmail = "dispatch@tariqlogistics.tr", CustomerPhone = "+90 532 994 1283",
                OceanFreightCost = 1450m, InlandTowingCost = 320m, DocumentationFee = 150m, CompanyShippingFare = 1390m, ReleaseToken = "REL-330194", CompanyGatePassRequested = true, CompanyGatePassRequestedAt = "2026-11-26 09:00", VesselName = "MSC MEDITERRANEAN V", VoyageNumber = "TX2026-B",
                Vehicle = new VehicleInspection { Vin = "5NPE24AF0JH649102", Year = 2023, Make = "Hyundai", Model = "Sonata SEL", LotNumber = "51990381", AuctionYard = "IAAI Avenel, NJ", RunsAndDrives = true, HasKeys = true, TitleStatus = "Clean Export Title", ConditionNotes = "Ready for pickup.", PhotoCount = 12 },
                Milestones = new List<ShipmentMilestone>
                {
                    new("Booking Confirmed", "Port of Newark, NJ", "2026-11-10 10:00", true, false, "Booked."),
                    new("Vehicle Received", "Newark Yard", "2026-11-12 12:00", true, false, "Inspected."),
                    new("Container Loaded", "MSCU7829104", "2026-11-15 15:00", true, false, "Loaded."),
                    new("Ocean Transit", "MSC MEDITERRANEAN V", "2026-11-22 08:00", true, false, "Arrived Mersin."),
                    new("Customs Cleared", "Port of Mersin", "2026-11-26 08:45", true, false, "Cleared."),
                    new("Gate Release", "Mersin Yard B", "Pending Pickup", false, true, "Queued.")
                }
            }
        });

        _state.GatePassRequests.AddRange(new[]
        {
            new GatePassRequest { Id = "gp-001", ShipmentId = "shp-002", TrackingNumber = "JCX-2601-72940", VehicleLabel = "2024 Lexus RX 350 Luxury", Vin = "4T1B11HK5JU773910", CustomerName = "Al-Nour Auto Trading", ContainerNumber = "CMAU4920193", ReleaseToken = "REL-729401", RequestedAt = "2026-11-25 14:15", Status = "REQUESTED" },
            new GatePassRequest { Id = "gp-002", ShipmentId = "shp-006", TrackingNumber = "JCX-2601-33019", VehicleLabel = "2023 Hyundai Sonata SEL", Vin = "5NPE24AF0JH649102", CustomerName = "Tariq Logistics Ltd", ContainerNumber = "MSCU7829104", ReleaseToken = "REL-330194", RequestedAt = "2026-11-26 09:00", Status = "IN_PROGRESS" }
        });

        _state.Invoices.AddRange(new[]
        {
            new UserInvoiceRecord
            {
                Id = "inv-001", InvoiceNumber = "INV-2026-1001", UserId = "usr-001", CustomerName = "Tariq Logistics Ltd", CustomerEmail = "dispatch@tariqlogistics.tr",
                ShipmentId = "shp-001", ContainerNumber = "MSCU7829104", Status = UserInvoiceStatus.PENDING, IssueDate = "2026-11-12", DueDate = "2026-11-28",
                Subtotal = 2000m, AmountPaid = 0m,
                LineItems = new List<InvoiceLineItemRecord>
                {
                    new() { Description = "Inland Auction Towing (Copart Boston → Newark)", Type = "HANDLING_FEE", UnitPrice = 400m },
                    new() { Description = "Ocean Freight (Newark → Mersin)", Type = "SHIPPING_FEE", UnitPrice = 1450m },
                    new() { Description = "Customs Export Documentation", Type = "CUSTOMS_FEE", UnitPrice = 150m }
                }
            },
            new UserInvoiceRecord
            {
                Id = "inv-002", InvoiceNumber = "INV-2026-1002", UserId = "usr-002", CustomerName = "Al-Nour Auto Trading", CustomerEmail = "accounts@alnourauto.ae",
                ShipmentId = "shp-002", ContainerNumber = "CMAU4920193", Status = UserInvoiceStatus.OVERDUE, IssueDate = "2026-11-05", DueDate = "2026-11-19",
                Subtotal = 20350m, AmountPaid = 18500m,
                LineItems = new List<InvoiceLineItemRecord>
                {
                    new() { Description = "2024 Lexus RX 350 — Vehicle Purchase", Type = "PURCHASE_PRICE", UnitPrice = 18500m },
                    new() { Description = "Inland Towing (Copart Dallas → Houston)", Type = "HANDLING_FEE", UnitPrice = 350m },
                    new() { Description = "Ocean Freight (Houston → Jebel Ali)", Type = "SHIPPING_FEE", UnitPrice = 1350m },
                    new() { Description = "Customs & Title Validation", Type = "CUSTOMS_FEE", UnitPrice = 150m }
                }
            },
            new UserInvoiceRecord
            {
                Id = "inv-003", InvoiceNumber = "INV-2026-1003", UserId = "usr-003", CustomerName = "Caucasus Motor Group", CustomerEmail = "ops@caucasusmotors.ge",
                ShipmentId = "shp-003", ContainerNumber = "HLXU9182746", Status = UserInvoiceStatus.PAID, IssueDate = "2026-10-22", DueDate = "2026-11-05", PaidDate = "2026-11-02",
                Subtotal = 2150m, AmountPaid = 2150m, PaymentMethod = "WIRE_TRANSFER",
                LineItems = new List<InvoiceLineItemRecord>
                {
                    new() { Description = "Inland Towing (IAAI Atlanta → Savannah)", Type = "HANDLING_FEE", UnitPrice = 450m },
                    new() { Description = "Ocean Freight (Savannah → Poti)", Type = "SHIPPING_FEE", UnitPrice = 1550m },
                    new() { Description = "Customs Documentation", Type = "CUSTOMS_FEE", UnitPrice = 150m }
                }
            },
            new UserInvoiceRecord
            {
                Id = "inv-004", InvoiceNumber = "INV-2026-1004", UserId = "usr-004", CustomerName = "Ariana Transit Services", CustomerEmail = "import@arianatransit.af",
                ShipmentId = "shp-004", ContainerNumber = "MSCU3019281", Status = UserInvoiceStatus.PARTIALLY_PAID, IssueDate = "2026-11-22", DueDate = "2026-12-06",
                Subtotal = 2950m, AmountPaid = 1000m, PaymentMethod = "BANK_TRANSFER",
                LineItems = new List<InvoiceLineItemRecord>
                {
                    new() { Description = "Inland Towing (Copart LA → Pier 400)", Type = "HANDLING_FEE", UnitPrice = 650m },
                    new() { Description = "Multimodal Ocean + Rail Freight (LA → Hairatan)", Type = "SHIPPING_FEE", UnitPrice = 2100m },
                    new() { Description = "Border Transit Documentation", Type = "CUSTOMS_FEE", UnitPrice = 200m }
                }
            }
        });

        _state.LedgerEntries.AddRange(new[]
        {
            new LedgerEntryRecord { Id = "ldg-001", UserId = "usr-003", CustomerName = "Caucasus Motor Group", ShipmentId = "shp-003", TransactionDate = "2026-11-02", Description = "Wire payment for INV-2026-1003", Type = LedgerEntryType.CREDIT, Amount = 2150m, Balance = 0m, TransactionInfoType = "SHIPPING_PAYMENT" },
            new LedgerEntryRecord { Id = "ldg-002", UserId = "usr-004", CustomerName = "Ariana Transit Services", ShipmentId = "shp-004", TransactionDate = "2026-11-23", Description = "Deposit for INV-2026-1004 (BMW X5)", Type = LedgerEntryType.CREDIT, Amount = 1000m, Balance = 1950m, TransactionInfoType = "SHIPPING_PAYMENT" },
            new LedgerEntryRecord { Id = "ldg-003", UserId = "usr-002", CustomerName = "Al-Nour Auto Trading", ShipmentId = "shp-002", TransactionDate = "2026-11-06", Description = "Vehicle Purchase Settlement (Lexus RX 350)", Type = LedgerEntryType.CREDIT, Amount = 18500m, Balance = 1850m, TransactionInfoType = "CAR_PAYMENT" },
            new LedgerEntryRecord { Id = "ldg-004", UserId = "usr-001", CustomerName = "Tariq Logistics Ltd", ShipmentId = "shp-001", TransactionDate = "2026-11-12", Description = "Freight Charge: 2023 Toyota RAV4 (JCX-2601-88491)", Type = LedgerEntryType.DEBIT, Amount = 2000m, Balance = 2000m, TransactionInfoType = "SHIPPING_PAYMENT" }
        });

        _state.OfficeExpenses.AddRange(new[]
        {
            new OfficeExpenseRecord { Id = "exp-001", Title = "Newark Terminal Office Lease", Category = OfficeExpenseCategory.RENT, Amount = 4200m, ExpenseDate = "2026-11-01", Vendor = "Port Newark Realty", ReferenceNumber = "RENT-2611" },
            new OfficeExpenseRecord { Id = "exp-002", Title = "Operations Staff Payroll (Nov)", Category = OfficeExpenseCategory.SALARIES_PAYROLL, Amount = 12800m, ExpenseDate = "2026-11-15", Vendor = "Gusto Payroll", ReferenceNumber = "PAY-2611" },
            new OfficeExpenseRecord { Id = "exp-003", Title = "Cloud Hosting & Vessel AIS Feed", Category = OfficeExpenseCategory.SOFTWARE_SUBSCRIPTIONS, Amount = 640m, ExpenseDate = "2026-11-10", Vendor = "Vercel / MarineTraffic", ReferenceNumber = "SUB-9921" },
            new OfficeExpenseRecord { Id = "exp-004", Title = "Terminal Utilities & Fiber Internet", Category = OfficeExpenseCategory.UTILITIES, Amount = 485m, ExpenseDate = "2026-11-12", Vendor = "PSE&G / Verizon", ReferenceNumber = "UTL-4410" }
        });

        _state.ExpenseBudgets.AddRange(new[]
        {
            new ExpenseBudgetRecord { Id = "bdg-001", Name = "Office & Terminal Rent", Category = OfficeExpenseCategory.RENT, MonthlyLimit = 4500m, SpentAmount = 4200m },
            new ExpenseBudgetRecord { Id = "bdg-002", Name = "Operations Payroll", Category = OfficeExpenseCategory.SALARIES_PAYROLL, MonthlyLimit = 15000m, SpentAmount = 12800m },
            new ExpenseBudgetRecord { Id = "bdg-003", Name = "Software & AIS Tracking APIs", Category = OfficeExpenseCategory.SOFTWARE_SUBSCRIPTIONS, MonthlyLimit = 1000m, SpentAmount = 640m },
            new ExpenseBudgetRecord { Id = "bdg-004", Name = "Utilities & Connectivity", Category = OfficeExpenseCategory.UTILITIES, MonthlyLimit = 800m, SpentAmount = 485m }
        });

        _state.LedgerTransfers.AddRange(new[]
        {
            new LedgerTransferRecord { Id = "trf-001", TransferNumber = "TRF-2611-8801", TransferType = LedgerTransferType.USER_TO_COMPANY, SourceName = "Caucasus Motor Group", DestName = "MSC Mediterranean Shipping", Amount = 1580m, TransferDate = "2026-11-03", Reference = "Settled HLXU9182746" },
            new LedgerTransferRecord { Id = "trf-002", TransferNumber = "TRF-2611-8802", TransferType = LedgerTransferType.COMPANY_TO_COMPANY, SourceName = "JACXI Treasury", DestName = "Atlantic Auto Towing LLC", Amount = 800m, TransferDate = "2026-11-19", Reference = "Batch Towing Settlement" }
        });

        _state.PartnerPortals.AddRange(new[]
        {
            new PartnerPortalRecord { Id = "prt-001", Name = "Mersin Auto Hub Portal", Code = "MERSIN-HUB", CustomDomain = "portal.mersinauto.tr", AccentColor = "#D4AF37", CustomerCount = 14, AssignedShipmentsCount = 38, Balance = 12400m, IsActive = true },
            new PartnerPortalRecord { Id = "prt-002", Name = "Dubai Al-Nour Partner Desk", Code = "DUBAI-ALNOUR", CustomDomain = "ship.alnourauto.ae", AccentColor = "#3B82F6", CustomerCount = 9, AssignedShipmentsCount = 21, Balance = 6850m, IsActive = true }
        });

        SeedEnterpriseModules();
    }

    private void SeedEnterpriseModules()
    {
        _state.BankTransactions.AddRange(new[]
        {
            new BankTransactionRecord { Id = "bnk-001", BankSource = "PLAID", TransactionDate = "2026-11-26", Description = "WIRE IN: TARIQ LOGISTICS LTD", Amount = 2000m, Reference = "FEDWIRE-994012", Status = BankReconciliationStatus.UNMATCHED },
            new BankTransactionRecord { Id = "bnk-002", BankSource = "BOA_CSV", TransactionDate = "2026-11-25", Description = "ACH CREDIT: AL-NOUR AUTO DUBAI", Amount = 1850m, Reference = "ACH-729400", Status = BankReconciliationStatus.UNMATCHED },
            new BankTransactionRecord { Id = "bnk-003", BankSource = "PLAID", TransactionDate = "2026-11-02", Description = "WIRE: CAUCASUS MOTOR GROUP", Amount = 2150m, Reference = "SWIFT-93012", Status = BankReconciliationStatus.MATCHED, MatchedInvoiceNumber = "INV-2026-1003", MatchedCustomerName = "Caucasus Motor Group" }
        });

        _state.ExchangeRates.AddRange(new[]
        {
            new ExchangeRateRecord { Currency = "USD", Name = "US Dollar (Base)", RateFromUsd = 1.0000m, Source = "FIXED" },
            new ExchangeRateRecord { Currency = "AED", Name = "UAE Dirham", RateFromUsd = 3.6725m, Source = "FIXED" },
            new ExchangeRateRecord { Currency = "TRY", Name = "Turkish Lira", RateFromUsd = 34.4800m, Source = "EXCHANGERATE_API" },
            new ExchangeRateRecord { Currency = "EUR", Name = "Euro", RateFromUsd = 0.9480m, Source = "EXCHANGERATE_API" },
            new ExchangeRateRecord { Currency = "GEL", Name = "Georgian Lari", RateFromUsd = 2.7400m, Source = "MANUAL" },
            new ExchangeRateRecord { Currency = "AFN", Name = "Afghan Afghani", RateFromUsd = 68.5000m, Source = "MANUAL" }
        });

        _state.CarrierQuotes.AddRange(new[]
        {
            new CarrierPriceQuote { CarrierName = "MSC Mediterranean Shipping", Route = "Newark → Mersin, Turkey", TransitDays = 21, OceanRate = 1350m, HandlingFee = 120m, ReliabilityScore = "98%", IsRecommended = true },
            new CarrierPriceQuote { CarrierName = "CMA CGM Group", Route = "Houston → Jebel Ali, UAE", TransitDays = 25, OceanRate = 1250m, HandlingFee = 135m, ReliabilityScore = "96%", IsRecommended = true },
            new CarrierPriceQuote { CarrierName = "Hapag-Lloyd Express", Route = "Savannah → Poti, Georgia", TransitDays = 28, OceanRate = 1450m, HandlingFee = 150m, ReliabilityScore = "95%" },
            new CarrierPriceQuote { CarrierName = "ONE Line (Ocean Network)", Route = "Newark → Bandar Abbas / Islam Qala", TransitDays = 34, OceanRate = 2100m, HandlingFee = 180m, ReliabilityScore = "93%" }
        });

        _state.RecurringExpenses.AddRange(new[]
        {
            new RecurringExpenseRecord { Id = "rec-001", Title = "Newark Terminal Office Lease", Category = OfficeExpenseCategory.RENT, Amount = 4200m, Frequency = "MONTHLY", Vendor = "Port Newark Realty", NextDueDate = "2026-12-01" },
            new RecurringExpenseRecord { Id = "rec-002", Title = "MarineTraffic AIS + Cloud Hosting", Category = OfficeExpenseCategory.SOFTWARE_SUBSCRIPTIONS, Amount = 640m, Frequency = "MONTHLY", Vendor = "Vercel / MarineTraffic", NextDueDate = "2026-12-10" },
            new RecurringExpenseRecord { Id = "rec-003", Title = "Operations Payroll Cycle", Category = OfficeExpenseCategory.SALARIES_PAYROLL, Amount = 12800m, Frequency = "MONTHLY", Vendor = "Gusto Payroll", NextDueDate = "2026-12-15" }
        });

        _state.QualityChecks.AddRange(new[]
        {
            new QualityCheckRecord { Id = "qc-001", ShipmentId = "shp-001", TrackingNumber = "JCX-2601-88491", VehicleLabel = "2023 Toyota RAV4 XLE AWD", CheckType = "POST_LOADING", Status = "PASSED", Inspector = "M. Alvarez (Newark)", Notes = "Chocked & strapped with 4-point tie downs. 16 arrival photos verified.", PhotoUrls = new List<string> { "arrival_front.jpg", "arrival_vin.jpg", "container_seal.jpg" } },
            new QualityCheckRecord { Id = "qc-002", ShipmentId = "shp-005", TrackingNumber = "JCX-2601-64819", VehicleLabel = "2021 Ford Fusion Titanium", CheckType = "DAMAGE_ASSESSMENT", Status = "REQUIRES_ATTENTION", Inspector = "K. Patel (Newark)", Notes = "Minor right quarter scratch documented at gate intake.", DamageCost = 150m, DamageLiability = "COMPANY_PAYS", PhotoUrls = new List<string> { "quarter_panel.jpg", "odometer.jpg" } }
        });

        _state.TrackingDiagnostics.AddRange(new[]
        {
            new TrackingDiagnosticRecord { ContainerNumber = "MSCU7829104", CarrierApi = "MSC EDI + AIS Satellite", SyncStatus = "OK (200)", LatencyMs = 184, VesselPosition = "36.1408° N, 5.3536° W", LastLocation = "Strait of Gibraltar" },
            new TrackingDiagnosticRecord { ContainerNumber = "CMAU4920193", CarrierApi = "CMA CGM API v2", SyncStatus = "OK (200)", LatencyMs = 242, VesselPosition = "25.0113° N, 55.0612° E", LastLocation = "Jebel Ali Anchorage" }
        });

        _state.AiInteractions.AddRange(new[]
        {
            new AiInteractionRecord { Feature = "ADMIN_COPILOT", Provider = "JACXI Operations Engine", Prompt = "Which invoices are currently overdue?", Response = "INV-2026-1002 (Al-Nour Auto Trading) has $1,850.00 remaining overdue since 2026-11-19." },
            new AiInteractionRecord { Feature = "RATE_PDF_IMPORT", Provider = "Gemini Vision", Prompt = "Extract Mersin 2026 Auction Rates PDF", Response = "Imported 48 state & yard rates cleanly." }
        });

        _state.VoiceCallLogs.AddRange(new[]
        {
            new VoiceCallLogRecord { CallerPhone = "+90 532 994 1283", CustomerName = "Tariq Logistics Ltd", Direction = "INBOUND", Duration = "01:48", Summary = "AI Voice Agent provided live ETA Dec 10 for MSCU7829104." },
            new VoiceCallLogRecord { CallerPhone = "+971 4 883 9102", CustomerName = "Al-Nour Auto Trading", Direction = "OUTBOUND", Duration = "02:35", Summary = "Automated payment reminder sent for INV-2026-1002." }
        });

        _state.CommunicationDispatches.AddRange(new[]
        {
            new CommunicationDispatchRecord { Channel = "WHATSAPP", Recipient = "+90 532 994 1283", Subject = "Container Sailing Update", Body = "Your 2023 Toyota RAV4 is sailing aboard MSC MEDITERRANEAN V (ETA Dec 10)." },
            new CommunicationDispatchRecord { Channel = "EMAIL", Recipient = "accounts@alnourauto.ae", Subject = "Overdue Balance Reminder: INV-2026-1002", Body = "Please settle the remaining $1,850.00 to expedite Jebel Ali Gate 3 release." }
        });

        _state.Notifications.AddRange(new[]
        {
            new AdminNotificationItem { Title = "Customs Hold Alert", Description = "JCX-2601-72940 (Lexus RX 350) awaiting Texas DMV original title at Jebel Ali.", Type = "WARNING" },
            new AdminNotificationItem { Title = "Bank Deposit Unmatched", Description = "Plaid detected $2,000.00 wire from Tariq Logistics Ltd ready to reconcile.", Type = "INFO" },
            new AdminNotificationItem { Title = "Gate Pass Requested", Description = "2023 Hyundai Sonata SEL (REL-330194) queued at Port of Mersin.", Type = "SUCCESS" }
        });
    }

    private class AdminDatabaseState
    {
        public CloudSessionConfig Session { get; set; } = new();
        public List<Shipment> Shipments { get; set; } = new();
        public List<ContainerRecord> Containers { get; set; } = new();
        public List<DispatchRecord> Dispatches { get; set; } = new();
        public List<TransitRecord> Transits { get; set; } = new();
        public List<AdminUser> Users { get; set; } = new();
        public List<ShippingCompany> Companies { get; set; } = new();
        public List<UserInvoiceRecord> Invoices { get; set; } = new();
        public List<LedgerEntryRecord> LedgerEntries { get; set; } = new();
        public List<OfficeExpenseRecord> OfficeExpenses { get; set; } = new();
        public List<ExpenseBudgetRecord> ExpenseBudgets { get; set; } = new();
        public List<RecurringExpenseRecord> RecurringExpenses { get; set; } = new();
        public List<LedgerTransferRecord> LedgerTransfers { get; set; } = new();
        public List<PartnerPortalRecord> PartnerPortals { get; set; } = new();
        public List<GatePassRequest> GatePassRequests { get; set; } = new();
        public List<BankTransactionRecord> BankTransactions { get; set; } = new();
        public List<ExchangeRateRecord> ExchangeRates { get; set; } = new();
        public List<CarrierPriceQuote> CarrierQuotes { get; set; } = new();
        public List<QualityCheckRecord> QualityChecks { get; set; } = new();
        public List<TrackingDiagnosticRecord> TrackingDiagnostics { get; set; } = new();
        public List<AiInteractionRecord> AiInteractions { get; set; } = new();
        public List<VoiceCallLogRecord> VoiceCallLogs { get; set; } = new();
        public List<CommunicationDispatchRecord> CommunicationDispatches { get; set; } = new();
        public List<AdminNotificationItem> Notifications { get; set; } = new();
    }
}
