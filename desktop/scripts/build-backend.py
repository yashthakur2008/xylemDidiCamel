"""Run with the backend venv Python. Builds a platform-native onedir runtime.

Install the build tool with: python -m pip install PyInstaller==6.20.0
The entire desktop/build/backend directory must be packaged, not only its exe.
"""
from pathlib import Path
import os
import subprocess
import sys


def main():
    root = Path(__file__).resolve().parents[2]
    build = root / 'desktop' / 'build'
    source_args = [arg for source in sorted((root / 'backend' / 'leaklens').glob('*.py'))
                   for arg in ('--add-data', f'{source}{os.pathsep}leaklens')]
    subprocess.run([
        sys.executable, '-m', 'PyInstaller', '--noconfirm', '--clean', '--onedir',
        '--name', 'backend', '--distpath', str(build),
        '--workpath', str(build / 'pyinstaller-work'),
        '--specpath', str(build / 'pyinstaller-spec'),
        '--paths', str(root / 'backend'), '--collect-submodules', 'uvicorn',
        '--hidden-import', 'leaklens.api', '--copy-metadata', 'leaklens-backend',
        *source_args,
        str(root / 'backend' / 'leaklens' / 'desktop.py'),
    ], check=True)
    suffix = '.exe' if sys.platform == 'win32' else ''
    (build / 'backend' / ('backend' + suffix)).replace(
        build / 'backend' / ('leaklens-backend' + suffix))


if __name__ == '__main__':
    main()
