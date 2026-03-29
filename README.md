# Odoo-x-VitPune-Hackathon26
Virtual Round 29th March


To run on Terminal Paste this:
$ports=5000,5173,5174; foreach($p in $ports){Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object {$proc=Get-Process -Id $_ -ErrorAction SilentlyContinue; if($proc -and $proc.ProcessName -eq 'node'){Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue; Write-Host "Killed node PID=$_ on port $p"}}}; npm run dev
