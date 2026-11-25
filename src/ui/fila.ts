// Fila de tarea en la tabla oficial: casilla · fecha · asignatura · tarea · plazo.
// El estado se sella (HECHO, ATRASADA, ANULADA) en vez de hacer desaparecer la tarea.
// Clic para abrirla, clic derecho para el menú y arrastrar para cambiarla de día.

import { setIcon } from "obsidian";
import type PanelTareasPlugin from "../main";
import { TareaIdx, clave, subtareas } from "../core/consultas";
import { DIAS_CORTOS, ISO, diaSemana, diasEntre } from "../core/fechas";
import { describirRegla, textoPlano } from "../core/tarea";
import { abrirUrl } from "../backend";
import { menuTarea } from "./menu";

const MIME = "text/x-panel-tareas";

export interface OpcionesFila {
  hoy: ISO;
  /** Mostrar la fecha en su columna (en Calendario el día ya se sabe) */
  mostrarFecha?: boolean;
  todas: TareaIdx[];
}

// El golpe del sello: la tarea recién marcada se estampa al repintarse (la fila es nueva tras guardar)
let recienSellada: { k: string; t: number } | null = null;
const identidad = (t: { descripcion: string; tags: string[] }) => `${t.descripcion}|${t.tags.join(",")}`;

/** Etiqueta de asignatura: recuadro con borde en su color. */
export function pastillaTag(p: PanelTareasPlugin, el: HTMLElement, tag: string): HTMLElement {
  const s = el.createSpan({ cls: "etiqueta-asig", text: tag });
  s.style.setProperty("--tarea-color", p.color(tag));
  const nombre = p.asignatura(tag)?.nombre;
  if (nombre) s.setAttr("title", nombre);
  return s;
}

/** Fecha corta para la columna: «mié 25». */
export function fechaColumna(fecha: ISO): string {
  return `${DIAS_CORTOS[diaSemana(fecha)]} ${Number(fecha.slice(8))}`;
}

/** Plazo legible: «hoy 18:00», «mañana», «en 3 días», «hace 2 días». */
export function plazo(fecha: ISO, hoy: ISO, hora?: string | null): string {
  const d = diasEntre(hoy, fecha);
  const h = hora ? ` ${hora}` : "";
  if (d === 0) return `hoy${h}`;
  if (d === 1) return `mañana${h}`;
  if (d === -1) return "ayer";
  if (d < 0) return `hace ${-d} días`;
  if (d < 7) return `en ${d} días`;
  return `en ${d} días`;
}

/** Sello de caucho: HECHO, ATRASADA, ANULADA, EXAMEN… */
export function sello(el: HTMLElement, texto: string, tipo: "azul" | "rojo" | "gris" | "ambar" = "azul"): HTMLElement {
  return el.createSpan({ cls: `sello sello-${tipo}`, text: texto });
}

function icono(el: HTMLElement, nombre: string, texto: string, etiqueta?: string): HTMLElement {
  const s = el.createSpan({ cls: "meta-item" });
  setIcon(s.createSpan({ cls: "meta-icono" }), nombre);
  s.createSpan({ text: texto });
  if (etiqueta) s.setAttr("title", etiqueta);
  return s;
}

export function fila(p: PanelTareasPlugin, el: HTMLElement, t: TareaIdx, o: OpcionesFila): HTMLElement {
  const f = el.createDiv({ cls: "fila", attr: { tabindex: "0", draggable: "true", role: "row" } });
  f.style.setProperty("--tarea-color", p.color(t.tags[0]));
  if (t.hecha) f.addClass("fila-hecha");
  if (t.cancelada) f.addClass("fila-anulada");
  if (t.padre !== null) f.addClass("fila-sub");
  const atrasada = !t.hecha && !t.cancelada && t.fecha !== null && t.fecha < o.hoy;
  if (atrasada) f.addClass("fila-atrasada");

  // Casilla
  const check = f.createEl("button", {
    cls: "casilla",
    attr: { type: "button", role: "checkbox", "aria-checked": String(t.hecha), "aria-label": t.hecha ? "Reabrir la tarea" : "Marcar como hecha" },
  });
  if (t.hecha) setIcon(check, "check");
  check.addEventListener("click", (e) => {
    e.stopPropagation();
    if (!t.hecha) recienSellada = { k: identidad(t), t: Date.now() };
    check.addClass("casilla-pulsada");
    void p.acciones.alternar(t);
  });

  // Fecha
  f.createSpan({ cls: "col-fecha", text: t.fecha && o.mostrarFecha !== false ? fechaColumna(t.fecha) : t.fecha ? "" : "—" });

  // Asignatura
  const asig = f.createSpan({ cls: "col-asig" });
  if (t.tags[0]) pastillaTag(p, asig, t.tags[0]);

  // Tarea y sus datos
  const cuerpo = f.createDiv({ cls: "col-tarea" });
  cuerpo.createDiv({ cls: "fila-desc", text: t.descripcion || "(sin descripción)" });
  const meta = cuerpo.createDiv({ cls: "fila-meta" });
  for (const tag of t.tags.slice(1)) pastillaTag(p, meta, tag);
  if (t.prioridad >= 3) {
    const nombre = t.prioridad === 5 ? "máxima" : t.prioridad === 4 ? "alta" : "media";
    icono(meta, t.prioridad >= 4 ? "chevrons-up" : "chevron-up", nombre, `Prioridad ${nombre}`).addClass(`prio-${t.prioridad}`);
  }
  if (t.repetir) icono(meta, "repeat", describirRegla(t.repetir), "Se repite");
  const hijos = subtareas(o.todas, t);
  if (hijos.length) icono(meta, "list-checks", `${hijos.filter((h) => h.hecha).length}/${hijos.length}`, "Subtareas hechas");
  if (t.notas.length) {
    const b = meta.createEl("button", { cls: "meta-item meta-boton", attr: { type: "button", "aria-expanded": "false" } });
    setIcon(b.createSpan({ cls: "meta-icono" }), "sticky-note");
    b.createSpan({ text: t.notas.length === 1 ? "1 nota" : `${t.notas.length} notas` });
    b.addEventListener("click", (e) => {
      e.stopPropagation();
      const abiertas = cuerpo.querySelector(".notas");
      b.setAttr("aria-expanded", String(!abiertas));
      if (abiertas) abiertas.remove();
      else pintarNotas(cuerpo, t.notas);
    });
  }

  // Plazo o sello
  const col = f.createSpan({ cls: "col-plazo" });
  if (t.hecha) {
    const s = sello(col, "HECHO", "azul");
    if (recienSellada && recienSellada.k === identidad(t) && Date.now() - recienSellada.t < 4000) {
      s.addClass("sello-golpe");
      recienSellada = null;
    }
  } else if (t.cancelada) sello(col, "ANULADA", "gris");
  else if (atrasada) {
    sello(col, "ATRASADA", "rojo");
    col.createSpan({ cls: "plazo-nota", text: plazo(t.fecha!, o.hoy) });
  } else if (t.fecha) {
    const d = diasEntre(o.hoy, t.fecha);
    col.createSpan({ cls: `plazo${d <= 1 ? " plazo-pronto" : ""}`, text: plazo(t.fecha, o.hoy, t.hora) });
  } else col.createSpan({ cls: "plazo plazo-sin", text: "sin fecha" });

  f.addEventListener("click", () => void p.abrirTarea(t));
  f.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    menuTarea(p, t, e);
  });
  f.addEventListener("keydown", (e) => {
    if (e.target !== f) return;
    if (e.key === "Enter") void p.abrirTarea(t);
    if (e.key === " ") {
      e.preventDefault();
      if (!t.hecha) recienSellada = { k: identidad(t), t: Date.now() };
      void p.acciones.alternar(t);
    }
  });
  f.addEventListener("dragstart", (e) => {
    e.dataTransfer?.setData(MIME, clave(t));
    if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
    f.addClass("fila-arrastrando");
  });
  f.addEventListener("dragend", () => f.removeClass("fila-arrastrando"));
  return f;
}

const RE_URL = /(https?:\/\/[^\s)>\]]+)|\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;

/** Notas de una tarea, con los enlaces web clicables (se abren en el navegador). */
export function pintarNotas(el: HTMLElement, notas: string[]) {
  const caja = el.createDiv({ cls: "notas" });
  for (const n of notas) {
    const linea = caja.createDiv({ cls: "nota" });
    let ultimo = 0;
    for (const m of n.matchAll(RE_URL)) {
      if (m.index! > ultimo) linea.append(textoPlano(n.slice(ultimo, m.index)));
      const url = m[1] ?? m[3];
      const a = linea.createEl("a", { text: m[2] ?? url, attr: { href: url } });
      a.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        void abrirUrl(url);
      });
      ultimo = m.index! + m[0].length;
    }
    if (ultimo < n.length) linea.append(textoPlano(n.slice(ultimo)));
  }
  caja.addEventListener("click", (e) => e.stopPropagation());
}

/** Convierte `el` en un sitio donde soltar tareas para pasarlas a `fecha`. */
export function zonaSoltar(p: PanelTareasPlugin, el: HTMLElement, fecha: ISO) {
  el.addEventListener("dragover", (e) => {
    if (!e.dataTransfer?.types.includes(MIME)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    el.addClass("soltar-encima");
  });
  el.addEventListener("dragleave", (e) => {
    if (!el.contains(e.relatedTarget as Node | null)) el.removeClass("soltar-encima");
  });
  el.addEventListener("drop", (e) => {
    el.removeClass("soltar-encima");
    const k = e.dataTransfer?.getData(MIME);
    if (!k) return;
    e.preventDefault();
    const t = p.almacen.buscar(k);
    if (t && t.fecha !== fecha) void p.acciones.moverA(t, fecha);
  });
}

/** Cabecera de columnas de la tabla. */
export function cabeceraTabla(el: HTMLElement) {
  const c = el.createDiv({ cls: "fila fila-cabecera", attr: { role: "row", "aria-hidden": "true" } });
  c.createSpan();
  c.createSpan({ text: "Fecha" });
  c.createSpan({ text: "Asig." });
  c.createSpan({ text: "Tarea" });
  c.createSpan({ cls: "col-plazo", text: "Plazo" });
}

/** Grupo de filas con su rótulo (Atrasadas, Hoy…) dentro de una tabla. */
export function grupo(el: HTMLElement, nombre: string, n?: number): HTMLElement {
  const g = el.createDiv({ cls: "grupo", attr: { role: "rowgroup" } });
  const r = g.createDiv({ cls: "grupo-rotulo" });
  r.createSpan({ text: nombre });
  if (n !== undefined) r.createSpan({ cls: "grupo-n", text: String(n) });
  return g;
}

export function lista(p: PanelTareasPlugin, el: HTMLElement, ts: TareaIdx[], o: OpcionesFila, vacio?: string) {
  const l = el.createDiv({ cls: "tabla", attr: { role: "table" } });
  if (!ts.length && vacio) l.createDiv({ cls: "tabla-vacia", text: vacio });
  for (const t of ts) fila(p, l, t, o);
  return l;
}
