// Actualizaciones: busca versiones nuevas en las releases de GitHub (latest.json, firmado), avisa
// en el raíl y con un aviso del sistema, y las instala del tirón (descarga, instala y reinicia).
// Fuera de Tauri (navegador de desarrollo) no hace nada.

import { Modal, Notice } from "obsidian";
import type { Update } from "@tauri-apps/plugin-updater";
import type TareasApp from "./main";
import * as backend from "./backend";

/** La primera búsqueda espera a que la app haya arrancado; luego se repite cada 6 horas. */
const PRIMERA_MS = 8_000;
const CADA_MS = 6 * 60 * 60 * 1000;

export class Actualizador {
  version = "";
  pendiente: Update | null = null;
  private avisadas = new Set<string>();
  private temporizador: number | undefined;
  private alCambiar: (() => void)[] = [];

  constructor(private a: TareasApp) {}

  async iniciar() {
    if (!backend.enTauri) return;
    const { getVersion } = await import("@tauri-apps/api/app");
    this.version = await getVersion();
    this.programar();
  }

  /** Vuelve a programar la búsqueda automática según el ajuste del equipo. */
  programar() {
    window.clearTimeout(this.temporizador);
    window.clearInterval(this.temporizador);
    if (!backend.enTauri || !this.a.equipo.buscarActualizaciones) return;
    this.temporizador = window.setTimeout(() => {
      void this.buscar();
      this.temporizador = window.setInterval(() => void this.buscar(), CADA_MS);
    }, PRIMERA_MS);
  }

  /** Avisa cuando aparece (o se instala) una versión nueva, para pintar el raíl. */
  escuchar(fn: () => void) {
    this.alCambiar.push(fn);
  }

  /**
   * Busca una versión nueva. En la búsqueda automática los errores (sin conexión, GitHub caído)
   * se callan; en la manual se cuentan. Devuelve la actualización o null si ya está al día.
   */
  async buscar(manual = false): Promise<Update | null> {
    if (!backend.enTauri) {
      if (manual) new Notice("Las actualizaciones solo funcionan en la app de escritorio.");
      return null;
    }
    try {
      const { check } = await import("@tauri-apps/plugin-updater");
      const u = await check({ timeout: 20_000 });
      this.pendiente = u;
      for (const fn of this.alCambiar) fn();
      if (u && !this.avisadas.has(u.version)) {
        this.avisadas.add(u.version);
        if (!manual) void backend.notificar("Hay una versión nueva de Check", `Check ${u.version} está lista para instalar. Ábrela y pulsa «Actualizar».`);
      }
      if (manual && !u) new Notice(`Check está al día (versión ${this.version}).`);
      return u;
    } catch (e) {
      if (manual) new Notice(`No se pudo buscar la actualización: ${e}`, 10000);
      return null;
    }
  }

  /** Abre la ventana con las novedades y el botón de actualizar. */
  abrir() {
    if (this.pendiente) new ModalActualizacion(this.pendiente).open();
  }
}

class ModalActualizacion extends Modal {
  private instalando = false;

  constructor(private u: Update) {
    super();
  }

  onOpen() {
    this.modalEl.addClass("pt-modal", "actualizacion-modal");
    this.titleEl.setText(`Check ${this.u.version}`);
    const c = this.contentEl;
    c.createDiv({ cls: "aj-ayuda", text: `Tienes la versión ${this.u.currentVersion}. Al actualizar, Check se descarga, se instala y se vuelve a abrir solo; tus tareas no se tocan.` });
    const notas = (this.u.body ?? "").trim();
    if (notas) {
      c.createDiv({ cls: "aj-titulo", text: "Novedades" });
      c.createDiv({ cls: "actualizacion-notas", text: notas });
    }
    const progreso = c.createDiv({ cls: "actualizacion-progreso oculto", attr: { role: "progressbar", "aria-valuemin": "0", "aria-valuemax": "100" } });
    const barra = progreso.createDiv({ cls: "actualizacion-barra" });
    const estado = c.createDiv({ cls: "aj-ayuda actualizacion-estado", attr: { role: "status" } });

    const botones = c.createDiv({ cls: "modal-button-container" });
    const ok = botones.createEl("button", { cls: "mod-cta", text: "Actualizar y reiniciar" });
    const luego = botones.createEl("button", { text: "Más tarde" });
    luego.addEventListener("click", () => this.close());
    ok.addEventListener("click", async () => {
      this.instalando = true;
      ok.disabled = luego.disabled = true;
      progreso.removeClass("oculto");
      let total = 0;
      let bajado = 0;
      const pintar = (pct: number) => {
        barra.style.width = `${pct}%`;
        progreso.setAttr("aria-valuenow", String(Math.round(pct)));
      };
      try {
        estado.setText("Descargando…");
        await this.u.downloadAndInstall((ev) => {
          if (ev.event === "Started") total = ev.data.contentLength ?? 0;
          else if (ev.event === "Progress") {
            bajado += ev.data.chunkLength;
            if (total) {
              pintar(Math.min(100, (bajado / total) * 100));
              estado.setText(`Descargando… ${(bajado / 1048576).toFixed(1)} de ${(total / 1048576).toFixed(1)} MB`);
            }
          } else if (ev.event === "Finished") {
            pintar(100);
            estado.setText("Instalando…");
          }
        });
        estado.setText("Reiniciando…");
        // En Windows el instalador ya cierra y vuelve a abrir Check; en Linux se reinicia aquí
        const { relaunch } = await import("@tauri-apps/plugin-process");
        await relaunch();
      } catch (e) {
        this.instalando = false;
        ok.disabled = luego.disabled = false;
        progreso.addClass("oculto");
        estado.setText("");
        new Notice(`No se pudo actualizar: ${e}`, 10000);
      }
    });
  }

  close() {
    // A media instalación no se deja cerrar (con Escape o clic fuera)
    if (!this.instalando) super.close();
  }

  onClose() {
    this.contentEl.empty();
  }
}
