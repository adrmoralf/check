// Ventana para las copias en conflicto de Drive («Tareas (1).md»): enseña qué traen de distinto y
// permite juntarlas con el archivo, descartarlas o abrirlas para mirarlas.

import { Modal, Notice } from "obsidian";
import type TareasApp from "../main";
import * as backend from "../backend";
import { fusionar } from "../core/fusion";

export class ModalConflictos extends Modal {
  constructor(private a: TareasApp, private rutas: string[], private alTerminar: () => void) {
    super();
  }

  async onOpen() {
    this.modalEl.addClass("pt-modal", "conflictos-modal");
    this.titleEl.setText("Copias en conflicto de Drive");
    const c = this.contentEl;
    c.createDiv({
      cls: "aj-ayuda",
      text: "Drive ha guardado otra versión del archivo, normalmente porque se editó en dos PC a la vez. Juntar añade las tareas que solo están en la copia y marca como hechas las que allí lo están; la copia se guarda después en la carpeta local de Check, por si acaso.",
    });
    const actual = await this.a.leer();
    for (const ruta of this.rutas) {
      const caja = c.createDiv({ cls: "conflicto" });
      caja.createDiv({ cls: "aj-ruta", text: ruta.split(/[\\/]/).pop() ?? ruta });
      let copia: string;
      try {
        copia = await backend.leerArchivo(ruta);
      } catch (e) {
        caja.createDiv({ cls: "aj-errores", text: `No se puede leer: ${e}` });
        continue;
      }
      const r = fusionar(actual, copia);
      const resumen = caja.createEl("ul", { cls: "conflicto-resumen" });
      const item = (n: number, texto: string, nombres: string[]) => {
        const li = resumen.createEl("li", { text: `${n} ${texto}` });
        if (nombres.length) li.setAttr("title", nombres.join("\n"));
      };
      item(r.anadidas.length, r.anadidas.length === 1 ? "tarea que solo está en la copia (se añade)" : "tareas que solo están en la copia (se añaden)", r.anadidas);
      item(r.completadas.length, r.completadas.length === 1 ? "hecha en la copia (se marca)" : "hechas en la copia (se marcan)", r.completadas);
      if (r.distintas.length) item(r.distintas.length, "con fecha o prioridad distinta (se queda la del archivo; míralas en la copia)", r.distintas);
      const botones = caja.createDiv({ cls: "modal-button-container" });
      const juntar = botones.createEl("button", { cls: "mod-cta", text: r.anadidas.length || r.completadas.length ? "Juntar" : "Quitar (no trae nada nuevo)" });
      juntar.addEventListener("click", async () => {
        try {
          const hecho = await this.a.acciones.juntarConflicto(ruta);
          new Notice(`Copia juntada: ${hecho.anadidas.length} añadidas, ${hecho.completadas.length} marcadas como hechas.`);
          this.quitar(ruta, caja);
        } catch (e) {
          new Notice(`No se pudo juntar: ${e}`);
        }
      });
      const descartar = botones.createEl("button", { text: "Descartar la copia" });
      descartar.addEventListener("click", async () => {
        try {
          const donde = await backend.retirarConflicto(ruta);
          new Notice(`Copia descartada. Se ha guardado en ${donde}`);
          this.quitar(ruta, caja);
        } catch (e) {
          new Notice(`No se pudo quitar: ${e}`);
        }
      });
      botones.createEl("button", { text: "Abrir la copia" }).addEventListener("click", () => void backend.abrirConSistema(ruta));
    }
  }

  private quitar(ruta: string, caja: HTMLElement) {
    this.rutas = this.rutas.filter((r) => r !== ruta);
    caja.remove();
    if (!this.rutas.length) this.close();
  }

  onClose() {
    this.contentEl.empty();
    this.alTerminar();
  }
}
