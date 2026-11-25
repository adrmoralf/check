// Pestaña Entregas: entregas y exámenes hasta el final del cuatrimestre. Arriba, el eje de hoy al
// fin de exámenes; debajo, el registro por fecha, donde el espacio entre filas crece con los días
// que las separan.

import { setIcon } from "obsidian";
import { Contexto } from "../panel";
import { TareaIdx, ordenar, pendiente } from "../../core/consultas";
import { periodoDe } from "../../core/curso";
import { TipoEntrega, tipoDe } from "../../core/entregas";
import { ISO, diasEntre, fechaCorta } from "../../core/fechas";
import { fechaColumna, pastillaTag } from "../fila";
import { cabeceraDoc } from "../comun";
import { datoCurso } from "./hoy";

const NOMBRE: Record<TipoEntrega, string> = { examen: "EXAMEN", entrega: "ENTREGA", practica: "PRÁCTICA", importante: "IMPORTANTE" };
const PX_POR_DIA = 3;
const HUECO_MAX = 72;
/** A partir de cuántos días entre dos fechas se rotula el intervalo */
const HUECO_ROTULADO = 5;

export function pintarInicio(ctx: Contexto, el: HTMLElement) {
  const { p, hoy, tareas } = ctx;
  const cuatri = p.cuatriActual(hoy);
  const per = cuatri ? periodoDe(cuatri, p.ajustes.c1, p.ajustes.c2) : null;
  const hasta: ISO | null = per?.finExamenes ?? null;

  const items = ordenar(tareas.filter((t) => pendiente(t) && t.fecha && (!hasta || t.fecha <= hasta)))
    .map((t) => ({ t, tipo: tipoDe(t, p.ajustes.prioridadImportante) }))
    .filter((x): x is { t: TareaIdx; tipo: TipoEntrega } => x.tipo !== null);
  const futuras = items.filter((x) => x.t.fecha! >= hoy);
  const n = (tipo: TipoEntrega) => futuras.filter((x) => x.tipo === tipo).length;

  const cuenta = [`${n("examen")} exámenes`, `${n("entrega")} entregas`];
  if (n("practica")) cuenta.push(`${n("practica")} prácticas`);
  const datos = [datoCurso(p, hoy), cuenta.join(" · ")];
  if (hasta) datos.push(`${Math.max(0, diasEntre(hoy, hasta))} días hasta el fin de exámenes`);
  cabeceraDoc(ctx.cabecera, "Inicio", datos.filter((x): x is string => !!x));

  if (!items.length) {
    el.createDiv({
      cls: "hoja-vacia",
      text: "No hay exámenes, entregas ni prácticas pendientes. Se reconocen por el tipo que se les pone al crearlas, por el texto (examen, entrega, memoria, práctica…) o por tener prioridad alta.",
    });
    return;
  }

  // Eje: de hoy al fin de exámenes, con el periodo de exámenes rayado
  const fin = hasta ?? futuras[futuras.length - 1]?.t.fecha ?? hoy;
  const total = Math.max(1, diasEntre(hoy, fin));
  const pos = (f: ISO) => `${Math.min(100, Math.max(0, (diasEntre(hoy, f) / total) * 100))}%`;
  const eje = el.createDiv({ cls: "eje", attr: { role: "img", "aria-label": `${futuras.length} exámenes, entregas y prácticas entre hoy y el ${fechaCorta(fin)}` } });
  const pista = eje.createDiv({ cls: "eje-pista" });
  if (per && per.finClases < fin) {
    const z = pista.createDiv({ cls: "eje-examenes", attr: { title: "Periodo de exámenes" } });
    z.style.left = pos(per.finClases > hoy ? per.finClases : hoy);
    z.style.right = "0";
  }
  for (const { t, tipo } of futuras) {
    const m = pista.createEl("button", { cls: `eje-marca eje-${tipo}`, attr: { type: "button", title: `${fechaCorta(t.fecha!)} · ${t.descripcion}` } });
    m.style.left = pos(t.fecha!);
    m.style.setProperty("--tarea-color", p.color(t.tags[0]));
    m.addEventListener("click", () => void p.abrirTarea(t));
  }
  const etiquetas = eje.createDiv({ cls: "eje-etiquetas" });
  etiquetas.createSpan({ text: "Hoy" });
  if (per && per.finClases > hoy && per.finClases < fin) {
    const fc = etiquetas.createSpan({ cls: "eje-fin-clases", text: "Fin de clases" });
    fc.style.left = pos(per.finClases);
  }
  etiquetas.createSpan({ text: fechaCorta(fin) });

  // Registro por fecha
  const veces = new Map<ISO, number>();
  for (const { t } of items) veces.set(t.fecha!, (veces.get(t.fecha!) ?? 0) + 1);
  const reg = el.createDiv({ cls: "registro", attr: { role: "table", "aria-label": "Exámenes, entregas y prácticas por fecha" } });
  const cab = reg.createDiv({ cls: "registro-fila registro-cabecera", attr: { role: "row", "aria-hidden": "true" } });
  for (const c of ["", "Faltan", "Fecha", "Tipo", "Asig.", "Tarea"]) cab.createSpan({ text: c });
  let anterior: ISO | null = null;
  for (const { t, tipo } of items) {
    const d = diasEntre(hoy, t.fecha!);
    // El tiempo entre dos fechas se ve como un intervalo rotulado, proporcional a los días
    const entre = anterior && anterior !== t.fecha ? diasEntre(anterior, t.fecha!) : 0;
    if (entre >= HUECO_ROTULADO) {
      const h = reg.createDiv({ cls: "registro-hueco", attr: { "aria-hidden": "true" } });
      h.style.height = `${Math.min(HUECO_MAX, entre * PX_POR_DIA)}px`;
      h.createSpan({ text: `${entre} días` });
    }
    const f = reg.createDiv({ cls: "registro-fila", attr: { role: "row", tabindex: "0" } });
    f.style.setProperty("--tarea-color", p.color(t.tags[0]));
    if (d < 0) f.addClass("registro-atrasada");
    anterior = t.fecha!;
    // Casilla para marcarla como hecha (los exámenes no la llevan)
    const celda = f.createSpan({ cls: "registro-casilla" });
    if (tipo !== "examen") {
      const check = celda.createEl("button", {
        cls: "casilla",
        attr: { type: "button", role: "checkbox", "aria-checked": "false", "aria-label": `Marcar como hecha: ${t.descripcion}` },
      });
      check.addEventListener("click", (e) => {
        e.stopPropagation();
        check.addClass("casilla-pulsada");
        setIcon(check, "check");
        check.setAttr("aria-checked", "true");
        f.addClass("registro-hecha");
        void p.acciones.alternar(t);
      });
      check.addEventListener("keydown", (e) => e.stopPropagation());
    }
    const faltan = f.createSpan({ cls: `registro-dias${d >= 0 && d <= 3 ? " pronto" : ""}` });
    faltan.createSpan({ cls: "registro-n", text: d === 0 ? "hoy" : String(Math.abs(d)) });
    if (d !== 0) faltan.createSpan({ cls: "registro-u", text: d < 0 ? "tarde" : d === 1 ? "día" : "días" });
    const fe = f.createSpan({ cls: "registro-fecha" });
    fe.createSpan({ text: `${fechaColumna(t.fecha!)} ${fechaCorta(t.fecha!).split(" ").pop()}` });
    if (t.hora) fe.createSpan({ cls: "registro-hora", text: t.hora });
    if ((veces.get(t.fecha!) ?? 0) > 1) fe.setAttr("title", "Más de una entrega o examen ese día");
    f.createSpan({ cls: "registro-tipo" }).createSpan({ cls: `tipo tipo-${tipo}`, text: NOMBRE[tipo] });
    const asig = f.createSpan();
    if (t.tags[0]) pastillaTag(p, asig, t.tags[0]);
    f.createSpan({ cls: "registro-desc", text: t.descripcion });
    f.addEventListener("click", () => void p.abrirTarea(t));
    f.addEventListener("keydown", (e) => e.key === "Enter" && void p.abrirTarea(t));
  }
}
