using System.Collections.ObjectModel;
using JacxiShipping.WindowsApp.Models;
using JacxiShipping.WindowsApp.Services;

namespace JacxiShipping.WindowsApp.ViewModels;

public class CustomersViewModel : ViewModelBase
{
    private readonly IAdminStoreService _store;
    private AdminUser? _selectedUser;
    private string _searchQuery = string.Empty;
    private string _statusMessage = string.Empty;

    private string _newName = string.Empty;
    private string _newEmail = string.Empty;
    private string _newPhone = string.Empty;
    private string _newCity = string.Empty;
    private string _newCountry = string.Empty;
    private string _newRole = "user";

    public ObservableCollection<AdminUser> FilteredUsers { get; } = new();
    public ObservableCollection<string> AvailableRoles { get; } = new() { "user", "admin", "manager", "finance", "operations", "customer_service" };
    public Array CollectionStatuses => Enum.GetValues(typeof(CollectionStatus));

    public AdminUser? SelectedUser
    {
        get => _selectedUser;
        set => SetProperty(ref _selectedUser, value);
    }

    public string SearchQuery
    {
        get => _searchQuery;
        set { if (SetProperty(ref _searchQuery, value)) Refresh(); }
    }

    public string StatusMessage { get => _statusMessage; set => SetProperty(ref _statusMessage, value); }
    public string NewName { get => _newName; set => SetProperty(ref _newName, value); }
    public string NewEmail { get => _newEmail; set => SetProperty(ref _newEmail, value); }
    public string NewPhone { get => _newPhone; set => SetProperty(ref _newPhone, value); }
    public string NewCity { get => _newCity; set => SetProperty(ref _newCity, value); }
    public string NewCountry { get => _newCountry; set => SetProperty(ref _newCountry, value); }
    public string NewRole { get => _newRole; set => SetProperty(ref _newRole, value); }

    public RelayCommand CreateUserCommand { get; }
    public RelayCommand RegenerateCodeCommand { get; }
    public RelayCommand SaveUserChangesCommand { get; }

    public CustomersViewModel(IAdminStoreService store)
    {
        _store = store;

        CreateUserCommand = new RelayCommand(() =>
        {
            if (string.IsNullOrWhiteSpace(NewName) || string.IsNullOrWhiteSpace(NewEmail))
            {
                StatusMessage = "Name and Email are required.";
                return;
            }

            var user = new AdminUser
            {
                Name = NewName.Trim(),
                Email = NewEmail.Trim(),
                Phone = NewPhone.Trim(),
                City = NewCity.Trim(),
                Country = NewCountry.Trim(),
                Role = NewRole
            };
            _store.AddUser(user);
            NewName = string.Empty;
            NewEmail = string.Empty;
            NewPhone = string.Empty;
            Refresh();
            SelectedUser = user;
            StatusMessage = $"Created user {user.Name} (Login Code: {user.LoginCode}).";
        });

        RegenerateCodeCommand = new RelayCommand(() =>
        {
            if (SelectedUser == null) return;
            var code = _store.RegenerateUserLoginCode(SelectedUser.Id);
            var uid = SelectedUser.Id;
            Refresh();
            SelectedUser = FilteredUsers.FirstOrDefault(x => x.Id == uid);
            StatusMessage = $"New 8-char Login Code for {SelectedUser?.Name}: {code}";
        });

        SaveUserChangesCommand = new RelayCommand(() =>
        {
            if (SelectedUser == null) return;
            _store.UpdateUserRole(SelectedUser.Id, SelectedUser.Role);
            _store.UpdateUserCollectionStatus(SelectedUser.Id, SelectedUser.CollectionStatus);
            StatusMessage = $"Saved role ({SelectedUser.Role}) & collection status for {SelectedUser.Name}.";
        });

        Refresh();
        SelectedUser = FilteredUsers.FirstOrDefault();
    }

    public void Refresh()
    {
        var q = (SearchQuery ?? string.Empty).Trim().ToLowerInvariant();
        var users = _store.GetUsers().Where(u =>
            string.IsNullOrEmpty(q) ||
            u.Name.ToLowerInvariant().Contains(q) ||
            u.Email.ToLowerInvariant().Contains(q) ||
            u.LoginCode.ToLowerInvariant().Contains(q) ||
            u.Role.ToLowerInvariant().Contains(q));

        FilteredUsers.Clear();
        foreach (var u in users) FilteredUsers.Add(u);
    }
}

public class PartnerPortalsViewModel : ViewModelBase
{
    private readonly IAdminStoreService _store;
    private string _newName = string.Empty;
    private string _newCode = string.Empty;
    private string _newDomain = string.Empty;
    private string _statusMessage = string.Empty;

    public ObservableCollection<PartnerPortalRecord> Portals { get; } = new();

    public string NewName { get => _newName; set => SetProperty(ref _newName, value); }
    public string NewCode { get => _newCode; set => SetProperty(ref _newCode, value); }
    public string NewDomain { get => _newDomain; set => SetProperty(ref _newDomain, value); }
    public string StatusMessage { get => _statusMessage; set => SetProperty(ref _statusMessage, value); }

    public RelayCommand CreatePortalCommand { get; }
    public RelayCommand TogglePortalCommand { get; }

    public PartnerPortalsViewModel(IAdminStoreService store)
    {
        _store = store;

        CreatePortalCommand = new RelayCommand(() =>
        {
            if (string.IsNullOrWhiteSpace(NewName))
            {
                StatusMessage = "Portal name is required.";
                return;
            }
            var p = new PartnerPortalRecord
            {
                Name = NewName.Trim(),
                Code = string.IsNullOrWhiteSpace(NewCode) ? $"PRT-{Random.Shared.Next(100, 999)}" : NewCode.Trim().ToUpperInvariant(),
                CustomDomain = string.IsNullOrWhiteSpace(NewDomain) ? "partner.jacxishipping.com" : NewDomain.Trim(),
                IsActive = true
            };
            _store.AddPartnerPortal(p);
            NewName = string.Empty;
            NewCode = string.Empty;
            NewDomain = string.Empty;
            Refresh();
            StatusMessage = $"Provisioned Partner Portal: {p.Name}.";
        });

        TogglePortalCommand = new RelayCommand(param =>
        {
            if (param is not PartnerPortalRecord p) return;
            _store.TogglePartnerPortalActive(p.Id);
            Refresh();
            StatusMessage = $"Toggled status for {p.Name}.";
        });

        Refresh();
    }

    public void Refresh()
    {
        Portals.Clear();
        foreach (var p in _store.GetPartnerPortals()) Portals.Add(p);
    }
}

public class AnalyticsViewModel : ViewModelBase
{
    private readonly IAdminStoreService _store;
    private DashboardStats _stats = new();

    public DashboardStats Stats { get => _stats; set => SetProperty(ref _stats, value); }

    public ObservableCollection<ContainerRecord> ContainerPnL { get; } = new();
    public ObservableCollection<ArAgingBucket> ArAging { get; } = new();

    public AnalyticsViewModel(IAdminStoreService store)
    {
        _store = store;
        Refresh();
    }

    public void Refresh()
    {
        Stats = _store.GetDashboardStats();

        ContainerPnL.Clear();
        foreach (var c in _store.GetContainers()) ContainerPnL.Add(c);

        var invoices = _store.GetInvoices();
        ArAging.Clear();
        ArAging.Add(new ArAgingBucket("Current (0-14 Days)", invoices.Where(i => i.Status == UserInvoiceStatus.PENDING).Sum(i => i.AmountRemaining)));
        ArAging.Add(new ArAgingBucket("15-30 Days Past Due", invoices.Where(i => i.Status == UserInvoiceStatus.PARTIALLY_PAID).Sum(i => i.AmountRemaining)));
        ArAging.Add(new ArAgingBucket("31+ Days Overdue", invoices.Where(i => i.Status == UserInvoiceStatus.OVERDUE).Sum(i => i.AmountRemaining)));
        ArAging.Add(new ArAgingBucket("Collected (Settled)", invoices.Where(i => i.Status == UserInvoiceStatus.PAID).Sum(i => i.AmountPaid)));
    }
}

public class ArAgingBucket
{
    public string Label { get; }
    public decimal Amount { get; }
    public string FormattedAmount => $"${Amount:N2}";

    public ArAgingBucket(string label, decimal amount)
    {
        Label = label;
        Amount = amount;
    }
}

public class SettingsViewModel : ViewModelBase
{
    private readonly IAdminStoreService _store;
    private readonly IJacxiCloudClient _cloudClient;
    private string _serverUrl;
    private string _adminEmail;
    private string _adminPassword = string.Empty;
    private string _connectionStatus = "Local Enterprise Mode (Instant Persistence)";
    private string _snapshotPreview = string.Empty;

    public string ServerUrl { get => _serverUrl; set => SetProperty(ref _serverUrl, value); }
    public string AdminEmail { get => _adminEmail; set => SetProperty(ref _adminEmail, value); }
    public string AdminPassword { get => _adminPassword; set => SetProperty(ref _adminPassword, value); }
    public string ConnectionStatus { get => _connectionStatus; set => SetProperty(ref _connectionStatus, value); }
    public string SnapshotPreview { get => _snapshotPreview; set => SetProperty(ref _snapshotPreview, value); }

    public RelayCommand ConnectCloudCommand { get; }
    public RelayCommand ExportBackupCommand { get; }
    public RelayCommand ResetDemoDataCommand { get; }

    public SettingsViewModel(IAdminStoreService store, IJacxiCloudClient cloudClient)
    {
        _store = store;
        _cloudClient = cloudClient;
        _serverUrl = store.Session.ServerUrl;
        _adminEmail = store.Session.CurrentAdmin.Email;

        ConnectCloudCommand = new RelayCommand(async () =>
        {
            ConnectionStatus = "Connecting to JACXI Cloud API...";
            var res = await _cloudClient.SignInAsync(ServerUrl, AdminEmail, AdminPassword);
            if (res.Success)
            {
                _store.Session.ServerUrl = ServerUrl;
                _store.Session.BearerToken = res.Token;
                _store.Session.IsCloudConnected = true;
                _store.Session.LastSyncAt = DateTime.Now.ToString("yyyy-MM-dd HH:mm");
                if (res.User != null) _store.Session.CurrentAdmin = res.User;
                _store.SaveState();
                ConnectionStatus = $"✓ Connected to {ServerUrl} as {res.User?.Name ?? AdminEmail} ({res.User?.Role})";
            }
            else
            {
                ConnectionStatus = $"Cloud unreachable or invalid credentials ({res.Message}). Running in Local Mode.";
            }
        });

        ExportBackupCommand = new RelayCommand(() =>
        {
            SnapshotPreview = _store.ExportSnapshotJson();
            ConnectionStatus = $"Generated JSON backup snapshot ({SnapshotPreview.Length:N0} chars).";
        });

        ResetDemoDataCommand = new RelayCommand(() =>
        {
            _store.ResetToDemoData();
            ConnectionStatus = "Database reset to default JACXI enterprise demo dataset.";
        });
    }
}
