"""Run with the backend venv Python. Builds a platform-native onedir runtime.

Install the build tool with: python -m pip install PyInstaller==6.20.0
The entire desktop/build/backend directory must be packaged, not only its exe.
"""
from pathlib import Path
import subprocess
import sys


def main():
    root = Path(__file__).resolve().parents[2]
    build = root / 'desktop' / 'build'
    subprocess.run([
        sys.executable, '-m', 'PyInstaller', '--noconfirm', '--clean', '--onedir',
        '--name', 'backend', '--distpath', str(build),
        '--workpath', str(build / 'pyinstaller-work'),
        '--specpath', str(build / 'pyinstaller-spec'),
        '--paths', str(root / 'backend'), '--collect-submodules', 'uvicorn',
        '--hidden-import', 'leaklens.api',
        str(root / 'backend' / 'leaklens' / 'desktop.py'),
    ], check=True)
    suffix = '.exe' if sys.platform == 'win32' else ''
    (build / 'backend' / ('backend' + suffix)).replace(
        build / 'backend' / ('leaklens-backend' + suffix))


if __name__ == '__main__':
    main()
