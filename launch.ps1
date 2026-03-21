# IGNIS SOVEREIGN CONDUCTOR v3.2
$ProjectRoot = $PSScriptRoot
$LogFile = Join-Path $ProjectRoot "ignis_session.log"
$Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

function Invoke-PoorConnection {
    param([string]$Message, [ConsoleColor]$Color = 'White')
    Write-Host $Message -ForegroundColor $Color
}

Invoke-PoorConnection "[*] Searching for Virtual Environment..." Cyan
$VenvPath = Join-Path $ProjectRoot ".venv"
if (Test-Path "$VenvPath\Scripts\Activate.ps1") {
    Invoke-PoorConnection "[OK] VENV detected." Green
    & "$VenvPath\Scripts\Activate.ps1"
} else {
    Invoke-PoorConnection "[!] No VENV. Using Global Grid." Yellow
}

"--- IGNIS SESSION: $Timestamp ---" | Out-File -FilePath $LogFile -Append
Invoke-PoorConnection "[*] Ledger initialized." Gray
Invoke-PoorConnection "[OK] Conduction stable." Green
