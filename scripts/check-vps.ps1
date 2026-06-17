# Быстрая проверка VPS перед deploy:sync (Windows PowerShell 5.1+)
# Usage: .\scripts\check-vps.ps1

$ip = if ($env:TRASSA_SSH_HOST) { $env:TRASSA_SSH_HOST } else { "194.226.166.10" }
$domains = @("trassa.duckdns.org", "trassa-api.duckdns.org")

function Test-Url {
  param([string]$Url)
  try {
    if (Get-Command curl.exe -ErrorAction SilentlyContinue) {
      $raw = & curl.exe -sk --max-time 15 -w "`nHTTP_CODE:%{http_code}" $Url 2>&1
      $lines = @($raw | ForEach-Object { "$_" })
      $codeLine = $lines | Where-Object { $_ -match "HTTP_CODE:" } | Select-Object -Last 1
      $code = if ($codeLine -match "HTTP_CODE:(\d+)") { $Matches[1] } else { "timeout" }
      $body = ($lines | Where-Object { $_ -notmatch "HTTP_CODE:" }) -join " "
      return @{ Ok = ($code -eq "200"); Code = $code; Body = if ($body) { $body.Trim() } else { "no response" } }
    }
    $r = Invoke-WebRequest -Uri $Url -TimeoutSec 15 -UseBasicParsing
    return @{ Ok = ($r.StatusCode -eq 200); Code = $r.StatusCode; Body = $r.Content }
  } catch {
    return @{ Ok = $false; Code = "err"; Body = $_.Exception.Message }
  }
}

Write-Host "=== DNS ===" -ForegroundColor Cyan
foreach ($d in $domains) {
  try {
    $a = (Resolve-DnsName $d -Type A -ErrorAction Stop | Select-Object -First 1).IPAddress
    $match = if ($a -eq $ip) { "OK" } else { "MISMATCH (expected $ip)" }
    Write-Host "$d -> $a  [$match]"
  } catch {
    Write-Host "$d -> DNS error: $($_.Exception.Message)" -ForegroundColor Red
  }
}

Write-Host "`n=== HTTPS /api/health ===" -ForegroundColor Cyan
foreach ($d in $domains) {
  $url = "https://$d/api/health"
  $t = Test-Url $url
  if ($t.Ok) {
    Write-Host "OK   $url" -ForegroundColor Green
    Write-Host "     $($t.Body)"
  } else {
    Write-Host "FAIL $url  (code $($t.Code))" -ForegroundColor Red
    Write-Host "     $($t.Body)"
  }
}

Write-Host "`n=== TCP ports ===" -ForegroundColor Cyan
foreach ($port in @(22, 80, 443)) {
  $tcp = Test-NetConnection -ComputerName $ip -Port $port -WarningAction SilentlyContinue
  if ($tcp.TcpTestSucceeded) {
    Write-Host "OPEN   $ip`:$port" -ForegroundColor Green
  } else {
    Write-Host "CLOSED $ip`:$port (timeout/filtered)" -ForegroundColor Red
  }
}

Write-Host "`n=== SSH banner (OpenSSH) ===" -ForegroundColor Cyan
if (Get-Command ssh.exe -ErrorAction SilentlyContinue) {
  $sshOut = & ssh.exe -o BatchMode=yes -o ConnectTimeout=15 -o StrictHostKeyChecking=no "root@$ip" "echo ok" 2>&1
  $sshOut | ForEach-Object { Write-Host $_ }
} else {
  Write-Host "ssh.exe not found"
}

Write-Host "`n=== HTTP by IP (no TLS) ===" -ForegroundColor Cyan
$http = Test-Url "http://$ip/api/health"
if ($http.Ok) {
  Write-Host "OK   http://${ip}/api/health" -ForegroundColor Green
  Write-Host "     $($http.Body)"
} else {
  Write-Host "FAIL http://${ip}/api/health  (code $($http.Code))" -ForegroundColor Red
  Write-Host "     $($http.Body)"
}

Write-Host "`n--- Summary ---" -ForegroundColor Yellow
Write-Host "Ports OPEN but no HTTP/SSH answer = VM hung (Active in panel, services dead)."
Write-Host "Fix: REG.cloud -> trassa-app -> Reboot (hard). Then web console:"
Write-Host "  systemctl restart ssh nginx trassa-api"
Write-Host "If still broken: recreate VM or open ticket to REG.cloud (Free Tier overload)."
Write-Host "When OK: npm run deploy:api && npm run deploy:web"
