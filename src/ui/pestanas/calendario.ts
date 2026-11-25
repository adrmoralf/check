// Pestaña Calendario: el mes como cuadrícula de filetes con una marca por tarea en el color de su
// asignatura; al pulsar un día se ven sus tareas y clases. También se puede soltar una tarea en un día.

import { setIcon } from "obsidian";
import { Contexto } from "../panel";
import { ordenar, pendiente } from "../../core/consultas";
import { clasesDelDia, noLectivoDe } from "../../core/curso";
import { MESES_LARGOS, fechaLarga, lunesDe, primeroDeMes, sumarDias, sumarMeses } from "../../core/fechas";
import { lista, zonaSoltar } from "../fila";
import { cabeceraDoc, listaClases, titulo } from "../comun";
import { ModalAnadir } from "../modales";

const CABECERA = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"];
const MAX_MARCAS = 3;

export function pintarCalendario(ctx: Contexto, el: HTMLElement) {
  const { p, hoy, tareas, todas, panel } = ctx;
  const mes = panel.mes;
  const [anio, m] = mes.split("-").map(Number);

  const der = cabeceraDoc(ctx.cabecera, `${MESES_LARGOS[m - 1].replace(/^./, (c) => c.toUpperCase())} de ${anio}`);
  const nav = der.createDiv({ cls: "cal-nav" });
  const boton = (icono: string, etiqueta: string, fn: () => void) => {
    const b = nav.createEl("button", { cls: "boton-icono", attr: { type: "button", "aria-label": etiqueta, title: etiqueta } });
    setIcon(b, icono);
    b.addEventListener("click", fn);
  };
  boton("chevron-left", "Mes anterior", () => {
    panel.mes = sumarMeses(mes, -1);
    panel.pintarContenido();
  });
  const irHoy = nav.createEl("button", { cls: "boton-secundario", text: "Hoy", attr: { type: "button" } });
  irHoy.addEventListener("click", () => {
    panel.mes = primeroDeMes(hoy);
    panel.diaSeleccionado = hoy;
    panel.pintarContenido();
  });
  boton("chevron-right", "Mes siguiente", () => {
    panel.mes = sumarMeses(mes, 1);
    panel.pintarContenido();
  });

  const pend = ordenar(tareas.filter(pendiente));
  const porFecha = new Map<string, typeof pend>();
  for (const t of pend) if (t.fecha) porFecha.set(t.fecha, [...(porFecha.get(t.fecha) ?? []), t]);

  const cuerpo = el.createDiv({ cls: "cal-cuerpo" });
  const rejilla = cuerpo.createDiv({ cls: "cal", attr: { role: "grid", "aria-label": `${MESES_LARGOS[m - 1]} de ${anio}` } });
  for (const c of CABECERA) rejilla.createDiv({ cls: "cal-cab", text: c, attr: { role: "columnheader" } });

  // Semanas completas: del lunes de la primera al domingo de la última
  const inicio = lunesDe(mes);
  const ultimo = sumarDias(lunesDe(sumarDias(sumarMeses(mes, 1), -1)), 6);
  for (let dia = inicio; dia <= ultimo; dia = sumarDias(dia, 1)) {
    const ts = porFecha.get(dia) ?? [];
    const celda = rejilla.createDiv({ cls: "cal-dia", attr: { role: "gridcell", tabindex: "0", "aria-selected": String(dia === panel.diaSeleccionado) } });
    if (dia.slice(0, 7) !== mes) celda.addClass("cal-fuera");
    if (dia === hoy) celda.addClass("cal-hoy");
    if (dia === panel.diaSeleccionado) celda.addClass("is-selected");
    if (dia < hoy && ts.length) celda.addClass("cal-atrasado");
    const noLectivo = noLectivoDe(dia, p.curso.noLectivos);
    if (noLectivo) celda.addClass("cal-nolectivo");

    celda.createDiv({ cls: "cal-num", text: String(Number(dia.slice(8))) });
    const marcas = celda.createDiv({ cls: "cal-marcas" });
    for (const t of ts.slice(0, MAX_MARCAS)) {
      const mk = marcas.createDiv({ cls: "cal-marca", text: t.descripcion });
      mk.style.setProperty("--tarea-color", p.color(t.tags[0]));
      if (t.prioridad >= p.ajustes.prioridadImportante) mk.addClass("cal-marca-imp");
    }
    if (ts.length > MAX_MARCAS) marcas.createDiv({ cls: "cal-mas", text: `y ${ts.length - MAX_MARCAS} más` });

    const etiqueta = [fechaLarga(dia), noLectivo?.nombre, ...ts.map((t) => t.descripcion)].filter(Boolean).join(". ");
    celda.setAttr("aria-label", etiqueta);
    const elegir = () => {
      panel.diaSeleccionado = dia;
      panel.pintarContenido();
    };
    celda.addEventListener("click", elegir);
    celda.addEventListener("keydown", (e) => e.key === "Enter" && elegir());
    zonaSoltar(p, celda, dia);
  }

  // Detalle del día seleccionado
  const sel = panel.diaSeleccionado;
  const det = cuerpo.createDiv({ cls: "cal-detalle" });
  const t = titulo(det, fechaLarga(sel).replace(/^./, (c) => c.toUpperCase()));
  const mas = t.createEl("button", { cls: "boton-icono", attr: { type: "button", "aria-label": "Nueva tarea este día", title: "Nueva tarea este día" } });
  setIcon(mas, "plus");
  mas.addEventListener("click", () => new ModalAnadir(p, { fecha: sel, tag: [...panel.filtro.tags][0] }).open());
  const noLectivo = noLectivoDe(sel, p.curso.noLectivos);
  if (noLectivo) det.createDiv({ cls: "hoja-dato-suave", text: `${noLectivo.nombre}: no lectivo` });
  const clases = clasesDelDia(sel, p.curso.clases, p.ajustes.c1, p.ajustes.c2, p.curso.noLectivos);
  if (clases.length) listaClases(p, det, clases, sel);
  lista(p, det, porFecha.get(sel) ?? [], { hoy, todas, mostrarFecha: false }, "Sin tareas este día.");
}
