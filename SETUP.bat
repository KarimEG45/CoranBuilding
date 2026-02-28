@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul 2>&1
cd /d "%~dp0"

title The Coran Building - Installation

echo.
echo  ╔══════════════════════════════════════════════════════╗
echo  ║      THE CORAN BUILDING - Installation               ║
echo  ╚══════════════════════════════════════════════════════╝
echo.
echo  Ce script va installer le moteur IA (Ollama + modele).
echo  Duree estimee : 10-40 minutes selon votre connexion.
echo  Connexion internet requise.
echo.
pause

REM ══════════════════════════════════════════════════════════
REM ETAPE 1 : Ollama
REM ══════════════════════════════════════════════════════════

echo.
echo  [1/3] Verification d'Ollama...

where ollama >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo  [OK] Ollama est deja installe.
    goto :CHECK_SERVICE
)

echo  Ollama n'est pas installe. Telechargement en cours (~10 MB)...
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "Write-Host '  Telechargement...' -NoNewline; " ^
    "Invoke-WebRequest -Uri 'https://ollama.com/download/OllamaSetup.exe' " ^
    "-OutFile '$env:TEMP\OllamaSetup.exe' -UseBasicParsing; " ^
    "Write-Host ' OK'"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo  ERREUR : Impossible de telecharger Ollama.
    echo  Verifiez votre connexion internet et relancez ce script.
    echo.
    pause
    exit /b 1
)

echo  Installation d'Ollama en cours...
"%TEMP%\OllamaSetup.exe" /VERYSILENT /NORESTART

if %ERRORLEVEL% NEQ 0 (
    REM Essai sans flag silencieux
    "%TEMP%\OllamaSetup.exe"
)

echo  Attente du demarrage d'Ollama...
timeout /t 8 /nobreak >nul

REM ══════════════════════════════════════════════════════════
REM ETAPE 2 : Demarrage du service Ollama
REM ══════════════════════════════════════════════════════════

:CHECK_SERVICE
echo.
echo  [2/3] Demarrage du service Ollama...

REM Verifier si le service repond
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "try { Invoke-WebRequest -Uri 'http://localhost:11434' -UseBasicParsing -TimeoutSec 2 | Out-Null; exit 0 } catch { exit 1 }" >nul 2>&1

if %ERRORLEVEL% EQU 0 (
    echo  [OK] Service Ollama deja actif.
    goto :PULL_MODEL
)

REM Demarrer le service
where ollama >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    start /B "" ollama serve >nul 2>&1
) else (
    if exist "%LOCALAPPDATA%\Programs\Ollama\ollama.exe" (
        start /B "" "%LOCALAPPDATA%\Programs\Ollama\ollama.exe" serve >nul 2>&1
    ) else (
        echo  ERREUR : ollama.exe introuvable. L'installation a peut-etre echoue.
        pause
        exit /b 1
    )
)

REM Attendre que le service soit pret (max 30s)
set WAIT=0
:WAIT_LOOP
timeout /t 2 /nobreak >nul
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "try { Invoke-WebRequest -Uri 'http://localhost:11434' -UseBasicParsing -TimeoutSec 2 | Out-Null; exit 0 } catch { exit 1 }" >nul 2>&1
if %ERRORLEVEL% EQU 0 goto :SERVICE_OK
set /A WAIT+=2
if !WAIT! LSS 30 (
    echo  Attente... (!WAIT!s)
    goto :WAIT_LOOP
)
echo  ERREUR : Le service Ollama ne repond pas apres 30 secondes.
pause
exit /b 1

:SERVICE_OK
echo  [OK] Service Ollama actif.

REM ══════════════════════════════════════════════════════════
REM ETAPE 3 : Telechargement du modele IA
REM ══════════════════════════════════════════════════════════

:PULL_MODEL
echo.
echo  [3/3] Verification du modele IA (llama3.1:8b)...

ollama list 2>&1 | findstr /C:"llama3.1:8b" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo  [OK] Modele deja present.
    goto :LAUNCH
)

echo.
echo  ┌──────────────────────────────────────────────────────┐
echo  │  Telechargement du modele IA : llama3.1:8b           │
echo  │  Taille : ~4.9 GB                                    │
echo  │  Duree estimee : 10-40 min (selon votre connexion)   │
echo  │                                                      │
echo  │  Ne fermez PAS cette fenetre.                        │
echo  └──────────────────────────────────────────────────────┘
echo.

ollama pull llama3.1:8b

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo  ERREUR : Le telechargement du modele a echoue.
    echo  Verifiez votre connexion et relancez ce script.
    echo  (Le telechargement reprendra la ou il s'etait arrete)
    echo.
    pause
    exit /b 1
)

echo.
echo  [OK] Modele IA installe avec succes !

REM ══════════════════════════════════════════════════════════
REM LANCEMENT
REM ══════════════════════════════════════════════════════════

:LAUNCH
echo.
echo  ╔══════════════════════════════════════════════════════╗
echo  ║  Installation terminee ! Lancement de l'application ║
echo  ╚══════════════════════════════════════════════════════╝
echo.
echo  L'application va s'ouvrir dans votre navigateur.
echo  Si rien ne s'ouvre apres 30 secondes :
echo  → Ouvrez votre navigateur et allez sur http://localhost:8001
echo.
echo  Cette fenetre va se fermer automatiquement dans 5 secondes.
timeout /t 5 /nobreak >nul

start "" "%~dp0QuranBuildingPro.exe"
exit /b 0
