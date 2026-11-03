$chromePath = "C:\Program Files\Google\Chrome\Application\chrome.exe"
$outDir = "C:\Users\adars\.gemini\antigravity\brain\f5510129-429b-4d3e-beb4-605690022896\screenshots"

if (-not (Test-Path $outDir)) {
    New-Item -ItemType Directory -Force -Path $outDir | Out-Null
}

$viewports = @(
    @{ Name = "viewport-360px-mobile"; Width = 360; Height = 800; Url = "http://localhost:4173/dashboard" },
    @{ Name = "viewport-390px-iphone"; Width = 390; Height = 844; Url = "http://localhost:4173/profile" },
    @{ Name = "viewport-414px-mobile-large"; Width = 414; Height = 896; Url = "http://localhost:4173/feedback" },
    @{ Name = "viewport-768px-tablet"; Width = 768; Height = 1024; Url = "http://localhost:4173/progress" },
    @{ Name = "viewport-1024px-laptop"; Width = 1024; Height = 768; Url = "http://localhost:4173/admin/analytics" },
    @{ Name = "viewport-1280px-desktop"; Width = 1280; Height = 800; Url = "http://localhost:4173/admin/icons" },
    @{ Name = "viewport-1440px-desktop-wide"; Width = 1440; Height = 900; Url = "http://localhost:4173/admin/icons" }
)

foreach ($vp in $viewports) {
    $outFile = Join-Path $outDir "$($vp.Name).png"
    Write-Host "Capturing $($vp.Name) at $($vp.Width)x$($vp.Height) -> $outFile"
    $args = @(
        "--headless=new",
        "--disable-gpu",
        "--hide-scrollbars",
        "--window-size=$($vp.Width),$($vp.Height)",
        "--screenshot=$outFile",
        $vp.Url
    )
    $proc = Start-Process -FilePath $chromePath -ArgumentList $args -PassThru -Wait
    if (Test-Path $outFile) {
        $size = (Get-Item $outFile).Length
        Write-Host "  Success: $size bytes"
    } else {
        Write-Host "  Failed to capture $($vp.Name)"
    }
}
