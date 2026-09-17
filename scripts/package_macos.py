"""Copy the Tauri-built, engine-free Kata.app into outputs without overwriting it.

Run after `npm run tauri build -- --bundles app`. Users configure their own
KataGo executable, neural-network model, and analysis config in the app.
"""

from __future__ import annotations

import os
import plistlib
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE_APP = ROOT / "src-tauri/target/release/bundle/macos/Kata.app"
OUTPUTS = ROOT / "outputs"
FINAL_APP = OUTPUTS / "Kata-0.4.0-Apple-Silicon.app"


def package(staging: Path) -> None:
    if not SOURCE_APP.is_dir():
        raise RuntimeError("Build Kata.app with Tauri before packaging")
    app = staging / FINAL_APP.name
    shutil.copytree(SOURCE_APP, app, symlinks=True)
    contents = app / "Contents"
    with (contents / "Info.plist").open("rb") as info_file:
        info = plistlib.load(info_file)
    if info.get("CFBundleDisplayName") != "Kata" or info.get("CFBundleExecutable") != "kata":
        raise RuntimeError("The Tauri bundle does not have the expected Kata identity")
    if info.get("CFBundleIconFile") != "icon.icns" or not (contents / "Resources/icon.icns").is_file():
        raise RuntimeError("The macOS bundle is missing its application icon")
    if (contents / "MacOS/katago").exists() or (contents / "Resources/katago").exists():
        raise RuntimeError("The frontend-only app must not bundle KataGo or its model")
    subprocess.run(["codesign", "--force", "--deep", "--sign", "-", str(app)], check=True)
    subprocess.run(["codesign", "--verify", "--deep", "--strict", str(app)], check=True)


def main() -> None:
    if sys.platform != "darwin" or os.uname().machine != "arm64":
        raise RuntimeError("This packager currently supports Apple Silicon macOS only")
    OUTPUTS.mkdir(parents=True, exist_ok=True)
    if FINAL_APP.exists():
        raise RuntimeError(f"Will not overwrite existing deliverable: {FINAL_APP}")
    with tempfile.TemporaryDirectory(prefix="kata-package-", dir=OUTPUTS) as temporary:
        staging = Path(temporary)
        package(staging)
        (staging / FINAL_APP.name).rename(FINAL_APP)
    print(f"Ready: {FINAL_APP}")


if __name__ == "__main__":
    main()
