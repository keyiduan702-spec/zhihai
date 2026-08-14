$ErrorActionPreference = "Stop"

$projectPath = Split-Path -Parent $PSScriptRoot
$stdoutPath = Join-Path $projectPath ".local-server-out.txt"
$stderrPath = Join-Path $projectPath ".local-server-err.txt"

$listener = Get-NetTCPConnection -LocalPort 8787 -State Listen -ErrorAction SilentlyContinue
if ($listener) {
    exit 0
}

Start-Process `
    -FilePath "D:\Users\Lenovo\tools\node-v22.22.1-win-x64\npx.cmd" `
    -ArgumentList "vinext", "dev", "--port", "8787" `
    -WorkingDirectory $projectPath `
    -RedirectStandardOutput $stdoutPath `
    -RedirectStandardError $stderrPath `
    -WindowStyle Hidden
