[Setup]
AppId={{8D4F63B2-6C59-4E31-B19F-9A41D352C8E1}
AppName=JACXI Shipping Enterprise Admin Suite
AppVersion=3.1.0
AppPublisher=JACXI Shipping LLC
AppPublisherURL=https://jacxishipping.com
DefaultDirName={autopf}\JACXI Shipping Admin
DefaultGroupName=JACXI Shipping
UninstallDisplayIcon={app}\JacxiShipping.exe
SetupIconFile=..\JacxiShipping.WindowsApp\Assets\jacxi.ico
OutputDir=..\..\dist
OutputBaseFilename=JacxiShipping-Setup-v3.1.0
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=lowest

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"

[Files]
Source: "..\..\dist\win-x64\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\JACXI Shipping Admin"; Filename: "{app}\JacxiShipping.exe"
Name: "{autodesktop}\JACXI Shipping Admin"; Filename: "{app}\JacxiShipping.exe"; Tasks: desktopicon

[Run]
Filename: "{app}\JacxiShipping.exe"; Description: "{cm:LaunchProgram,JACXI Shipping Enterprise Admin Suite}"; Flags: nowait postinstall skipifsilent
