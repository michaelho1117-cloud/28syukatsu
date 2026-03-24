$edgePath = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
$shotDir = 'C:\Users\ADMIN\Desktop\28syukatsu-cn-shots'

New-Item -ItemType Directory -Force -Path $shotDir | Out-Null

Get-Process msedge -ErrorAction SilentlyContinue |
  Where-Object { $_.MainWindowTitle -eq '' } |
  Stop-Process -Force -ErrorAction SilentlyContinue

Start-Process -FilePath $edgePath -ArgumentList @(
  '--headless=new',
  '--disable-gpu',
  '--remote-debugging-port=9222',
  '--window-size=1600,1100',
  'about:blank'
) | Out-Null

Start-Sleep -Seconds 2

$target = Invoke-RestMethod -Uri 'http://127.0.0.1:9222/json/new?http://127.0.0.1:5173/dashboard' -Method Put
$wsUrl = $target.webSocketDebuggerUrl

$script:msgId = 0
$ws = [System.Net.WebSockets.ClientWebSocket]::new()
$cts = [System.Threading.CancellationTokenSource]::new()
$ws.ConnectAsync([Uri]$wsUrl, $cts.Token).GetAwaiter().GetResult()

function Send-Cdp($method, $params) {
  $script:msgId++
  $payload = @{ id = $script:msgId; method = $method; params = $params } | ConvertTo-Json -Compress -Depth 10
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($payload)
  $segment = [ArraySegment[byte]]::new($bytes)
  $ws.SendAsync($segment, [System.Net.WebSockets.WebSocketMessageType]::Text, $true, $cts.Token).GetAwaiter().GetResult()

  $buffer = New-Object byte[] 262144
  while ($true) {
    $incoming = [ArraySegment[byte]]::new($buffer)
    $result = $ws.ReceiveAsync($incoming, $cts.Token).GetAwaiter().GetResult()
    if ($result.Count -le 0) { continue }
    $json = [System.Text.Encoding]::UTF8.GetString($buffer, 0, $result.Count)
    $obj = $json | ConvertFrom-Json -Depth 20
    if ($obj.id -eq $script:msgId) { return $obj }
  }
}

function Eval-Cdp($expression) {
  Send-Cdp 'Runtime.evaluate' @{
    expression = $expression
    awaitPromise = $true
    returnByValue = $true
  }
}

Send-Cdp 'Page.enable' @{} | Out-Null
Send-Cdp 'Runtime.enable' @{} | Out-Null

function Go-ToPage($path) {
  Send-Cdp 'Page.navigate' @{ url = "http://127.0.0.1:5173$path" } | Out-Null
  Start-Sleep -Seconds 2

  Eval-Cdp @"
(async () => {
  const btn = document.querySelector('button[title="Change Language"]');
  if (btn) {
    btn.click();
    await new Promise((r) => setTimeout(r, 150));
    btn.click();
  }
  await new Promise((r) => setTimeout(r, 700));
  return document.documentElement.lang;
})();
"@ | Out-Null

  Start-Sleep -Milliseconds 800
}

function Capture-Content($fileName) {
  $clipRes = Eval-Cdp @"
(() => {
  const node = document.querySelector('.layout-main');
  const rect = node.getBoundingClientRect();
  return {
    x: Math.round(rect.x + 24),
    y: Math.round(rect.y + 24),
    width: Math.round(rect.width - 48),
    height: Math.min(Math.round(rect.height - 48), 980),
    scale: 1
  };
})();
"@

  $clip = $clipRes.result.value
  $shot = Send-Cdp 'Page.captureScreenshot' @{
    format = 'png'
    clip = $clip
    fromSurface = $true
  }

  [IO.File]::WriteAllBytes(
    (Join-Path $shotDir $fileName),
    [Convert]::FromBase64String($shot.result.data)
  )
}

Go-ToPage '/dashboard'
Capture-Content '01-dashboard-cn.png'

Go-ToPage '/companies'
Capture-Content '02-companies-cn.png'

Go-ToPage '/emails'
Capture-Content '03-mail-cn.png'

$ws.Dispose()

Get-ChildItem $shotDir | Select-Object FullName, Length
