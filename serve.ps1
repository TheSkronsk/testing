# A loopback-only static file server using Windows' built-in .NET runtime.
# No administrator rights, Python, Godot, account, or network service required.
param([switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
$webRoot = [System.IO.Path]::GetFullPath($PSScriptRoot)
if (-not (Test-Path -LiteralPath (Join-Path $webRoot 'index.html'))) {
    throw 'Keep this launcher beside the exported index.html file.'
}
$listener = $null
foreach ($port in 8067..8080) {
    try {
        $candidate = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $port)
        $candidate.Start()
        $listener = $candidate
        break
    } catch { continue }
}
if ($null -eq $listener) { throw 'No free local port between 8067 and 8080.' }
$url = "http://127.0.0.1:$port/"
Write-Host "Forest Clan is ready at $url" -ForegroundColor Green
Write-Host 'Keep this window open while playing. Close it to stop the local server.'
if (-not $NoBrowser) { Start-Process $url }
$mime = @{ '.html'='text/html; charset=utf-8'; '.js'='application/javascript'; '.wasm'='application/wasm'; '.pck'='application/octet-stream'; '.png'='image/png'; '.svg'='image/svg+xml'; '.json'='application/json' }
try {
    while ($true) {
        $client = $listener.AcceptTcpClient()
        try {
            $client.ReceiveTimeout = 5000
            $client.SendTimeout = 30000
            $stream = $client.GetStream()
            $reader = [System.IO.StreamReader]::new($stream, [System.Text.Encoding]::ASCII, $false, 4096, $true)
            $line = $reader.ReadLine()
            if ([string]::IsNullOrEmpty($line)) { continue }
            $parts = $line.Split(' ')
            while (-not [string]::IsNullOrEmpty($reader.ReadLine())) {}
            $status = '200 OK'
            $contentType = 'text/plain; charset=utf-8'
            $body = [byte[]]@()
            if ($parts.Length -lt 2 -or $parts[0] -notin @('GET','HEAD')) {
                $status = '405 Method Not Allowed'
            } else {
                $relative = [Uri]::UnescapeDataString(($parts[1].Split('?')[0])).TrimStart('/')
                if ($relative -eq '') { $relative='index.html' }
                $path = [System.IO.Path]::GetFullPath((Join-Path $webRoot $relative))
                $withinRoot = $path.StartsWith($webRoot + [System.IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)
                if (-not $withinRoot -or -not [System.IO.File]::Exists($path)) {
                    $status = '404 Not Found'
                } else {
                    $extension = [System.IO.Path]::GetExtension($path)
                    if ($mime.ContainsKey($extension)) { $contentType=$mime[$extension] }
                    $body = [System.IO.File]::ReadAllBytes($path)
                }
            }
            $headers = "HTTP/1.1 $status`r`nContent-Type: $contentType`r`nContent-Length: $($body.Length)`r`nCache-Control: no-store`r`nConnection: close`r`n`r`n"
            $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($headers)
            $stream.Write($headerBytes,0,$headerBytes.Length)
            if ($parts[0] -ne 'HEAD' -and $body.Length -gt 0) { $stream.Write($body,0,$body.Length) }
            $stream.Flush()
        } catch {
            Write-Host 'A browser request ended early; the server is still running.'
        } finally {
            $client.Dispose()
        }
    }
} finally { $listener.Stop() }
