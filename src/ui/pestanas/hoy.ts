// Pestaña Hoy: la hoja del día. Cabecera con la fecha, el curso y las clases; tabla con atrasadas,
// hoy, mañana, hechas hoy (selladas) y sin fecha; y al lado la línea de próximas entregas.

import { Contexto } from "../panel";
import type PanelTareasPlugin from "../../main";
import { TareaIdx, ordenar, pendiente, resumen } from "../../core/consultas";
import { clasesDelDia, noLectivoDe, periodoDe } from "../../core/curso";
import { tipoDe } from "../../core/entregas";
import { ISO, diasEntre, fechaCorta, fechaLarga, lunesDe, sumarDias } from "../../core/fechas";
import { cabeceraTabla, grupo, fila, pastillaTag } from "../fila";
import { cabeceraDoc, listaClases, titulo } from "../comun";

/** «1.er cuatrimestre · semana 8 de 19», o null fuera del curso. */
export function datoCurso(p: PanelTareasPlugin, hoy: ISO): string | null {
  const c = p.cuatriActual(hoy);
  if (!c) return null;
  const per = periodoDe(c, p.ajustes.c1, p.ajustes.c2);
  const total = Math.floor(diasEntre(lunesDe(per.inicio), per.finExamenes) / 7) + 1;
  const n = Math.min(total, Math.max(1, Math.floor(diasEntre(lunesDe(per.inicio), hoy) / 7) + 1));
  return `${c === 1 ? "1.er" : "2.º"} cuatrimestre · semana ${n} de ${total}`;
}

export function pintarHoy(ctx: Contexto, el: HTMLElement) {
  const { p, hoy, tareas, todas } = ctx;
  const r = resumen(tareas, hoy);
  const o = { hoy, todas };
  const manana = sumarDias(hoy, 1);
  const deManana = ordenar(tareas.filter((t) => pendiente(t) && t.fecha === manana));
  const hechasHoy = tareas.filter((t) => t.hecha && t.hechaEl === hoy);

  // Cabecera de documento
  const fecha = fechaLarga(hoy);
  const datos = [datoCurso(p, hoy)].filter((x): x is string => !!x);
  const der = cabeceraDoc(ctx.cabecera, fecha.charAt(0).toUpperCase() + fecha.slice(1), datos);
  if (p.ajustes.mostrarClases) {
    const noLectivo = noLectivoDe(hoy, p.curso.noLectivos);
    const clases = clasesDelDia(hoy, p.curso.clases, p.ajustes.c1, p.ajustes.c2, p.curso.noLectivos);
    if (noLectivo) der.createDiv({ cls: "hoja-dato-suave", text: `${noLectivo.nombre}: no lectivo` });
    else if (clases.length) listaClases(p, der, clases, hoy);
    else der.createDiv({ cls: "hoja-dato-suave", text: "Hoy no hay clase" });
  }

  const cuerpo = el.createDiv({ cls: "hoy" });
  const principal = cuerpo.createDiv({ cls: "hoy-principal" });
  const tabla = principal.createDiv({ cls: "tabla", attr: { role: "table", "aria-label": "Tareas de hoy" } });
  cabeceraTabla(tabla);

  const bloque = (nombre: string, ts: TareaIdx[], vacio?: string) => {
    if (!ts.length && !vacio) return;
    const g = grupo(tabla, nombre, ts.length || undefined);
    if (!ts.length) g.createDiv({ cls: "tabla-vacia", text: vacio });
    for (const t of ts) fila(p, g, t, o);
  };
  if (r.atrasadas.length) bloque("Atrasadas", r.atrasadas);
  bloque("Hoy", r.hoy, r.atrasadas.length ? "Nada más con fecha de hoy." : "Nada con fecha de hoy. Escribe arriba para añadir.");
  bloque("Mañana", deManana);
  bloque("Hechas hoy", hechasHoy);

  if (r.sinFecha.length) {
    const det = principal.createEl("details", { cls: "desplegable" });
    const s = det.createEl("summary");
    s.createSpan({ text: "Sin fecha" });
    s.createSpan({ cls: "grupo-n", text: String(r.sinFecha.length) });
    const t2 = det.createDiv({ cls: "tabla", attr: { role: "table" } });
    for (const t of r.sinFecha) fila(p, t2, t, o);
  }

  if (!tareas.some(pendiente) && (ctx.panel.filtro.tags.size || ctx.panel.filtro.texto)) {
    principal.createDiv({ cls: "hoja-vacia", text: "Ninguna tarea coincide con el filtro." });
  }

  if (p.ajustes.mostrarCuentaAtras) proximas(ctx, cuerpo.createEl("aside", { cls: "hoy-lado" }));
}

const HUECO_MIN = 46;
const HUECO_MAX = 150;
const PX_POR_DIA = 7;

/**
 * Próximas entregas y exámenes en una línea de tiempo: el hueco entre dos fechas es proporcional
 * a los días que las separan.
 */
function proximas(ctx: Contexto, el: HTMLElement) {
  const { p, hoy, tareas } = ctx;
  const items = ordenar(tareas.filter((t) => pendiente(t) && t.fecha && t.fecha > hoy && tipoDe(t, p.ajustes.prioridadImportante)));
  titulo(el, "Próximas entregas");
  if (!items.length) {
    el.createDiv({ cls: "tabla-vacia", text: "Nada importante a la vista." });
    return;
  }
  const porFecha = new Map<ISO, TareaIdx[]>();
  for (const t of items) porFecha.set(t.fecha!, [...(porFecha.get(t.fecha!) ?? []), t]);
  const fechas = [...porFecha.keys()].slice(0, 6);
  const linea = el.createDiv({ cls: "linea-tiempo" });
  let anterior: ISO = hoy;
  for (const f of fechas) {
    const ts = porFecha.get(f)!;
    const hueco = Math.min(HUECO_MAX, Math.max(HUECO_MIN, diasEntre(anterior, f) * PX_POR_DIA));
    const hito = linea.createDiv({ cls: "hito" });
    hito.style.marginTop = anterior === hoy ? "0px" : `${hueco - HUECO_MIN}px`;
    const d = diasEntre(hoy, f);
    const num = hito.createDiv({ cls: `hito-dias${d <= 3 ? " hito-pronto" : ""}` });
    num.createSpan({ cls: "hito-n", text: String(d) });
    num.createSpan({ cls: "hito-u", text: d === 1 ? "día" : "días" });
    const txt = hito.createDiv({ cls: "hito-texto" });
    for (const t of ts) {
      const b = txt.createEl("button", { cls: "hito-tarea", attr: { type: "button" } });
      b.createSpan({ text: t.descripcion });
      b.addEventListener("click", () => void p.abrirTarea(t));
    }
    const pie = txt.createDiv({ cls: "hito-pie" });
    for (const tag of [...new Set(ts.flatMap((t) => t.tags.slice(0, 1)))]) pastillaTag(p, pie, tag);
    pie.createSpan({ text: fechaCorta(f) + (ts.length > 1 ? ` · ${ts.length} el mismo día` : "") });
    anterior = f;
  }
  if (porFecha.size > fechas.length) {
    const mas = el.createEl("button", { cls: "boton-enlace", text: "Ver todas en Inicio", attr: { type: "button" } });
    mas.addEventListener("click", () => ctx.panel.irA("inicio"));
  }
}
