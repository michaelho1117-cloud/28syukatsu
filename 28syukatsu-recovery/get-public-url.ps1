param(
  [string]$FrontendPort = "5173",
  [int]$TimeoutSeconds = 45
)

$ErrorActionPreference = "Continue"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

function Resolve-CloudflaredPath {
  if (Get-Command "cloudflared" -ErrorAction SilentlyContinue) { return "cloudflared" }
  if (Test-Path "C:\Program Files (x86)\cloudflared\cloudflared.exe") { return "C:\Program Files (x86)\cloudflared\cloudflared.exe" }
  if (Test-Path "C:\Program Files\cloudflared\cloudflared.exe") { return "C:\Program Files\cloudflared\cloudflared.exe" }
  throw "cloudflared is not installed."
}

function Ensure-Frontend {
  try {
    $ok = Invoke-WebRequest -Uri "http://localhost:${FrontendPort}" -UseBasicParsing -TimeoutSec 3
    if ($ok.StatusCode -ge 200) { return }
  } catch {}

  Start-Process -WindowStyle Minimized -FilePath "cmd.exe" -ArgumentList "/c", "cd /d `"$root`" && npm run dev -- --host 127.0.0.1 --port $FrontendPort" | Out-Null
  Start-Sleep -Seconds 4
}

$cloudflaredPath = Resolve-CloudflaredPath
Ensure-Frontend

$logPath = Join-Path $root "cloudflared-auto.log"
if (Test-Path $logPath) { Remove-Item $logPath -Force }

# Stop older quick tunnel processes first to avoid confusion.
Get-CimInstance Win32_Process |
  Where-Object { $_.Name -eq "cloudflared.exe" -and $_.CommandLine -like "*trycloudflare*" } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }

$quotedCloudflared = '"' + $cloudflaredPath + '"'
$cmdLine = "$quotedCloudflared tunnel --url http://localhost:${FrontendPort} --no-autoupdate > `"$logPath`" 2>&1"
Start-Process -WindowStyle Minimized -FilePath "cmd.exe" -ArgumentList "/c", $cmdLine | Out-Null

$deadline = (Get-Date).AddSeconds($TimeoutSeconds)
$publicUrl = $null

while ((Get-Date) -lt $deadline) {
  if (Test-Path $logPath) {
    $text = Get-Content -Raw $logPath -ErrorAction SilentlyContinue
    if ($text -match 'https://[-a-zA-Z0-9]+\.trycloudflare\.com') {
      $publicUrl = $Matches[0]
      break
    }
  }
  Start-Sleep -Milliseconds 400
}

if (-not $publicUrl) {
  Write-Error "No public URL found within ${TimeoutSeconds}s. Check $logPath"
  exit 1
}

$urlFile = Join-Path $root "public-url.txt"
Set-Content -Path $urlFile -Value $publicUrl -Encoding UTF8
Set-Clipboard -Value $publicUrl

Write-Host "PUBLIC URL:" -ForegroundColor Green
Write-Host $publicUrl -ForegroundColor Cyan
Write-Host "(Copied to clipboard)"
Write-Host "(Saved to public-url.txt)"

try { Start-Process $publicUrl | Out-Null } catch {}
