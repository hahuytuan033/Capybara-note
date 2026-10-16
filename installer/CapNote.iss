#define MyAppName "CapNote"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "Tundayne"
#define PublishDir "..\artifacts\publish\win-x64"

[Setup]
AppId={{D85FA462-44AC-4F1E-9651-41CB6148C7B6}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={autopf}\CapNote
DefaultGroupName=CapNote
OutputDir=..\artifacts\installer
OutputBaseFilename=CapNote-WPF-Setup-x64
Compression=lzma2/ultra64
SolidCompression=yes
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
SetupIconFile=..\src\assets\images\favicon.ico
UninstallDisplayIcon={app}\CapNote.exe

[Files]
Source: "{#PublishDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{autoprograms}\CapNote"; Filename: "{app}\CapNote.exe"
Name: "{autodesktop}\CapNote"; Filename: "{app}\CapNote.exe"; Tasks: desktopicon

[Tasks]
Name: "desktopicon"; Description: "Tạo biểu tượng ngoài màn hình"; GroupDescription: "Biểu tượng bổ sung:"

[Run]
Filename: "{app}\CapNote.exe"; Description: "Mở CapNote"; Flags: nowait postinstall skipifsilent
