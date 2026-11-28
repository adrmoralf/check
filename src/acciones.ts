// Cambios en el archivo: marcar, reprogramar, prioridad, editar, añadir y eliminar.
// Cada cambio relee el archivo, comprueba que la línea no ha cambiado por debajo y se puede deshacer.

import { Notice } from "obsidian";
import type TareasApp from "./main";
import * as backend from "./backend";
import { archivar } from "./core/archivo";
import { TareaIdx, notasDe } from "./core/consultas";
import { ISO, fechaCorta, hoyISO } from "./core/fechas";
import { ResultadoFusion, fusionar } from "./core/fusion";
import { insertarEnSeccion, insertarSubtarea, moverBloque } from "./core/insertar";
import { NuevaTarea, alternarHecha, cambiarFecha, cambiarPrioridad, lineaSiguiente, parsearTarea, reescribirLinea } from "./core/tarea";

interface Cambio {
  linea: number;
  antes: string[];
  despues: string[];
}

const anchoSangria = (s: string) => (s.match(/^\s*/)?.[0] ?? "").replace(/\t/g, "    ").length;

export class Acciones {
  constructor(private a: TareasApp) {}

  get puedeEditarConTasks(): boolean {
    return true;
  }

  /** Sustituye un bloque de líneas desde `t.linea`; `fn` recibe las líneas y devuelve las nuevas. */
  private async cambiar(t: TareaIdx, cuantas: number | ((ls: string[]) => number), fn: (bloque: string[]) => string[] | null): Promise<Cambio | null> {
    const contenido = await this.a.leer();
    const eol = contenido.includes("\r\n") ? "\r\n" : "\n";
    const ls = contenido.split(/\r?\n/);
    if (ls[t.linea] !== t.texto) {
      new Notice("La tarea ha cambiado en el archivo (quizá desde otro PC). Se ha recargado: vuelve a intentarlo.");
      await this.a.recargar(contenido);
      return null;
    }
    const n = typeof cuantas === "number" ? cuantas : cuantas(ls);
    const antes = ls.slice(t.linea, t.linea + n);
    const despues = fn(antes);
    if (!despues || despues.join("\n") === antes.join("\n")) return null;
    ls.splice(t.linea, n, ...despues);
    await this.a.guardar(ls.join(eol));
    return { linea: t.linea, antes, despues };
  }

  private async revertir(c: Cambio) {
    const contenido = await this.a.leer();
    const eol = contenido.includes("\r\n") ? "\r\n" : "\n";
    const ls = contenido.split(/\r?\n/);
    if (ls.slice(c.linea, c.linea + c.despues.length).join("\n") !== c.despues.join("\n")) {
      new Notice("No se puede deshacer: el archivo ha cambiado desde entonces.");
      return;
    }
    ls.splice(c.linea, c.despues.length, ...c.antes);
    await this.a.guardar(ls.join(eol));
  }

  private avisoDeshacer(mensaje: string, cambio: Cambio | null) {
    if (!cambio) return;
    const frag = createFragment((f) => {
      f.createSpan({ text: mensaje });
      const b = f.createEl("button", { cls: "pt-boton-deshacer", text: "Deshacer" });
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        aviso.hide();
        void this.revertir(cambio);
      });
    });
    const aviso = new Notice(frag, 7000);
  }

  /** Marca o desmarca. Si se repite, al terminarla aparece encima la siguiente con su nueva fecha. */
  async alternar(t: TareaIdx) {
    const hoy = hoyISO();
    let siguiente: string | null = null;
    const c = await this.cambiar(t, 1, ([l]) => {
      const hecha = alternarHecha(l, hoy);
      siguiente = !t.hecha && !t.cancelada ? lineaSiguiente(l, hoy) : null;
      return siguiente ? [siguiente, hecha] : [hecha];
    });
    const proxima = siguiente ? parsearTarea(siguiente)?.fecha : null;
    this.avisoDeshacer(t.hecha ? "Tarea reabierta." : `Hecha: ${t.descripcion}${proxima ? ` · la próxima, el ${fechaCorta(proxima)}` : ""}`, c);
  }

  async moverA(t: TareaIdx, fecha: ISO | null) {
    const c = await this.cambiar(t, 1, ([l]) => [cambiarFecha(l, fecha)]);
    this.avisoDeshacer(fecha ? "Fecha cambiada." : "Fecha quitada.", c);
  }

  async prioridad(t: TareaIdx, p: number) {
    const c = await this.cambiar(t, 1, ([l]) => [cambiarPrioridad(l, p)]);
    this.avisoDeshacer("Prioridad cambiada.", c);
  }

  /**
   * Reescribe la línea y, si se pasan, sustituye sus notas (las líneas con sangría de debajo).
   * Con `mover`, además la lleva (con sus subtareas y notas) bajo otra tarea o, si `padre` es
   * null, a la sección indicada como tarea suelta.
   */
  async editar(t: TareaIdx, datos: NuevaTarea, notas?: string[], mover?: { padre: TareaIdx | null; seccion: string }) {
    const bloque = (ls: string[]) => 1 + (notas ? notasDe(ls, t.linea).length : 0);
    const reescribir = ([l]: string[]) => {
      const linea = reescribirLinea(l, datos);
      if (!notas) return [linea];
      const sangria = (l.match(/^\s*/)?.[0] ?? "") + "  ";
      return [linea, ...notas.map((n) => n.trim()).filter(Boolean).map((n) => sangria + n)];
    };
    if (!mover) {
      this.avisoDeshacer("Tarea editada.", await this.cambiar(t, bloque, reescribir));
      return;
    }
    const contenido = await this.a.leer();
    const eol = contenido.includes("\r\n") ? "\r\n" : "\n";
    const antes = contenido.split(/\r?\n/);
    if (antes[t.linea] !== t.texto || (mover.padre && antes[mover.padre.linea] !== mover.padre.texto)) {
      new Notice("La tarea ha cambiado en el archivo (quizá desde otro PC). Se ha recargado: vuelve a intentarlo.");
      await this.a.recargar(contenido);
      return;
    }
    const ls = [...antes];
    const n = bloque(ls);
    ls.splice(t.linea, n, ...reescribir(ls.slice(t.linea, t.linea + n)));
    const r = moverBloque(ls.join(eol), t.linea, mover.padre ? { padre: mover.padre.linea } : { seccion: mover.seccion });
    await this.a.guardar(r.contenido);
    // Deshacer devuelve el archivo entero a como estaba (si nadie lo ha tocado después)
    const despues = r.contenido.split(/\r?\n/);
    this.avisoDeshacer(mover.padre ? `Tarea editada y movida bajo «${mover.padre.descripcion}».` : "Tarea editada y movida.", { linea: 0, antes, despues });
  }

  /** Ruta del archivo de tareas archivadas: junto al principal, «Tareas-archivo.md». */
  rutaArchivo(): string {
    return this.a.equipo.ruta.replace(/(\.md)?$/i, "-archivo.md");
  }

  /** Mueve al archivo las hechas hace más de `dias` días y las canceladas. Devuelve cuántas. */
  async archivar(dias: number, avisar = true): Promise<number> {
    const contenido = await this.a.leer();
    const ruta = this.rutaArchivo();
    const anterior = await backend.leerSiExiste(ruta);
    const origen = this.a.equipo.ruta.split(/[\\/]/).pop() ?? "el archivo";
    const r = archivar(contenido, anterior, hoyISO(), dias, origen);
    if (!r.n) {
      if (avisar) new Notice(`No hay tareas terminadas hace más de ${dias} días ni canceladas.`);
      return 0;
    }
    // Primero el archivo (si falla, no se ha quitado nada del principal)
    await backend.escribirOtro(ruta, r.archivo);
    await this.a.guardar(r.principal);
    if (avisar) new Notice(`${r.n} tarea${r.n === 1 ? "" : "s"} archivada${r.n === 1 ? "" : "s"} en ${ruta.split(/[\\/]/).pop()}.`);
    return r.n;
  }

  /** Junta una copia en conflicto de Drive con el archivo y la retira de la carpeta de Drive. */
  async juntarConflicto(rutaCopia: string): Promise<ResultadoFusion> {
    const copia = await backend.leerArchivo(rutaCopia);
    const r = fusionar(await this.a.leer(), copia);
    if (r.anadidas.length || r.completadas.length) await this.a.guardar(r.contenido);
    await backend.retirarConflicto(rutaCopia);
    return r;
  }

  /** Elimina la tarea y sus subtareas (las líneas con más sangría que siguen). */
  async eliminar(t: TareaIdx) {
    const ls = (await this.a.leer()).split(/\r?\n/);
    const base = anchoSangria(t.texto);
    let n = 1;
    while (t.linea + n < ls.length && ls[t.linea + n].trim() !== "" && anchoSangria(ls[t.linea + n]) > base) n++;
    const c = await this.cambiar(t, n, () => []);
    this.avisoDeshacer(n > 1 ? `Tarea y ${n - 1} subtarea(s) eliminadas.` : "Tarea eliminada.", c);
  }

  async anadir(linea: string, destino: { nota: string; seccion?: string; padre?: TareaIdx; notas?: string[] }) {
    const contenido = await this.a.leer();
    let r;
    if (destino.padre) {
      const ls = contenido.split(/\r?\n/);
      if (ls[destino.padre.linea] !== destino.padre.texto) throw new Error("la tarea principal ha cambiado; vuelve a abrir el formulario");
      r = insertarSubtarea(contenido, linea, destino.padre.linea);
    } else {
      r = insertarEnSeccion(contenido, linea, destino.seccion ?? "Otras tareas");
    }
    if (destino.notas?.length) {
      // Las notas van justo debajo, con un poco más de sangría que la tarea
      const eol = r.contenido.includes("\r\n") ? "\r\n" : "\n";
      const ls = r.contenido.split(/\r?\n/);
      const sangria = (ls[r.linea].match(/^\s*/)?.[0] ?? "") + "  ";
      ls.splice(r.linea + 1, 0, ...destino.notas.map((n) => sangria + n));
      r = { contenido: ls.join(eol), linea: r.linea };
    }
    await this.a.guardar(r.contenido);
    return r.linea;
  }
}
