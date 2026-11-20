# Confluence desktop

An offline, single-user Water Quality simulation for macOS and Windows. This is a real desktop application with a bundled Python runtime and its own window, not a PWA/browser shortcut. The marketing website remains on Lovable.

## Install and use

Download the appropriate installer from the repository Releases page when available. macOS builds target Apple Silicon; Windows builds target x64. Windows and macOS packages are built on their respective platforms. Do not use source archives as installers.

- macOS: open the DMG and copy Confluence to Applications.
- Windows: run the NSIS setup executable and select an installation folder.
- Launch Confluence. No terminal, Node, Python, remote backend, or manual token entry is required.
- Start in Operations, simulate a main break, review/approve the advisory and crew assignment, and switch to Crew app to record repair, flushing and samples.
- A failed sample requires another flush. Two clear samples plus recovered fresh pressure allow the operator to approve simulated all-clear.

**Unsigned demo builds:** no Apple Developer ID, notarization, or Windows signing certificate is supplied. macOS Gatekeeper or Windows SmartScreen may warn or block installation. Only use artifacts from the trusted repository. No security bypass or system setting change is performed by this project. This is not App Store distribution or production utility software.

## Local storage and privacy

The SQLite database is stored in Electron's application-data directory: normally `~/Library/Application Support/LeakLens` on macOS and `%APPDATA%/LeakLens` on Windows. Confluence explicitly preserves the legacy LeakLens data-directory name across the rebrand. Data survives closing/reopening and application replacement. Use the in-app, explicitly confirmed Reset demonstration action to delete ordinary demo records. Test-mode Reset starts a new trial without deleting prior trial evidence. See [the evaluation runbook](../docs/OPERATOR-EVALUATION.md).

Every launch creates fresh private role credentials in memory and sends them to the backend through stdin. The desktop sandbox receives them only through a restricted preload bridge. No credentials are bundled, placed in URLs, or written to a token file. This is local demo access, not production identity management. No customer notices or equipment commands are sent. Independent installations do not synchronize.

## Build from source (developers only)

Use Node 22 and Python 3.13 on the target operating system:

```sh
python -m pip install -e ./backend PyInstaller==6.20.0 pytest httpx
npm ci --prefix frontend
npm ci --prefix desktop
npm run build --prefix frontend
python desktop/scripts/build-backend.py
npm run pack --prefix desktop
npm run dist --prefix desktop
```

The complete `desktop/build/backend` folder, including `_internal`, is required. The builder includes only packaged frontend assets, backend runtime, desktop source and package metadata. Local source databases and credentials are not installer resources.

Outputs are under `desktop/dist`. To test the actual Mac app:

```sh
cd desktop
LEAKLENS_PACKAGED="$PWD/dist/mac-arm64/Confluence.app/Contents/MacOS/Confluence" npm run test:desktop
```

On Windows PowerShell:

```powershell
cd desktop
$env:LEAKLENS_PACKAGED = "$PWD/dist/win-unpacked/Confluence.exe"
npm run test:desktop
```

The acceptance suite launches with an empty PATH, uses a separate temporary database, completes an incident through failed-sample recovery, reopens to verify persistence, and checks duplicate launch and renderer isolation. CI produces unsigned installer artifacts only after packaged tests pass. `LEAKLENS_DATA_DIR` is an optional local directory override for isolated testing, not a cloud endpoint.
