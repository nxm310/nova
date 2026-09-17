@echo off
chcp 65001 >nul
title Nova — Création du Raccourci Bureau Windows
color 0b

echo ==================================================================
echo       🚀 NOVA — CRÉATION DU RACCOURCI SUR LE BUREAU WINDOWS
echo ==================================================================
echo.
echo Configuration du raccourci et du protocole 1-clic...

:: 1. Enregistrement du protocole nova://
reg add "HKCU\Software\Classes\nova" /ve /d "URL:Nova Star Citizen Protocol" /f >nul 2>&1
reg add "HKCU\Software\Classes\nova" /v "URL Protocol" /d "" /f >nul 2>&1
reg add "HKCU\Software\Classes\nova\shell\open\command" /ve /d "\"cmd.exe\" /c \"\"%~dp0DEMARRER_NOVA.bat\"\"" /f >nul 2>&1

:: 2. Création du raccourci Bureau
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ws = New-Object -ComObject WScript.Shell; " ^
  "$desktop = [Environment]::GetFolderPath('Desktop'); " ^
  "$root = '%~dp0'; " ^
  "$target = if (Test-Path (Join-Path $root 'Nova-StarCitizen.exe')) { Join-Path $root 'Nova-StarCitizen.exe' } else { Join-Path $root 'DEMARRER_NOVA.bat' }; " ^
  "$scPath = Join-Path $desktop 'Nova - Star Citizen.lnk'; " ^
  "$sc = $ws.CreateShortcut($scPath); " ^
  "$sc.TargetPath = $target; " ^
  "$sc.WorkingDirectory = $root; " ^
  "$sc.Description = 'Nova — Compagnon Star Citizen (Pont Clavier & Ordinateur de Bord)'; " ^
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
echo   ✓ Double-cliquez sur l'icône 'Nova - Star Citizen' sur votre Bureau
echo     pour lancer le pont Python ET l'application en même temps !
echo ==================================================================
echo.
pause
