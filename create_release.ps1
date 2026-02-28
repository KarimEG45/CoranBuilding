# ============================================================
# create_release.ps1 — Create GitHub Release v1.0.0
# Usage: .\create_release.ps1 -Token "ghp_yourtoken"
# ============================================================
param(
    [Parameter(Mandatory=$true)]
    [string]$Token
)

$ErrorActionPreference = "Stop"

$Repo    = "keg-trading/quran-building-releases"
$Tag     = "v1.0.0"
$Headers = @{
    "Authorization" = "Bearer $Token"
    "Accept"        = "application/vnd.github+json"
    "X-GitHub-Api-Version" = "2022-11-28"
}

# 1. Create the release
Write-Host "Creating release $Tag on $Repo..."
$Body = @{
    tag_name   = $Tag
    name       = "v1.0.0 — Initial release"
    body       = "Initial release with auto-updater support."
    draft      = $false
    prerelease = $false
} | ConvertTo-Json

$Release = Invoke-RestMethod `
    -Uri "https://api.github.com/repos/$Repo/releases" `
    -Method POST `
    -Headers $Headers `
    -ContentType "application/json" `
    -Body $Body

$UploadUrl = $Release.upload_url -replace '\{.*\}', ''
Write-Host "Release created: $($Release.html_url)"

# 2. Upload version.json
$VersionFile = "$PSScriptRoot\version.json"
Write-Host "Uploading version.json..."
$VersionBytes = [System.IO.File]::ReadAllBytes($VersionFile)
Invoke-RestMethod `
    -Uri "${UploadUrl}?name=version.json" `
    -Method POST `
    -Headers $Headers `
    -ContentType "application/octet-stream" `
    -Body $VersionBytes | Out-Null

Write-Host ""
Write-Host "SUCCESS: Release $Tag published." -ForegroundColor Green
Write-Host "URL: $($Release.html_url)"
Write-Host ""
Write-Host "Verify the updater sees 'up to date' in backend_debug.log after launching the exe."
