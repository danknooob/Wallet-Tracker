use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::time::Duration;
use tauri::Manager;
use tauri_plugin_shell::ShellExt;
use std::net::TcpStream;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let port = 55001u16;
            
            // Helper function to check if backend is listening on the port
            let check_backend_health = |port: u16| -> bool {
                for attempt in 1..=10 {
                    match TcpStream::connect(format!("127.0.0.1:{}", port)) {
                        Ok(_) => {
                            eprintln!("✅ Backend is listening on port {} (attempt {})", port, attempt);
                            return true;
                        }
                        Err(_) => {
                            if attempt < 10 {
                                std::thread::sleep(Duration::from_millis(500));
                            }
                        }
                    }
                }
                eprintln!("❌ Backend is not listening on port {} after 10 attempts", port);
                false
            };

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

            // Helper to load .env file and return env vars
            let load_env_vars = || -> std::collections::HashMap<String, String> {
                let mut env_vars = std::collections::HashMap::new();
                env_vars.insert("PORT".to_string(), port.to_string());
                
                // Try to find .env file in multiple locations (in priority order)
                let mut env_paths = Vec::new();
                
                // 1. Executable's directory (most reliable for packaged apps)
                if let Ok(exe_path) = std::env::current_exe() {
                    if let Some(exe_dir) = exe_path.parent() {
                        env_paths.push(exe_dir.join(".env"));
                        // Also check parent directory (in case exe is in a subdirectory)
                        if let Some(parent) = exe_dir.parent() {
                            env_paths.push(parent.join(".env"));
                        }
                    }
                }
                
                // 2. Resource directory (where Tauri bundles resources)
                if let Ok(resource_dir) = app.path().resource_dir() {
                    env_paths.push(resource_dir.join(".env"));
                }
                
                // 3. App data directory
                if let Ok(app_data_dir) = app.path().app_data_dir() {
                    env_paths.push(app_data_dir.join(".env"));
                }
                
                // 4. Current working directory
                if let Ok(cwd) = std::env::current_dir() {
                    env_paths.push(cwd.join(".env"));
                }
                
                eprintln!("🔍 Checking for .env file in {} locations...", env_paths.len());
                
                let mut loaded_from: Option<PathBuf> = None;
                for env_path in &env_paths {
                    if let Ok(content) = std::fs::read_to_string(env_path) {
                        eprintln!("✅ Found .env file at: {:?}", env_path);
                        loaded_from = Some(env_path.clone());
                        
                        let mut loaded_count = 0;
                        for line in content.lines() {
                            let line = line.trim();
                            if line.is_empty() || line.starts_with('#') {
                                continue;
                            }
                            if let Some((key, value)) = line.split_once('=') {
                                let key = key.trim().to_string();
                                let value = value.trim().to_string();
                                env_vars.insert(key.clone(), value.clone());
                                loaded_count += 1;
                                // Log important vars (masked)
                                if key == "ETH_RPC_URL" || key == "CODEX_RPC_URL" {
                                    eprintln!("  📝 Loaded {} = {}***", key, &value[..value.len().min(20)]);
                                }
                            }
                        }
                        eprintln!("  ✅ Loaded {} environment variables from .env", loaded_count);
                        break;
                    }
                }
                
                if loaded_from.is_none() {
                    eprintln!("⚠️  No .env file found in any checked location:");
                    for path in &env_paths {
                        eprintln!("    - {:?}", path);
                    }
                    eprintln!("  Backend will use default values or environment variables already set.");
                }
                
                // Log summary of what we're passing to backend
                eprintln!("📋 Environment variables to pass to backend:");
                eprintln!("  PORT = {}", env_vars.get("PORT").unwrap_or(&"not set".to_string()));
                eprintln!("  ETH_RPC_URL = {}", 
                    if env_vars.contains_key("ETH_RPC_URL") { "***set***" } else { "NOT SET" });
                eprintln!("  CODEX_RPC_URL = {}", 
                    if env_vars.contains_key("CODEX_RPC_URL") { "***set***" } else { "NOT SET" });
                eprintln!("  NODE_ENV = {}", env_vars.get("NODE_ENV").unwrap_or(&"not set".to_string()));
                
                env_vars
            };
            
            // 1) Try official sidecar (name: wallet-backend-<target-triple>.exe)
            if let Ok(cmd) = app.shell().sidecar("wallet-backend") {
                let env_vars = load_env_vars();
                let mut sidecar_cmd = cmd;
                
                // Set all environment variables from .env
                for (key, value) in &env_vars {
                    sidecar_cmd = sidecar_cmd.env(key, value);
                }
                
                match sidecar_cmd.spawn() {
                    Ok((_rx, child)) => {
                        eprintln!("Backend sidecar spawned, waiting for health check...");
                        let _ = child;
                        
                        // Wait a bit for backend to start
                        std::thread::sleep(Duration::from_millis(2000));
                        
                        // Verify backend is actually listening
                        if check_backend_health(port) {
                            eprintln!("✅ Backend started successfully via sidecar");
                            return Ok(());
                        } else {
                            eprintln!("⚠️ Backend sidecar spawned but not responding on port {}", port);
                            // Continue to fallback methods
                        }
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
                        std::thread::sleep(Duration::from_millis(2000));
                        if check_backend_health(port) {
                            eprintln!("✅ Backend started from resource directory");
                            return Ok(());
                        } else {
                            eprintln!("⚠️ Backend process started but not responding");
                        }
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
                            std::thread::sleep(Duration::from_millis(2000));
                            if check_backend_health(port) {
                                eprintln!("✅ Backend started from exe directory");
                                return Ok(());
                            } else {
                                eprintln!("⚠️ Backend process started but not responding");
                            }
                        }
                    } else {
                        eprintln!("Backend not found in exe directory: {:?}", alt_path);
                    }
                }
            }

            eprintln!("❌ Warning: Could not start backend automatically. Check backend.log for details.");
            eprintln!("The app may not function correctly. Backend should be listening on port {}", port);
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Wallet Tracker application");
}
