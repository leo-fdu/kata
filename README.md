# Kata

Kata is a macOS frontend for [KataGo](https://github.com/lightvector/KataGo). It provides a Go board, game controls, SGF support, and analysis views. **Kata does not include KataGo, a neural-network model, or an engine configuration.** You supply and configure all three yourself. Kata is an independent project, not an official KataGo release.

## What you need

- A macOS build of the KataGo executable that supports its JSON analysis engine.
- A compatible KataGo neural-network model file.
- A KataGo **analysis** configuration file, such as `analysis_example.cfg`. A GTP configuration is not a substitute.

You can obtain these from the [KataGo project](https://github.com/lightvector/KataGo). On macOS, KataGo also documents a Homebrew installation (`brew install katago`). If you use Homebrew, `brew list --verbose katago` shows the installed executable, model, and configuration paths. Choose the analysis configuration, not `gtp_example.cfg`. Installation paths may differ between Macs; Kata does not guess or fill them in for you.

## Set up the engine

1. Open `Kata.app` and click the **Settings** button in the toolbar (or press **⌘,**).
2. Under **Engine**, choose the KataGo executable, neural-network model, and analysis configuration files. Each field needs the full path to an existing file.
3. Click **Save Settings**. Kata starts the configured engine and shows **KataGo running** in the analysis sidebar when it is ready. Model loading may take a little time.
4. If startup fails, reopen **Settings**, check all three paths, and expand **Engine log**. You can also use **Restart engine** after correcting a problem.

Kata saves these paths locally on your Mac. It launches the chosen executable as a subprocess using KataGo's [JSON analysis engine](https://github.com/lightvector/KataGo/blob/master/docs/Analysis_Engine.md); it does not connect to a remote server. Do not select an executable you do not trust.

## Play and analyze

Click **New game** in the toolbar (or press **⌘N**) to choose a 9×9, 13×13, or 19×19 board, the starting arrangement, and a mode:

- **Human vs Human:** play both sides locally. KataGo is not required.
- **Human vs KataGo:** choose your color. Configure and start KataGo first; it plays after its search completes.
- **Analysis board:** place moves and inspect KataGo's candidate moves, winrates, score estimate, principal variations, and optional ownership overlay. The board still works without an engine, but analysis results require one.

Click an intersection to play, or use **Pass** above the board. Use the toolbar arrows to move through the game, **Open SGF** to load a record, and **Save SGF** to save it. Two consecutive passes end a game. The settings window also offers appearance, coordinate, and analysis-display controls.

## Build from source

Install Node.js, Rust, and the macOS development tools required by Tauri. Then run:

```sh
npm install
npm test
npm run tauri dev
```

For a release build, run `npm run tauri build -- --bundles app`. On Apple Silicon macOS, `python3 scripts/package_macos.py` copies the built frontend-only app into `outputs/` and ad-hoc signs it. The script does **not** copy KataGo, a model, or a config file. `npm run dev` opens only the browser frontend; KataGo integration requires the Tauri desktop app.

An ad-hoc signature is useful for local testing but is not Apple notarization. Public binary distribution without normal Gatekeeper warnings requires your own Developer ID signing and notarization. The source code and the separately installed KataGo engine have their own licensing considerations.
