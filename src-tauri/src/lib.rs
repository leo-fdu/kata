mod engine;
mod menu;
mod settings;

use engine::{EngineConfig, KataGoEngine};
use serde::Serialize;
use serde_json::Value;
use std::path::PathBuf;
use tauri::{AppHandle, Emitter, Manager, State, WebviewUrl, WebviewWindowBuilder};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct OpenedSgf { path: String, contents: String }

#[tauri::command]
fn load_settings(app: AppHandle) -> Result<settings::Settings, String> { settings::load(&app) }

#[tauri::command]
fn save_settings(app: AppHandle, settings: settings::Settings) -> Result<(), String> {
    settings::save(&app, &settings)?;
    let _ = app.emit("settings-changed", settings);
    Ok(())
}

#[tauri::command]
fn open_settings_window(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("settings") {
        return window.set_focus().map_err(|e| e.to_string());
    }
    WebviewWindowBuilder::new(&app, "settings", WebviewUrl::App("index.html?window=settings".into()))
        .title("Kata Settings")
        .inner_size(700.0, 560.0)
        .min_inner_size(620.0, 500.0)
        .center()
        .build()
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn choose_file(kind: String) -> Option<String> {
    let mut dialog = rfd::FileDialog::new();
    dialog = match kind.as_str() {
        "model" => dialog.add_filter("KataGo model", &["gz", "bin", "txt"]),
        "config" => dialog.add_filter("KataGo config", &["cfg"]),
        "sgf" => dialog.add_filter("Smart Game Format", &["sgf"]),
        _ => dialog,
    };
    dialog.pick_file().map(|path| path.to_string_lossy().into_owned())
}

#[tauri::command]
fn open_sgf() -> Result<Option<OpenedSgf>, String> {
    let path = rfd::FileDialog::new().add_filter("Smart Game Format", &["sgf"]).pick_file();
    let Some(path) = path else { return Ok(None) };
    let contents = std::fs::read_to_string(&path).map_err(|e| format!("Could not read SGF: {e}"))?;
    Ok(Some(OpenedSgf { path: path.to_string_lossy().into_owned(), contents }))
}

#[tauri::command]
fn save_sgf(path: Option<String>, contents: String) -> Result<Option<String>, String> {
    let target = match path {
        Some(path) => PathBuf::from(path),
        None => match rfd::FileDialog::new().add_filter("Smart Game Format", &["sgf"]).set_file_name("Untitled Game.sgf").save_file() {
            Some(path) => path,
            None => return Ok(None),
        },
    };
    std::fs::write(&target, contents).map_err(|e| format!("Could not save SGF: {e}"))?;
    Ok(Some(target.to_string_lossy().into_owned()))
}

#[tauri::command]
fn start_engine(app: AppHandle, state: State<KataGoEngine>, config: EngineConfig) -> Result<(), String> {
    let working_dir = app.path().app_data_dir().map_err(|e| e.to_string())?.join("engine");
    state.start(&app, config, working_dir)
}

#[tauri::command]
fn stop_engine(app: AppHandle, state: State<KataGoEngine>) -> Result<(), String> { state.stop(&app) }

#[tauri::command]
fn restart_engine(app: AppHandle, state: State<KataGoEngine>) -> Result<(), String> {
    let settings = settings::load(&app)?;
    let working_dir = app.path().app_data_dir().map_err(|e| e.to_string())?.join("engine");
    state.start(&app, engine::EngineConfig {
        executable: settings.executable,
        model: settings.model,
        config: settings.config,
        threads: settings.threads,
    }, working_dir)
}

#[tauri::command]
fn send_engine_query(state: State<KataGoEngine>, query: Value) -> Result<(), String> { state.send(query) }

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(KataGoEngine::default())
        .setup(|app| {
            app.set_menu(menu::build(app.handle())?)?;
            Ok(())
        })
        .on_menu_event(|app, event| {
            let _ = app.emit("menu-action", event.id().as_ref());
        })
        .invoke_handler(tauri::generate_handler![
            load_settings, save_settings, open_settings_window, choose_file, open_sgf, save_sgf,
            start_engine, stop_engine, restart_engine, send_engine_query
        ])
        .on_window_event(|window, event| {
            if window.label() == "main" {
                if let tauri::WindowEvent::Destroyed = event {
                    let state = window.state::<KataGoEngine>();
                    let _ = state.stop(&window.app_handle());
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running Kata");
}
