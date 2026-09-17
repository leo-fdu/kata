use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::io::{BufRead, BufReader, Write};
use std::path::PathBuf;
use std::process::{Child, ChildStdin, Command, Stdio};
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;
use tauri::{AppHandle, Emitter};

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EngineConfig {
    pub executable: String,
    pub model: String,
    pub config: String,
    pub threads: u32,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EngineStatus {
    pub state: String,
    pub detail: String,
}

struct RunningEngine {
    child: Child,
    stdin: ChildStdin,
}

pub struct KataGoEngine {
    process: Mutex<Option<RunningEngine>>,
    generation: Arc<AtomicU64>,
}

impl Default for KataGoEngine {
    fn default() -> Self {
        Self {
            process: Mutex::new(None),
            generation: Arc::new(AtomicU64::new(0)),
        }
    }
}

fn status(app: &AppHandle, state: &str, detail: impl Into<String>) {
    let _ = app.emit(
        "engine-status",
        EngineStatus {
            state: state.to_owned(),
            detail: detail.into(),
        },
    );
}

fn validate_path(value: &str, label: &str) -> Result<PathBuf, String> {
    if value.trim().is_empty() {
        return Err(format!("Choose a {label} file in Settings"));
    }
    let path = PathBuf::from(value);
    if !path.is_file() {
        return Err(format!("{label} file does not exist: {}", path.display()));
    }
    Ok(path)
}

impl KataGoEngine {
    pub fn stop(&self, app: &AppHandle) -> Result<(), String> {
        self.generation.fetch_add(1, Ordering::SeqCst);
        let mut running = self.process.lock().map_err(|e| e.to_string())?;
        if let Some(mut process) = running.take() {
            let _ = process.child.kill();
            let _ = process.child.wait();
        }
        status(app, "stopped", "Analysis engine stopped");
        Ok(())
    }

    pub fn start(&self, app: &AppHandle, config: EngineConfig, working_dir: PathBuf) -> Result<(), String> {
        self.stop(app)?;
        let executable = validate_path(&config.executable, "KataGo executable")?;
        let model = validate_path(&config.model, "neural network model")?;
        let config_path = validate_path(&config.config, "analysis config")?;
        if !(1..=64).contains(&config.threads) {
            return Err("Search threads must be between 1 and 64".to_owned());
        }
        std::fs::create_dir_all(&working_dir).map_err(|e| e.to_string())?;
        status(app, "starting", "Loading KataGo and neural network…");
        let mut child = Command::new(&executable)
            .arg("analysis")
            .arg("-config")
            .arg(&config_path)
            .arg("-model")
            .arg(&model)
            .arg("-override-config")
            .arg(format!(
                "numAnalysisThreads=1,numSearchThreadsPerAnalysisThread={},reportAnalysisWinratesAs=BLACK",
                config.threads
            ))
            .arg("-quit-without-waiting")
            .current_dir(working_dir)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| format!("Could not launch KataGo: {e}"))?;
        let stdin = child.stdin.take().ok_or("KataGo stdin unavailable")?;
        let stdout = child.stdout.take().ok_or("KataGo stdout unavailable")?;
        let stderr = child.stderr.take().ok_or("KataGo stderr unavailable")?;
        let generation = self.generation.fetch_add(1, Ordering::SeqCst) + 1;
        let ready = Arc::new(AtomicBool::new(false));
        let current_generation = Arc::clone(&self.generation);
        let stdout_ready = Arc::clone(&ready);
        let stdout_app = app.clone();
        thread::spawn(move || {
            for line in BufReader::new(stdout).lines() {
                if current_generation.load(Ordering::SeqCst) != generation {
                    break;
                }
                match line {
                    Ok(line) => match serde_json::from_str::<Value>(&line) {
                        Ok(payload) => {
                            let _ = stdout_app.emit("engine-message", payload);
                        }
                        Err(error) => status(&stdout_app, "error", format!("Invalid KataGo response: {error}")),
                    },
                    Err(error) => {
                        status(&stdout_app, "error", format!("KataGo output error: {error}"));
                        break;
                    }
                }
            }
            if current_generation.load(Ordering::SeqCst) == generation {
                let detail = if stdout_ready.load(Ordering::SeqCst) {
                    "KataGo process ended"
                } else {
                    "KataGo exited before it was ready. Check the engine log in Settings."
                };
                status(&stdout_app, "error", detail);
            }
        });
        let stderr_app = app.clone();
        let error_generation = Arc::clone(&self.generation);
        thread::spawn(move || {
            for line in BufReader::new(stderr).lines() {
                if error_generation.load(Ordering::SeqCst) != generation {
                    break;
                }
                if let Ok(message) = line {
                    if message.contains("Started, ready to begin handling requests") {
                        ready.store(true, Ordering::SeqCst);
                        status(&stderr_app, "ready", "KataGo is ready");
                    }
                    let _ = stderr_app.emit("engine-log", message);
                }
            }
        });
        *self.process.lock().map_err(|e| e.to_string())? = Some(RunningEngine { child, stdin });
        Ok(())
    }

    pub fn send(&self, query: Value) -> Result<(), String> {
        let mut process = self.process.lock().map_err(|e| e.to_string())?;
        let running = process.as_mut().ok_or("KataGo is not running")?;
        let mut bytes = serde_json::to_vec(&query).map_err(|e| e.to_string())?;
        bytes.push(b'\n');
        running.stdin.write_all(&bytes).map_err(|e| format!("Could not write to KataGo: {e}"))?;
        running.stdin.flush().map_err(|e| e.to_string())
    }
}
