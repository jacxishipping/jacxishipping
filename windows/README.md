# JACXI Shipping - Windows Desktop Operations Suite (C# / WPF / .NET 10)

The official **JACXI Shipping** Windows desktop enterprise application built in **C#** and **WPF** (.NET 10), strictly implementing the **JACXI Design System** (`TEAM_DESIGN_SYSTEM_RULES.txt`).

---

## 🎨 Design System Implementation

The application adheres strictly to JACXI's brand identity and enterprise design tokens:

| Token / Concept | Value | Usage in Application |
|---|---|---|
| **Background** | `#F9FAFB` | Clean, calm soft-gray enterprise app canvas |
| **Panel / Cards** | `#FFFFFF` | Elevated white panels with subtle 1px border (`#E5E7EB`) |
| **Accent Gold** | `#D4AF37` | Primary buttons, active indicators, focus rings, and milestone highlights |
| **Gold Hover / Active** | `#C5A028` / `#997C1F` | Smooth interactive press and hover states |
| **Neutral Text** | `#1C1C1E` & `#5F6368` | High contrast primary typography and secondary metadata |
| **Dark Shell** | `#111827` / `#1F2937` | High-efficiency contrast sidebar navigation |
| **Success** | `#10B981` (tint `#ECFDF5`) | Delivered status, positive trends, operational terminals |
| **Warning** | `#F59E0B` (tint `#FFFBEB`) | Customs holds, high port traffic alerts |
| **Error** | `#EF4444` (tint `#FEF2F2`) | Validation alerts, missing documentation |
| **Info** | `#3B82F6` (tint `#EFF6FF`) | Ocean transit, in-progress container loading |
| **Corner Radius** | `14px` cards, `8px` controls | Modern rounded surfaces per design system rules |
| **Typography** | Segoe UI / Inter sans stack | Micro-labels in uppercase bold, semibold headers |

---

## 🏗️ Architecture & Solution Layout

The solution is partitioned cleanly into a 3-tier enterprise structure:

```
windows/
├── JacxiShipping.slnx               # Visual Studio / .NET solution
├── JacxiShipping.Core/              # Cross-platform .NET 10 core domain library
│   ├── Models/                     # Shipment, Vehicle, Milestone, RateQuote, DashboardStats, DocumentItem
│   ├── Services/                   # IShipmentService, RateCalculatorService, DocumentService
│   └── ViewModels/                 # MainViewModel, DashboardViewModel, ShipmentsViewModel, CalculatorViewModel, TrackingViewModel, DocumentsViewModel
├── JacxiShipping.WindowsApp/        # Native Windows WPF application (.NET 10 Windows Desktop)
│   ├── Themes/                     # JacxiDesignTokens.xaml, JacxiControls.xaml
│   ├── Controls/                   # StatsCard, StatusBadge, MilestoneStepper
│   ├── Converters/                 # StatusConverters, GeneralConverters
│   ├── Views/                      # DashboardView, ShipmentsView, CalculatorView, TrackingView, DocumentsView
│   ├── MainWindow.xaml             # Master window shell with branded sidebar & dynamic content
│   └── App.xaml                    # Application startup & resource dictionary merges
├── JacxiShipping.WindowsApp.Tests/  # Comprehensive xUnit test suite (16 tests, 100% pass)
│   ├── ShipmentServiceTests.cs
│   ├── RateCalculatorServiceTests.cs
│   ├── DocumentServiceTests.cs
│   └── ViewModelTests.cs
└── dist/
    ├── win-x64/                    # Standalone published Windows binary files (JacxiShipping.exe)
    └── JacxiShipping-Windows-x64-v1.0.0.zip
```

---

## 🚀 Key Features

1. **Operations Dashboard**:
   - 4 Live KPI StatCards (Active Shipments, In Ocean Transit, Customs Clearance Holds, Deliveries this month).
   - Real-time Port Terminal status badges (Newark, Houston, Mersin, Jebel Ali, Hairatan).
   - Recent Shipments feed with quick links.

2. **Shipment Inventory & Inspection Drawer**:
   - Live search by Tracking Number, Container ID, VIN, or Customer.
   - Status filter chips (`All`, `In Transit`, `Customs Hold`, `Delivered`, `Booked`).
   - Deep inspection drawer displaying full vehicle specs (Year/Make/Model, VIN, Auction Yard, Lot #, Title Status, Condition Photos count).
   - Interactive 6-step `MilestoneStepper`.
   - Action controls: "Advance Next Milestone", "Mark Delivered", "Generate BOL".

3. **Instant Freight Rate Calculator & Booking Engine**:
   - State-by-state US auction inland towing calculation (Copart & IAAI yards).
   - Destination port ocean freight routing (Mersin, Jebel Ali, Poti, Hairatan, Islam Qala).
   - Vehicle category multiplier (Sedan 1.0x, SUV 1.15x, Truck 1.30x, Machinery 1.75x, Motorcycle 0.6x).
   - Detailed cost breakdown: Towing + Ocean Freight + Terminal Handling (THC) + Customs Title Validation.
   - **"Confirm Booking & Generate Tracking"** button creates an active shipment directly in the database.

4. **Live Cargo & Container Tracking**:
   - Search by tracking number (`JCX-...`) or VIN.
   - Origin-to-Destination maritime transit visual route indicator.
   - Milestone progress tracker showing timestamps and terminal locations.

5. **Maritime Document Center**:
   - Official Bill of Lading (BOL), Terminal Dock Receipts, and Inspection Reports.
   - Built-in monospace inspection viewer formatted to international shipping standards.

---

## 💻 Building and Publishing

### 1. Build and Run Tests
```bash
cd windows
dotnet test JacxiShipping.WindowsApp.Tests/JacxiShipping.WindowsApp.Tests.csproj
```

### 2. Build Solution
```bash
dotnet build JacxiShipping.slnx
```

### 3. Publish Windows Release Executable
```bash
dotnet publish JacxiShipping.WindowsApp/JacxiShipping.WindowsApp.csproj \
  -c Release \
  -r win-x64 \
  -p:PublishSingleFile=true \
  --self-contained false \
  -o dist/win-x64
```

The output executable is ready at `windows/dist/win-x64/JacxiShipping.exe` or zipped in `windows/dist/JacxiShipping-Windows-x64-v1.0.0.zip`.
