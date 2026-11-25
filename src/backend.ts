// Acceso al archivo y a los ajustes del equipo. Dentro de Tauri llama a los comandos de Rust;
// en un navegador normal (solo para desarrollo) usa un archivo en memoria.

import { invoke } from "@tauri-apps/api/core";

export interface Marca {
  existe: boolean;
  modificado: number;
  tam: number;
}

export const enTauri = "__TAURI_INTERNALS__" in window;

// ---------------------------------------------------------------- modo navegador (desarrollo)
const memoria = { archivo: "", config: "{}", modificado: 0 };
let semilla: Promise<void> | null = null;
function sembrar() {
  semilla ??= (async () => {
    if (import.meta.env.DEV) {
      const demo = await import("../tests/datos/demo.md?raw").catch(() => ({ default: "" }));
      memoria.archivo = demo.default;
      // En desarrollo, ?pestana=calendario abre directamente esa pestaña (para revisar la interfaz)
      const pestana = new URLSearchParams(location.search).get("pestana") ?? "inicio";
      const tema = new URLSearchParams(location.search).get("tema") ?? "auto";
      memoria.config = JSON.stringify({ ruta: "demo/tareas.md", pestanaInicial: pestana, inicioPrincipal: true, tema });
      memoria.modificado = Date.now();
    }
  })();
  return semilla;
}

export async function leerConfig(): Promise<string> {
  if (enTauri) return invoke<string>("leer_config");
  await sembrar();
  return memoria.config;
}

export async function guardarConfig(json: string): Promise<void> {
  if (enTauri) return invoke("guardar_config", { json });
  memoria.config = json;
}

export async function leerArchivo(ruta: string): Promise<string> {
  if (enTauri) return invoke<string>("leer_archivo", { ruta });
  await sembrar();
  return memoria.archivo;
}

export async function escribirArchivo(ruta: string, contenido: string): Promise<void> {
  if (enTauri) return invoke("escribir_archivo", { ruta, contenido });
  memoria.archivo = contenido;
  memoria.modificado = Date.now();
}

export async function marcaArchivo(ruta: string): Promise<Marca> {
  if (enTauri) return invoke<Marca>("marca_archivo", { ruta });
  return { existe: true, modificado: memoria.modificado, tam: memoria.archivo.length };
}

export async function carpetaCopias(): Promise<string> {
  return enTauri ? invoke<string>("carpeta_copias") : "(navegador)";
}

export async function elegirArchivo(): Promise<string | null> {
  if (!enTauri) return null;
  const { open } = await import("@tauri-apps/plugin-dialog");
  const r = await open({ multiple: false, directory: false, filters: [{ name: "Markdown", extensions: ["md"] }] });
  return typeof r === "string" ? r : null;
}

export async function elegirNuevo(): Promise<string | null> {
  if (!enTauri) return null;
  const { save } = await import("@tauri-apps/plugin-dialog");
  return save({ defaultPath: "tareas.md", filters: [{ name: "Markdown", extensions: ["md"] }] });
}

export async function abrirConSistema(ruta: string): Promise<void> {
  if (!enTauri) return;
  const { openPath } = await import("@tauri-apps/plugin-opener");
  await openPath(ruta);
}

export async function ponerTitulo(t: string): Promise<void> {
  document.title = t;
  if (!enTauri) return;
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  await getCurrentWindow().setTitle(t);
}

// ---------------------------------------------------------------- conflictos de Drive

export async function buscarConflictos(ruta: string): Promise<string[]> {
  return enTauri ? invoke<string[]>("buscar_conflictos", { ruta }) : [];
}

/** Saca la copia en conflicto de Drive a la carpeta local de la app; devuelve dónde ha quedado. */
export async function retirarConflicto(ruta: string): Promise<string> {
  return enTauri ? invoke<string>("retirar_conflicto", { ruta }) : ruta;
}

/** Lee un archivo que puede no existir (p. ej. el archivo de tareas archivadas). */
export async function leerSiExiste(ruta: string): Promise<string | null> {
  if (!enTauri) return memoriaExtra.get(ruta) ?? null;
  const m = await marcaArchivo(ruta);
  return m.existe ? leerArchivo(ruta) : null;
}

const memoriaExtra = new Map<string, string>();
export async function escribirOtro(ruta: string, contenido: string): Promise<void> {
  if (enTauri) return invoke("escribir_archivo", { ruta, contenido });
  memoriaExtra.set(ruta, contenido);
}

// ---------------------------------------------------------------- bandeja, ventana y sistema

export async function configBandeja(cerrarABandeja: boolean): Promise<void> {
  if (enTauri) await invoke("config_bandeja", { cerrarABandeja });
}

export async function actualizarBandeja(texto: string, png?: Uint8Array): Promise<void> {
  if (enTauri) await invoke("actualizar_bandeja", { texto, png: png ? Array.from(png) : null });
}

export async function salir(): Promise<void> {
  if (enTauri) await invoke("salir");
}

export async function escuchar(evento: string, fn: () => void): Promise<void> {
  if (!enTauri) return;
  const { listen } = await import("@tauri-apps/api/event");
  await listen(evento, fn);
}

export async function mostrarVentana(): Promise<void> {
  if (!enTauri) return;
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  const w = getCurrentWindow();
  await w.show();
  await w.unminimize();
  await w.setFocus();
}

export async function notificar(titulo: string, cuerpo: string): Promise<boolean> {
  if (!enTauri) {
    console.log(`[aviso] ${titulo}: ${cuerpo}`);
    return true;
  }
  const n = await import("@tauri-apps/plugin-notification");
  let ok = await n.isPermissionGranted();
  if (!ok) ok = (await n.requestPermission()) === "granted";
  if (ok) n.sendNotification({ title: titulo, body: cuerpo });
  return ok;
}

/** Registra el atajo global (quitando el anterior). Devuelve un error legible si no se puede. */
export async function registrarAtajo(atajo: string, fn: () => void): Promise<string | null> {
  if (!enTauri) return null;
  const g = await import("@tauri-apps/plugin-global-shortcut");
  await g.unregisterAll().catch(() => {});
  if (!atajo) return null;
  try {
    await g.register(atajo, (e) => {
      if (e.state === "Pressed") fn();
    });
    return null;
  } catch (e) {
    return `No se pudo usar el atajo ${atajo}: ${e}`;
  }
}

export async function arranqueConSistema(): Promise<boolean> {
  if (!enTauri) return false;
  const a = await import("@tauri-apps/plugin-autostart");
  return a.isEnabled();
}

export async function cambiarArranque(activar: boolean): Promise<void> {
  if (!enTauri) return;
  const a = await import("@tauri-apps/plugin-autostart");
  if (activar) await a.enable();
  else await a.disable();
}

export async function abrirUrl(url: string): Promise<void> {
  if (!enTauri) {
    window.open(url, "_blank");
    return;
  }
  const { openUrl } = await import("@tauri-apps/plugin-opener");
  await openUrl(url);
}
