param(
  [string]$FrontendPort = "5173",
  [string]$CorePort = "8789",
  [string]$EmailPort = "8787",
  [switch]$FrontendOnly
)

$ErrorActionPreference = "Continue"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

function Write-Step($msg) {
  Write-Host "[STEP] $msg" -ForegroundColor Cyan
}

function Ensure-Command($cmd) {
  if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
    throw "Missing command: $cmd. Please install it first."
  }
}

function Start-JobProcess($name, $command) {
  Start-Process -WindowStyle Minimized -FilePath "cmd.exe" -ArgumentList "/c", $command | Out-Null
  Write-Host "  - started: $name" -ForegroundColor Green
}

Write-Step "Checking dependencies"
Ensure-Command "npm"
$cloudflaredPath = ""
if (Get-Command "cloudflared" -ErrorAction SilentlyContinue) {
  $cloudflaredPath = "cloudflared"
} elseif (Test-Path "C:\Program Files (x86)\cloudflared\cloudflared.exe") {
  $cloudflaredPath = "C:\Program Files (x86)\cloudflared\cloudflared.exe"
} elseif (Test-Path "C:\Program Files\cloudflared\cloudflared.exe") {
  $cloudflaredPath = "C:\Program Files\cloudflared\cloudflared.exe"
} else {
  throw "Missing command: cloudflared. Please install it first."
}

Write-Step "Starting local app services"
if (-not $FrontendOnly) {
  Start-JobProcess "Core API :$CorePort" "cd /d `"$root`" && npm run api:core"
  Start-Sleep -Seconds 1
  Start-JobProcess "Email API :$EmailPort" "cd /d `"$root`" && npm run api"
  Start-Sleep -Seconds 1
}
Start-JobProcess "Frontend :$FrontendPort" "cd /d `"$root`" && npm run dev -- --host 127.0.0.1 --port $FrontendPort"
Start-Sleep -Seconds 3

$targetUrl = "http://localhost:$FrontendPort"
$logPath = Join-Path $root "cloudflared.log"
if (Test-Path $logPath) { Remove-Item $logPath -Force }

Write-Step "Starting Cloudflare Tunnel (trycloudflare)"
Write-Host "  target: $targetUrl" -ForegroundColor Yellow
Write-Host "  waiting for public URL..." -ForegroundColor Yellow
Write-Host ""

$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = $cloudflaredPath
$psi.Arguments = "tunnel --url $targetUrl --no-autoupdate"
$psi.RedirectStandardOutput = $true
$psi.RedirectStandardError = $true
$psi.UseShellExecute = $false
$psi.CreateNoWindow = $true

$proc = New-Object System.Diagnostics.Process
$proc.StartInfo = $psi
[void]$proc.Start()

$publicUrlShown = $false
while (-not $proc.HasExited) {
  $line = $proc.StandardOutput.ReadLine()
  if ($null -ne $line) {
    Add-Content -Path $logPath -Value $line
    if (-not $publicUrlShown -and $line -match 'https://[-a-zA-Z0-9]+\.trycloudflare\.com') {
      $publicUrlShown = $true
      Write-Host "✅ Public URL: $($Matches[0])" -ForegroundColor Green
      Write-Host "   (Keep this window open. Closing it will close the tunnel.)" -ForegroundColor DarkGray
    } elseif ($line -match 'ERR|error|failed') {
      Write-Host $line -ForegroundColor Red
    } else {
      Write-Host $line -ForegroundColor DarkGray
    }
  }

  while (-not $proc.StandardError.EndOfStream) {
    $errLine = $proc.StandardError.ReadLine()
    if ($null -ne $errLine) {
      Add-Content -Path $logPath -Value $errLine
      if (-not $publicUrlShown -and $errLine -match 'https://[-a-zA-Z0-9]+\.trycloudflare\.com') {
        $publicUrlShown = $true
        Write-Host "✅ Public URL: $($Matches[0])" -ForegroundColor Green
        Write-Host "   (Keep this window open. Closing it will close the tunnel.)" -ForegroundColor DarkGray
      } elseif ($errLine -match 'ERR|error|failed') {
        Write-Host $errLine -ForegroundColor Red
      } else {
        Write-Host $errLine -ForegroundColor DarkGray
      }
    }
  }
}

if (-not $publicUrlShown) {
  Write-Host "⚠️ Tunnel exited before URL was captured. Check cloudflared.log." -ForegroundColor Yellow
}
