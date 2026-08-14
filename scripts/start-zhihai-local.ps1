$ErrorActionPreference = "Stop"

$projectPath = "D:\Users\Lenovo\Documents\ChatGPT\知海"
$logPath = Join-Path $projectPath ".wrangler\logs\autostart.log"
$stdoutPath = Join-Path $projectPath ".local-server-out.txt"
$stderrPath = Join-Path $projectPath ".local-server-err.txt"

$listener = Get-NetTCPConnection -LocalPort 8787 -State Listen -ErrorAction SilentlyContinue
if ($listener) {
    exit 0
}

$env:WRANGLER_LOG_PATH = $logPath
Start-Process `
    -FilePath "npm.cmd" `
    -ArgumentList "exec", "--", "wrangler", "dev", "--config", "wrangler.local.jsonc", "--local", "--port", "8787" `
    -WorkingDirectory $projectPath `
    -RedirectStandardOutput $stdoutPath `
    -RedirectStandardError $stderrPath `
    -WindowStyle Hidden
