// Check: Rust lee y escribe el archivo de tareas (con copia local de la versión anterior antes de
// cada escritura), guarda los ajustes de este equipo, busca copias en conflicto de Drive y
// gestiona el icono de la bandeja del sistema (que mantiene la app abierta para los avisos).
// Las actualizaciones (plugins updater y process) se buscan e instalan desde src/actualizador.ts.

use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::UNIX_EPOCH;

use serde::Serialize;
use tauri::image::Image;
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, Manager, WindowEvent};

/// Si cerrar la ventana la esconde en la bandeja (true) o cierra la app.
struct Estado {
    cerrar_a_bandeja: AtomicBool,
}

const ID_BANDEJA: &str = "principal";

const COPIAS_MAXIMAS: usize = 30;

fn err<E: std::fmt::Display>(e: E) -> String {
    e.to_string()
}

fn dir_config(app: &AppHandle) -> Result<PathBuf, String> {
    let d = app.path().app_config_dir().map_err(err)?;
    fs::create_dir_all(&d).map_err(err)?;
    Ok(d)
}

#[tauri::command]
fn leer_config(app: AppHandle) -> Result<String, String> {
    let f = dir_config(&app)?.join("ajustes.json");
    Ok(fs::read_to_string(f).unwrap_or_else(|_| "{}".into()))
}

#[tauri::command]
fn guardar_config(app: AppHandle, json: String) -> Result<(), String> {
    fs::write(dir_config(&app)?.join("ajustes.json"), json).map_err(err)
}

#[tauri::command]
fn leer_archivo(ruta: String) -> Result<String, String> {
    fs::read_to_string(&ruta).map_err(|e| format!("No se pudo leer {ruta}: {e}"))
}

/// Guarda una copia de la versión anterior en la carpeta local de la app (no en Drive).
fn copia_anterior(app: &AppHandle, ruta: &Path) -> Result<(), String> {
    if !ruta.exists() {
        return Ok(());
    }
    let dir = app.path().app_data_dir().map_err(err)?.join("copias");
    fs::create_dir_all(&dir).map_err(err)?;
    let sello = std::time::SystemTime::now().duration_since(UNIX_EPOCH).map_err(err)?.as_millis();
    fs::copy(ruta, dir.join(format!("tareas-{sello}.md"))).map_err(err)?;
    let mut copias: Vec<_> = fs::read_dir(&dir).map_err(err)?.filter_map(|e| e.ok()).map(|e| e.path()).collect();
    copias.sort();
    while copias.len() > COPIAS_MAXIMAS {
        let _ = fs::remove_file(copias.remove(0));
    }
    Ok(())
}

/// Escritura segura: primero a un temporal junto al archivo y luego se sustituye.
#[tauri::command]
fn escribir_archivo(app: AppHandle, ruta: String, contenido: String) -> Result<(), String> {
    let destino = PathBuf::from(&ruta);
    copia_anterior(&app, &destino)?;
    let tmp = destino.with_extension("md.tmp");
    {
        let mut f = fs::File::create(&tmp).map_err(|e| format!("No se pudo escribir {}: {e}", tmp.display()))?;
        f.write_all(contenido.as_bytes()).map_err(err)?;
        f.sync_all().map_err(err)?;
    }
    if let Err(e) = fs::rename(&tmp, &destino) {
        // Algunas unidades de red no permiten sustituir con rename: se escribe directamente
        let _ = fs::remove_file(&tmp);
        fs::write(&destino, contenido.as_bytes()).map_err(|e2| format!("No se pudo guardar {ruta}: {e} / {e2}"))?;
    }
    Ok(())
}

#[derive(Serialize)]
struct Marca {
    existe: bool,
    modificado: u128,
    tam: u64,
}

/// Fecha de modificación y tamaño, para detectar cambios hechos fuera de la app (Drive, IA, Obsidian).
#[tauri::command]
fn marca_archivo(ruta: String) -> Marca {
    match fs::metadata(&ruta) {
        Ok(m) => Marca {
            existe: true,
            modificado: m.modified().ok().and_then(|t| t.duration_since(UNIX_EPOCH).ok()).map(|d| d.as_millis()).unwrap_or(0),
            tam: m.len(),
        },
        Err(_) => Marca { existe: false, modificado: 0, tam: 0 },
    }
}

#[tauri::command]
fn carpeta_copias(app: AppHandle) -> Result<String, String> {
    Ok(app.path().app_data_dir().map_err(err)?.join("copias").display().to_string())
}

// ---------------------------------------------------------------- conflictos de Drive

/// ¿Es `nombre` una copia en conflicto de `original`? Drive las llama «Tareas (1).md»; otros
/// sincronizadores, «Tareas_conflict-…» o «Tareas (conflicto …)».
fn es_conflicto(original: &str, nombre: &str) -> bool {
    let (Some(base), Some(resto)) = (original.strip_suffix(".md"), nombre.strip_suffix(".md")) else {
        return false;
    };
    let Some(extra) = resto.strip_prefix(base) else { return false };
    let extra = extra.to_lowercase();
    !extra.is_empty() && (extra.starts_with(" (") || extra.contains("conflict") || extra.contains("conflicto"))
}

#[tauri::command]
fn buscar_conflictos(ruta: String) -> Vec<String> {
    let ruta = PathBuf::from(ruta);
    let (Some(dir), Some(nombre)) = (ruta.parent(), ruta.file_name().and_then(|n| n.to_str())) else {
        return vec![];
    };
    let Ok(entradas) = fs::read_dir(dir) else { return vec![] };
    let mut res: Vec<String> = entradas
        .filter_map(|e| e.ok())
        .filter(|e| e.file_name().to_str().is_some_and(|n| es_conflicto(nombre, n)))
        .map(|e| e.path().display().to_string())
        .collect();
    res.sort();
    res
}

/// Saca la copia en conflicto de Drive y la guarda en la carpeta local de la app.
#[tauri::command]
fn retirar_conflicto(app: AppHandle, ruta: String) -> Result<String, String> {
    let origen = PathBuf::from(&ruta);
    let dir = app.path().app_data_dir().map_err(err)?.join("conflictos");
    fs::create_dir_all(&dir).map_err(err)?;
    let sello = std::time::SystemTime::now().duration_since(UNIX_EPOCH).map_err(err)?.as_millis();
    let nombre = origen.file_name().and_then(|n| n.to_str()).unwrap_or("copia.md");
    let destino = dir.join(format!("{sello}-{nombre}"));
    // rename no funciona entre unidades (G: → C:): se copia y se borra
    if fs::rename(&origen, &destino).is_err() {
        fs::copy(&origen, &destino).map_err(|e| format!("No se pudo copiar {ruta}: {e}"))?;
        fs::remove_file(&origen).map_err(|e| format!("No se pudo quitar {ruta}: {e}"))?;
    }
    Ok(destino.display().to_string())
}

// ---------------------------------------------------------------- bandeja y ventana

fn mostrar(app: &AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.show();
        let _ = w.unminimize();
        let _ = w.set_focus();
    }
}

#[tauri::command]
fn config_bandeja(estado: tauri::State<Estado>, cerrar_a_bandeja: bool) {
    estado.cerrar_a_bandeja.store(cerrar_a_bandeja, Ordering::Relaxed);
}

/// Texto al pasar el ratón y, si se manda, el icono con el número de tareas (PNG).
#[tauri::command]
fn actualizar_bandeja(app: AppHandle, texto: String, png: Option<Vec<u8>>) -> Result<(), String> {
    let Some(t) = app.tray_by_id(ID_BANDEJA) else { return Ok(()) };
    t.set_tooltip(Some(texto)).map_err(err)?;
    if let Some(b) = png {
        t.set_icon(Some(Image::from_bytes(&b).map_err(err)?)).map_err(err)?;
    }
    Ok(())
}

#[tauri::command]
fn salir(app: AppHandle) {
    app.exit(0);
}

fn crear_bandeja(app: &tauri::App) -> tauri::Result<()> {
    let abrir = MenuItem::with_id(app, "abrir", "Abrir Check", true, None::<&str>)?;
    let nueva = MenuItem::with_id(app, "nueva", "Nueva tarea…", true, None::<&str>)?;
    let separador = PredefinedMenuItem::separator(app)?;
    let salir = MenuItem::with_id(app, "salir", "Salir", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&abrir, &nueva, &separador, &salir])?;
    let mut b = TrayIconBuilder::with_id(ID_BANDEJA)
        .tooltip("Check")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, e| match e.id.as_ref() {
            "abrir" => mostrar(app),
            "nueva" => {
                mostrar(app);
                let _ = app.emit("nueva-tarea", ());
            }
            "salir" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|t, e| {
            if let TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } = e {
                mostrar(t.app_handle());
            }
        });
    if let Some(icono) = app.default_window_icon() {
        b = b.icon(icono.clone());
    }
    b.build(app)?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Una sola instancia: abrir Check otra vez trae al frente la que ya está (quizá en la bandeja)
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| mostrar(app)))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_autostart::init(tauri_plugin_autostart::MacosLauncher::LaunchAgent, Some(vec!["--oculto"])))
        .manage(Estado { cerrar_a_bandeja: AtomicBool::new(true) })
        .setup(|app| {
            crear_bandeja(app)?;
            // Al arrancar con el sistema se queda en la bandeja; si no, se enseña la ventana
            if !std::env::args().any(|a| a == "--oculto") {
                mostrar(app.handle());
            }
            Ok(())
        })
        .on_window_event(|w, e| {
            if let WindowEvent::CloseRequested { api, .. } = e {
                if w.state::<Estado>().cerrar_a_bandeja.load(Ordering::Relaxed) {
                    api.prevent_close();
                    let _ = w.hide();
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            leer_config,
            guardar_config,
            leer_archivo,
            escribir_archivo,
            marca_archivo,
            carpeta_copias,
            buscar_conflictos,
            retirar_conflicto,
            config_bandeja,
            actualizar_bandeja,
            salir
        ])
        .run(tauri::generate_context!())
        .expect("error al arrancar Check");
}
