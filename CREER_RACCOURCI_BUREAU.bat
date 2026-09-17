@echo off
chcp 65001 >nul
title Nova — Création du Raccourci Bureau Windows
color 0b

echo ==================================================================
echo       🚀 NOVA — CRÉATION DU RACCOURCI SUR LE BUREAU WINDOWS
echo ==================================================================
echo.
echo Recherche des composants Nova dans ce dossier...

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ws = New-Object -ComObject WScript.Shell; " ^
  "$desktop = [Environment]::GetFolderPath('Desktop'); " ^
  "$root = '%~dp0'; " ^
  "$target = if (Test-Path (Join-Path $root 'Nova-StarCitizen.exe')) { Join-Path $root 'Nova-StarCitizen.exe' } else { Join-Path $root 'DEMARRER_NOVA.bat' }; " ^
  "$scPath = Join-Path $desktop 'Nova - Star Citizen.lnk'; " ^
  "$sc = $ws.CreateShortcut($scPath); " ^
  "$sc.TargetPath = $target; " ^
  "$sc.WorkingDirectory = $root; " ^
  "$sc.Description = 'Nova — Compagnon Star Citizen'; " ^
  "if (Test-Path (Join-Path $root 'public\favicon.ico')) { $sc.IconLocation = ((Join-Path $root 'public\favicon.ico') + ',0') } " ^
  "elseif (Test-Path (Join-Path $root 'out\favicon.ico')) { $sc.IconLocation = ((Join-Path $root 'out\favicon.ico') + ',0') } " ^
  "elseif (Test-Path (Join-Path $root 'favicon.ico')) { $sc.IconLocation = ((Join-Path $root 'favicon.ico') + ',0') }; " ^
  "$sc.Save(); " ^
  "if (Test-Path $scPath) { " ^
  "  Write-Host '  ✓ SUCCÈS : Raccourci Nova créé sur votre Bureau :' -ForegroundColor Green; " ^
  "  Write-Host ('    ' + $scPath) -ForegroundColor Cyan; " ^
  "} else { " ^
  "  Write-Host '  [ERREUR] Impossible de créer le raccourci.' -ForegroundColor Red; " ^
  "}"

echo.
echo ==================================================================
echo   Vous pouvez désormais lancer Nova directement depuis votre Bureau !
echo ==================================================================
echo.
pause
