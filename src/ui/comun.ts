// Piezas que comparten varias pestañas: cabecera de documento, títulos de sección, barra de
// avance y la lista de clases del día.

import type PanelTareasPlugin from "../main";
import { Clase } from "../core/curso";
import { ISO, hoyISO } from "../core/fechas";

/**
 * Cabecera de documento de una pestaña: título grande a la izquierda y, a la derecha, los datos
 * del documento (curso, semana, cifras) en líneas cortas. Devuelve la zona de la derecha.
 */
export function cabeceraDoc(el: HTMLElement, titulo: string, datos: string[] = []): HTMLElement {
  el.empty();
  el.createEl("h1", { cls: "hoja-titulo", text: titulo });
  const der = el.createDiv({ cls: "hoja-datos" });
  for (const d of datos) der.createDiv({ text: d });
  return der;
}

export function titulo(el: HTMLElement, texto: string, extra?: string): HTMLElement {
  const t = el.createEl("h2", { cls: "seccion" });
  t.createSpan({ text: texto });
  if (extra) t.createSpan({ cls: "seccion-n", text: extra });
  return t;
}

export function barra(el: HTMLElement, fraccion: number, color?: string): HTMLElement {
  const v = Math.round(Math.min(1, Math.max(0, fraccion)) * 100);
  const b = el.createDiv({ cls: "barra-avance", attr: { role: "progressbar", "aria-valuenow": String(v), "aria-valuemin": "0", "aria-valuemax": "100" } });
  if (color) b.style.setProperty("--tarea-color", color);
  b.createDiv({ cls: "barra-avance-relleno" }).style.width = `${v}%`;
  return b;
}

function minutos(h: string): number {
  const [hh, mm] = h.split(":").map(Number);
  return hh * 60 + mm;
}

/** Clases de un día; si es hoy marca la que está en curso y las que ya terminaron. */
export function listaClases(p: PanelTareasPlugin, el: HTMLElement, clases: Clase[], dia: ISO) {
  const l = el.createDiv({ cls: "clases" });
  const esHoy = dia === hoyISO();
  const ahora = new Date();
  const min = ahora.getHours() * 60 + ahora.getMinutes();
  for (const c of clases) {
    const f = l.createDiv({ cls: "clase" });
    f.style.setProperty("--tarea-color", p.color(c.tag));
    if (esHoy && min >= minutos(c.fin)) f.addClass("clase-pasada");
    if (esHoy && min >= minutos(c.inicio) && min < minutos(c.fin)) f.addClass("clase-ahora");
    f.createSpan({ cls: "clase-hora", text: c.inicio });
    f.createSpan({ cls: "clase-tag", text: c.tag });
    f.createSpan({ cls: "clase-aula", text: c.aula ?? "" });
    f.setAttr("title", `${p.asignatura(c.tag)?.nombre ?? c.tag} · ${c.inicio}–${c.fin}${c.aula ? ` · ${c.aula}` : ""}`);
  }
  return l;
}
