use std::path::PathBuf;
use std::process::{Command, Stdio};
use tauri::Manager;
use tauri_plugin_shell::ShellExt;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let port = 55001u16;

            // Helper function to spawn backend process
            let spawn_backend = |backend_path: &PathBuf, working_dir: &std::path::Path| -> bool {
                // Create log file for backend output
                let log_file = working_dir.join("backend.log");
                let log_file_path = log_file.clone();
                
                match std::fs::File::create(&log_file) {
                    Ok(file) => {
                        match Command::new(backend_path)
                            .env("PORT", port.to_string())
                            .current_dir(working_dir)
                            .stdout(Stdio::from(file.try_clone().unwrap()))
                            .stderr(Stdio::from(file))
                            .spawn()
                        {
                    Ok(mut child) => {
                        // Give it a moment to start, then check if it's still running
                        std::thread::sleep(std::time::Duration::from_millis(1000));
                        // Check if process is still running
                        match child.try_wait() {
                            Ok(Some(status)) => {
                                eprintln!("Backend process exited immediately with status: {:?}", status);
                                // Try to read error from log file
                                if let Ok(log_content) = std::fs::read_to_string(&log_file_path) {
                                    eprintln!("Backend error log:\n{}", log_content);
                                }
                                false
                            }
                            Ok(None) => {
                                // Process is still running, detach it
                                let _ = child;
                                eprintln!("Backend started successfully from {:?}", backend_path);
                                true
                            }
                            Err(_) => {
                                // If we can't check, assume it's running (detach it)
                                let _ = child;
                                eprintln!("Backend started from {:?} (status check unavailable)", backend_path);
                                true
                            }
                        }
                    }
                            Err(e) => {
                                eprintln!("Failed to spawn backend from {:?}: {}", backend_path, e);
                                false
                            }
                        }
                    }
                    Err(e) => {
                        eprintln!("Failed to create log file: {}", e);
                        // Fallback: try without log file
                        match Command::new(backend_path)
                            .env("PORT", port.to_string())
                            .current_dir(working_dir)
                            .spawn()
                        {
                            Ok(mut child) => {
                                std::thread::sleep(std::time::Duration::from_millis(1000));
                                match child.try_wait() {
                                    Ok(Some(status)) => {
                                        eprintln!("Backend process exited immediately with status: {:?}", status);
                                        false
                                    }
                                    Ok(None) => {
                                        let _ = child;
                                        true
                                    }
                                    Err(_) => {
                                        // If we can't check, assume it's running
                                        let _ = child;
                                        true
                                    }
                                }
                            }
                            Err(e) => {
                                eprintln!("Failed to spawn backend: {}", e);
                                false
                            }
                        }
                    }
                }
            };

            // 1) Try official sidecar (name: wallet-backend-<target-triple>.exe)
            if let Ok(cmd) = app.shell().sidecar("wallet-backend") {
                match cmd.env("PORT", port.to_string()).spawn() {
                    Ok((_rx, child)) => {
                        std::thread::sleep(std::time::Duration::from_millis(1000));
                        // Check if process is still running by trying to get its status
                        // If it's still running, we can't get the status immediately
                        eprintln!("Backend started via sidecar");
                        let _ = child;
                        return Ok(());
                    }
                    Err(e) => {
                        eprintln!("Failed to spawn sidecar backend: {}", e);
                    }
                }
            }

            // 2) Fallback: run wallet-backend.exe from resource directory
            if let Ok(resource_dir) = app.path().resource_dir() {
                #[cfg(windows)]
                let backend_name = "wallet-backend.exe";
                #[cfg(not(windows))]
                let backend_name = "wallet-backend";
                let backend_path: PathBuf = resource_dir.join(backend_name);
                
                if backend_path.is_file() {
                    eprintln!("Attempting to start backend from resource dir: {:?}", backend_path);
                    if spawn_backend(&backend_path, &resource_dir) {
                        eprintln!("Backend started from resource directory");
                        return Ok(());
                    }
                } else {
                    eprintln!("Backend not found in resource dir: {:?}", backend_path);
                }
            }

            // 3) Try exe directory (most reliable for standalone exe)
            if let Ok(exe_dir) = std::env::current_exe() {
                if let Some(parent) = exe_dir.parent() {
                    #[cfg(windows)]
                    let backend_name = "wallet-backend.exe";
                    #[cfg(not(windows))]
                    let backend_name = "wallet-backend";
                    let alt_path = parent.join(backend_name);
                    if alt_path.is_file() {
                        eprintln!("Attempting to start backend from exe directory: {:?}", alt_path);
                        let parent_buf = parent.to_path_buf();
                        if spawn_backend(&alt_path, &parent_buf) {
                            eprintln!("Backend started from exe directory");
                            return Ok(());
                        }
                    } else {
                        eprintln!("Backend not found in exe directory: {:?}", alt_path);
                    }
                }
            }

            eprintln!("Warning: Could not start backend automatically. The app may not function correctly.");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Wallet Tracker application");
}
