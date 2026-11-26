using System.Collections.ObjectModel;
using JacxiShipping.WindowsApp.Models;
using JacxiShipping.WindowsApp.Services;

namespace JacxiShipping.WindowsApp.ViewModels;

public class FinanceViewModel : ViewModelBase
{
    private readonly IAdminStoreService _store;
    private DashboardStats _stats = new();
    private AdminUser? _selectedCustomer;
    private string _entryDescription = "Shipping Balance Payment";
    private string _entryAmount = "500";
    private bool _isCredit = true;
    private string _statusMessage = string.Empty;

    public DashboardStats Stats { get => _stats; set => SetProperty(ref _stats, value); }
    public ObservableCollection<AdminUser> CustomerBalances { get; } = new();
    public ObservableCollection<LedgerEntryRecord> LedgerEntries { get; } = new();

    public AdminUser? SelectedCustomer
    {
        get => _selectedCustomer;
        set => SetProperty(ref _selectedCustomer, value);
    }

    public string EntryDescription { get => _entryDescription; set => SetProperty(ref _entryDescription, value); }
    public string EntryAmount { get => _entryAmount; set => SetProperty(ref _entryAmount, value); }
    public bool IsCredit { get => _isCredit; set => SetProperty(ref _isCredit, value); }
    public string StatusMessage { get => _statusMessage; set => SetProperty(ref _statusMessage, value); }

    public RelayCommand PostLedgerEntryCommand { get; }
    public RelayCommand RefreshCommand { get; }

    public FinanceViewModel(IAdminStoreService store)
    {
        _store = store;

        RefreshCommand = new RelayCommand(Refresh);
        PostLedgerEntryCommand = new RelayCommand(() =>
        {
            if (SelectedCustomer == null) return;
            if (!decimal.TryParse(EntryAmount, out var amount) || amount <= 0)
            {
                StatusMessage = "Enter a valid positive amount.";
                return;
            }

            var type = IsCredit ? LedgerEntryType.CREDIT : LedgerEntryType.DEBIT;
            _store.AddLedgerEntry(SelectedCustomer.Id, EntryDescription, type, amount, "SHIPPING_PAYMENT");
            var uid = SelectedCustomer.Id;
            Refresh();
            SelectedCustomer = CustomerBalances.FirstOrDefault(u => u.Id == uid);
            StatusMessage = $"Posted {type} of ${amount:N2} to {SelectedCustomer?.Name}.";
        });

        Refresh();
        SelectedCustomer = CustomerBalances.FirstOrDefault();
    }

    public void Refresh()
    {
        Stats = _store.GetDashboardStats();
        CustomerBalances.Clear();
        foreach (var u in _store.GetUsers().Where(x => x.Role == "user")) CustomerBalances.Add(u);

        LedgerEntries.Clear();
        foreach (var e in _store.GetLedgerEntries()) LedgerEntries.Add(e);
    }
}

public class InvoicesViewModel : ViewModelBase
{
    private readonly IAdminStoreService _store;
    private UserInvoiceRecord? _selectedInvoice;
    private string _paymentAmount = string.Empty;
    private string _paymentMethod = "WIRE_TRANSFER";
    private string _statusFilter = "All";
    private string _statusMessage = string.Empty;

    public ObservableCollection<UserInvoiceRecord> Invoices { get; } = new();
    public ObservableCollection<string> PaymentMethods { get; } = new() { "WIRE_TRANSFER", "BANK_TRANSFER", "CASH", "CREDIT_CARD", "ZELLE" };

    public UserInvoiceRecord? SelectedInvoice
    {
        get => _selectedInvoice;
        set
        {
            if (SetProperty(ref _selectedInvoice, value) && value != null)
            {
                PaymentAmount = value.AmountRemaining.ToString("0.00");
            }
        }
    }

    public string PaymentAmount { get => _paymentAmount; set => SetProperty(ref _paymentAmount, value); }
    public string PaymentMethod { get => _paymentMethod; set => SetProperty(ref _paymentMethod, value); }
    public string StatusFilter { get => _statusFilter; set { if (SetProperty(ref _statusFilter, value)) Refresh(); } }
    public string StatusMessage { get => _statusMessage; set => SetProperty(ref _statusMessage, value); }

    public RelayCommand FilterCommand { get; }
    public RelayCommand RecordPaymentCommand { get; }
    public RelayCommand MarkOverdueCommand { get; }

    public InvoicesViewModel(IAdminStoreService store)
    {
        _store = store;

        FilterCommand = new RelayCommand(param =>
        {
            if (param is string f) StatusFilter = f;
        });

        RecordPaymentCommand = new RelayCommand(() =>
        {
            if (SelectedInvoice == null) return;
            if (!decimal.TryParse(PaymentAmount, out var amt) || amt <= 0)
            {
                StatusMessage = "Enter a valid payment amount.";
                return;
            }
            var invId = SelectedInvoice.Id;
            _store.RecordInvoicePayment(invId, amt, PaymentMethod);
            Refresh();
            SelectedInvoice = Invoices.FirstOrDefault(i => i.Id == invId) ?? Invoices.FirstOrDefault();
            StatusMessage = $"Recorded ${amt:N2} payment on {SelectedInvoice?.InvoiceNumber} & updated Customer Ledger.";
        });

        MarkOverdueCommand = new RelayCommand(() =>
        {
            if (SelectedInvoice == null) return;
            var invId = SelectedInvoice.Id;
            _store.MarkInvoiceOverdue(invId);
            Refresh();
            SelectedInvoice = Invoices.FirstOrDefault(i => i.Id == invId);
            StatusMessage = $"{SelectedInvoice?.InvoiceNumber} flagged as OVERDUE.";
        });

        Refresh();
        SelectedInvoice = Invoices.FirstOrDefault();
    }

    public void Refresh()
    {
        var items = _store.GetInvoices().AsEnumerable();
        if (StatusFilter != "All" && Enum.TryParse<UserInvoiceStatus>(StatusFilter, out var st))
        {
            items = items.Where(i => i.Status == st);
        }

        Invoices.Clear();
        foreach (var inv in items) Invoices.Add(inv);
    }
}

public class OfficeExpensesViewModel : ViewModelBase
{
    private readonly IAdminStoreService _store;
    private string _newTitle = string.Empty;
    private OfficeExpenseCategory _newCategory = OfficeExpenseCategory.OFFICE_SUPPLIES;
    private string _newAmount = "250";
    private string _newVendor = string.Empty;
    private string _statusMessage = string.Empty;

    public ObservableCollection<OfficeExpenseRecord> Expenses { get; } = new();
    public ObservableCollection<ExpenseBudgetRecord> Budgets { get; } = new();
    public Array Categories => Enum.GetValues(typeof(OfficeExpenseCategory));

    public string NewTitle { get => _newTitle; set => SetProperty(ref _newTitle, value); }
    public OfficeExpenseCategory NewCategory { get => _newCategory; set => SetProperty(ref _newCategory, value); }
    public string NewAmount { get => _newAmount; set => SetProperty(ref _newAmount, value); }
    public string NewVendor { get => _newVendor; set => SetProperty(ref _newVendor, value); }
    public string StatusMessage { get => _statusMessage; set => SetProperty(ref _statusMessage, value); }

    public decimal TotalMonthlySpend => Expenses.Sum(e => e.Amount);
    public string TotalMonthlySpendFormatted => $"${TotalMonthlySpend:N2}";

    public RelayCommand AddExpenseCommand { get; }

    public OfficeExpensesViewModel(IAdminStoreService store)
    {
        _store = store;

        AddExpenseCommand = new RelayCommand(() =>
        {
            if (string.IsNullOrWhiteSpace(NewTitle) || !decimal.TryParse(NewAmount, out var amt) || amt <= 0)
            {
                StatusMessage = "Please enter expense title and positive amount.";
                return;
            }

            _store.AddOfficeExpense(new OfficeExpenseRecord
            {
                Title = NewTitle.Trim(),
                Category = NewCategory,
                Amount = amt,
                Vendor = string.IsNullOrWhiteSpace(NewVendor) ? "General Vendor" : NewVendor.Trim(),
                ReferenceNumber = $"EXP-{Random.Shared.Next(1000, 9999)}"
            });

            NewTitle = string.Empty;
            NewVendor = string.Empty;
            Refresh();
            StatusMessage = $"Recorded office expense of ${amt:N2}.";
        });

        Refresh();
    }

    public void Refresh()
    {
        Expenses.Clear();
        foreach (var e in _store.GetOfficeExpenses()) Expenses.Add(e);

        Budgets.Clear();
        foreach (var b in _store.GetExpenseBudgets()) Budgets.Add(b);

        OnPropertyChanged(nameof(TotalMonthlySpend));
        OnPropertyChanged(nameof(TotalMonthlySpendFormatted));
    }
}

public class CompanyLedgersViewModel : ViewModelBase
{
    private readonly IAdminStoreService _store;
    private string _sourceParty = "JACXI Treasury";
    private string _destParty = "MSC Mediterranean Shipping";
    private string _transferAmount = "1000";
    private string _reference = "Carrier Freight Settlement";
    private string _statusMessage = string.Empty;

    public ObservableCollection<ShippingCompany> Companies { get; } = new();
    public ObservableCollection<LedgerTransferRecord> Transfers { get; } = new();

    public string SourceParty { get => _sourceParty; set => SetProperty(ref _sourceParty, value); }
    public string DestParty { get => _destParty; set => SetProperty(ref _destParty, value); }
    public string TransferAmount { get => _transferAmount; set => SetProperty(ref _transferAmount, value); }
    public string Reference { get => _reference; set => SetProperty(ref _reference, value); }
    public string StatusMessage { get => _statusMessage; set => SetProperty(ref _statusMessage, value); }

    public RelayCommand CreateTransferCommand { get; }

    public CompanyLedgersViewModel(IAdminStoreService store)
    {
        _store = store;

        CreateTransferCommand = new RelayCommand(() =>
        {
            if (!decimal.TryParse(TransferAmount, out var amt) || amt <= 0)
            {
                StatusMessage = "Enter a valid positive transfer amount.";
                return;
            }
            _store.AddLedgerTransfer(LedgerTransferType.COMPANY_TO_COMPANY, SourceParty, DestParty, amt, Reference);
            Refresh();
            StatusMessage = $"Transferred ${amt:N2} from {SourceParty} to {DestParty}.";
        });

        Refresh();
    }

    public void Refresh()
    {
        Companies.Clear();
        foreach (var c in _store.GetCompanies()) Companies.Add(c);

        Transfers.Clear();
        foreach (var t in _store.GetLedgerTransfers()) Transfers.Add(t);
    }
}
