# -*- mode: python ; coding: utf-8 -*-
from PyInstaller.utils.hooks import collect_all

datas = [('D:\\Keg-Trading\\Stitch - The Coran Building\\backend\\static', 'static'), ('version.json', '.'), ('C:\\Users\\kelgh\\AppData\\Roaming\\Python\\Python314\\site-packages\\whisper\\assets', 'whisper/assets')]
binaries = []
hiddenimports = ['passlib.handlers.argon2', 'passlib.handlers.bcrypt', 'argon2', 'uvicorn.logging', 'uvicorn.loops.auto', 'uvicorn.protocols.http.auto', 'uvicorn.protocols.websockets.auto', 'uvicorn.lifespan.on', 'googleapiclient.discovery', 'google_auth_oauthlib.flow', 'sqlalchemy.dialects.postgresql', 'fasthtml', 'backend.app.services.audio_analysis', 'librosa', 'librosa.core', 'librosa.core.audio', 'librosa.feature', 'librosa.effects', 'librosa.util', 'soundfile', 'audioread', 'soxr', 'scipy', 'scipy.signal', 'scipy.fft', 'sklearn', 'numba', 'numba.core', 'llvmlite']
tmp_ret = collect_all('librosa')
datas += tmp_ret[0]; binaries += tmp_ret[1]; hiddenimports += tmp_ret[2]
tmp_ret = collect_all('numba')
datas += tmp_ret[0]; binaries += tmp_ret[1]; hiddenimports += tmp_ret[2]
tmp_ret = collect_all('uvicorn')
datas += tmp_ret[0]; binaries += tmp_ret[1]; hiddenimports += tmp_ret[2]


a = Analysis(
    ['server_pro.py'],
    pathex=[],
    binaries=binaries,
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='QuranBuildingPro',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
