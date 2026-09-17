use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct Settings {
    pub executable: String,
    pub model: String,
    pub config: String,
    pub max_visits: u32,
    pub analysis_interval: f64,
    pub threads: u32,
    pub candidate_count: u32,
    pub show_ownership: bool,
    pub show_winrate: bool,
    pub show_score_lead: bool,
    pub show_pv: bool,
    pub show_move_numbers: bool,
    pub theme: String,
    pub board_appearance: String,
    pub coordinate_style: String,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            executable: String::new(),
            model: String::new(),
            config: String::new(),
            max_visits: 500,
            analysis_interval: 0.5,
            threads: 4,
            candidate_count: 5,
            show_ownership: false,
            show_winrate: true,
            show_score_lead: true,
            show_pv: true,
            show_move_numbers: false,
            theme: "system".to_owned(),
            board_appearance: "warm".to_owned(),
            coordinate_style: "gtp".to_owned(),
        }
    }
}

fn settings_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("settings.json"))
}

pub fn load(app: &AppHandle) -> Result<Settings, String> {
    let path = settings_path(app)?;
    if !path.exists() { return Ok(Settings::default()); }
    let bytes = std::fs::read(&path).map_err(|e| e.to_string())?;
    serde_json::from_slice(&bytes).map_err(|e| format!("Invalid settings file: {e}"))
}

pub fn save(app: &AppHandle, settings: &Settings) -> Result<(), String> {
    let path = settings_path(app)?;
    if !(1..=100_000).contains(&settings.max_visits) { return Err("Max visits must be 1–100000".to_owned()); }
    if !(1..=64).contains(&settings.threads) { return Err("Threads must be 1–64".to_owned()); }
    if !(1..=20).contains(&settings.candidate_count) { return Err("Candidate count must be 1–20".to_owned()); }
    if !(0.1..=10.0).contains(&settings.analysis_interval) { return Err("Analysis interval must be 0.1–10 seconds".to_owned()); }
    let data = serde_json::to_vec_pretty(settings).map_err(|e| e.to_string())?;
    let temp = path.with_extension("json.tmp");
    std::fs::write(&temp, data).map_err(|e| e.to_string())?;
    std::fs::rename(temp, path).map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::Settings;

    #[test]
    fn engine_paths_are_empty_until_the_user_configures_them() {
        let settings = Settings::default();
        assert!(settings.executable.is_empty());
        assert!(settings.model.is_empty());
        assert!(settings.config.is_empty());
    }
}
