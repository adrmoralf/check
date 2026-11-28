// Pestaña Inicio: exámenes, entregas, prácticas y avances hasta el final del cuatrimestre.
// A la izquierda, el registro agrupado por semanas, cada tarea con sus subtareas. A la derecha, la
// tira de semanas en vertical (una fila por semana, de esta al fin de exámenes, con una marca por
// cada cosa: se ve de un vistazo qué semanas vienen cargadas); en hoja estrecha va debajo.
// Los exámenes que ya pasaron se dan por hechos.

import { setIcon } from "obsidian";
import { Contexto } from "../panel";
import { TareaIdx, clave, ordenar, pendiente, subtareas } from "../../core/consultas";
import { periodoDe } from "../../core/curso";
import { TipoEntrega, tipoDe } from "../../core/entregas";
import { ISO, diasEntre, fechaCorta, lunesDe, sumarDias } from "../../core/fechas";
import { fechaColumna, pastillaTag } from "../fila";
import { cabeceraDoc, titulo } from "../comun";
import { datoCurso } from "./hoy";

const NOMBRE: Record<TipoEntrega, string> = {
  examen: "EXAMEN", entrega: "ENTREGA", practica: "PRÁCTICA", avance: "AVANCE", importante: "IMPORTANTE",
};
const CORTO: Record<TipoEntrega, string> = { examen: "Ex", entrega: "En", practica: "Pr", avance: "Av", importante: "!" };

interface Item {
  t: TareaIdx;
  tipo: TipoEntrega;
}

export function pintarInicio(ctx: Contexto, el: HTMLElement) {
  const { p, hoy, tareas, todas } = ctx;
  const cuatri = p.cuatriActual(hoy);
  const per = cuatri ? periodoDe(cuatri, p.ajustes.c1, p.ajustes.c2) : null;
  const hasta: ISO | null = per?.finExamenes ?? null;

  const todos = ordenar(tareas.filter((t) => pendiente(t) && t.fecha && (!hasta || t.fecha <= hasta)))
    .map((t) => ({ t, tipo: tipoDe(t, p.ajustes.prioridadImportante) }))
    .filter((x): x is Item => x.tipo !== null);
  // Una subtarea cuya tarea principal también sale aquí va debajo de ella, no suelta
  const visibles = new Set(todos.map((x) => clave(x.t)));
  const items = todos.filter((x) => x.t.padre === null || !visibles.has(clave({ path: x.t.path, linea: x.t.padre })));
  const futuras = items.filter((x) => x.t.fecha! >= hoy);
  const n = (tipo: TipoEntrega) => futuras.filter((x) => x.tipo === tipo).length;

  const cuenta = [`${n("examen")} exámenes`, `${n("entrega")} entregas`];
  if (n("practica")) cuenta.push(`${n("practica")} prácticas`);
  if (n("avance")) cuenta.push(`${n("avance")} avances`);
  const datos = [datoCurso(p, hoy), cuenta.join(" · ")];
  if (hasta) datos.push(`${Math.max(0, diasEntre(hoy, hasta))} días hasta el fin de exámenes`);
  cabeceraDoc(ctx.cabecera, "Inicio", datos.filter((x): x is string => !!x));

  if (!items.length) {
    el.createDiv({
      cls: "hoja-vacia",
      text: "No hay exámenes, entregas, prácticas ni avances pendientes. Se reconocen por el tipo que se les pone al crearlas, por el texto (examen, entrega, memoria, práctica…) o por tener prioridad alta.",
    });
    return;
  }

  const fin = hasta ?? futuras[futuras.length - 1]?.t.fecha ?? hoy;
  const semanas: ISO[] = [];
  for (let l = lunesDe(hoy); l <= fin; l = sumarDias(l, 7)) semanas.push(l);
  const grupos = new Map<ISO, HTMLElement>();
  const cuerpo = el.createDiv({ cls: "inicio" });
  const principal = cuerpo.createDiv({ cls: "inicio-principal" });
  tiraSemanas(ctx, cuerpo.createEl("aside", { cls: "inicio-lado" }), semanas, futuras, per, grupos);

  // Registro: atrasadas arriba y después una sección por semana
  const reg = principal.createDiv({ cls: "registro", attr: { role: "table", "aria-label": "Exámenes, entregas, prácticas y avances por semana" } });
  const cab = reg.createDiv({ cls: "registro-fila registro-cabecera", attr: { role: "row", "aria-hidden": "true" } });
  for (const c of ["", "Faltan", "Fecha", "Tipo", "Asig.", "Tarea"]) cab.createSpan({ text: c });

  const veces = new Map<ISO, number>();
  for (const { t } of items) veces.set(t.fecha!, (veces.get(t.fecha!) ?? 0) + 1);
  const atrasadas = items.filter((x) => x.t.fecha! < hoy);
  if (atrasadas.length) {
    rotulo(reg, "Atrasadas", atrasadas.length).addClass("registro-semana-atrasada");
    for (const x of atrasadas) filaRegistro(ctx, reg, x, veces, todas);
  }
  for (const l of semanas) {
    const deLaSemana = futuras.filter((x) => lunesDe(x.t.fecha!) === l);
    if (!deLaSemana.length) continue;
    const r = rotulo(reg, nombreSemana(l, hoy, per), deLaSemana.length);
    grupos.set(l, r);
    for (const x of deLaSemana) filaRegistro(ctx, reg, x, veces, todas);
  }
}

function nombreSemana(lunes: ISO, hoy: ISO, per: { finClases: ISO } | null): string {
  const actual = lunesDe(hoy);
  const base = lunes === actual ? "Esta semana" : lunes === sumarDias(actual, 7) ? "La semana que viene" : `Semana del ${fechaCorta(lunes)}`;
  return per && lunes > per.finClases ? `${base} · exámenes` : base;
}

function rotulo(el: HTMLElement, texto: string, n: number): HTMLElement {
  const r = el.createDiv({ cls: "registro-semana", attr: { role: "row" } });
  r.createSpan({ text: texto });
  r.createSpan({ cls: "grupo-n", text: String(n) });
  return r;
}

/**
 * Tira de semanas: una fila por semana con una marca por cada cosa (color de la asignatura,
 * relleno si es examen, discontinua si es un avance). Las semanas de exámenes van sombreadas.
 * Pulsar una semana lleva a su sección del registro; pulsar una marca abre la tarea.
 */
function tiraSemanas(ctx: Contexto, el: HTMLElement, semanas: ISO[], futuras: Item[], per: { finClases: ISO } | null, grupos: Map<ISO, HTMLElement>) {
  const { p, hoy } = ctx;
  titulo(el, "Semanas");
  const caja = el.createDiv({ cls: "semanas-caja" });
  const tira = caja.createDiv({ cls: "semanas", attr: { role: "list", "aria-label": "Carga por semanas hasta el fin de exámenes" } });
  for (const l of semanas) {
    const deLaSemana = futuras.filter((x) => lunesDe(x.t.fecha!) === l);
    const col = tira.createDiv({ cls: "semana", attr: { role: "listitem" } });
    if (l === lunesDe(hoy)) col.addClass("semana-actual");
    if (per && sumarDias(l, 4) > per.finClases) col.addClass("semana-examenes");
    const cab = col.createEl("button", {
      cls: "semana-cab",
      attr: { type: "button", title: deLaSemana.length ? `${nombreSemana(l, hoy, per)}: ${deLaSemana.length}` : `${nombreSemana(l, hoy, per)}: nada` },
    });
    cab.createSpan({ cls: "semana-dia", text: String(Number(l.slice(8))) });
    cab.createSpan({ cls: "semana-mes", text: fechaCorta(l).split(" ").pop() ?? "" });
    cab.disabled = !deLaSemana.length;
    cab.addEventListener("click", () => grupos.get(l)?.scrollIntoView({ behavior: "smooth", block: "start" }));
    const marcas = col.createDiv({ cls: "semana-marcas" });
    for (const { t, tipo } of deLaSemana) {
      const m = marcas.createEl("button", {
        cls: `semana-marca marca-${tipo}`,
        attr: { type: "button", title: `${NOMBRE[tipo]} · ${fechaColumna(t.fecha!)}${t.hora ? ` ${t.hora}` : ""} · ${t.descripcion}` },
      });
      m.style.setProperty("--tarea-color", p.color(t.tags[0]));
      m.createSpan({ cls: "semana-marca-tipo", text: CORTO[tipo] });
      m.createSpan({ cls: "semana-marca-tag", text: t.tags[0] ?? "—" });
      m.addEventListener("click", () => void p.abrirTarea(t));
    }
  }
  const leyenda = caja.createDiv({ cls: "semanas-leyenda", attr: { "aria-hidden": "true" } });
  for (const [cls, texto] of [["marca-examen", "Examen"], ["marca-entrega", "Entrega o práctica"], ["marca-avance", "Avance"]]) {
    const s = leyenda.createSpan({ cls: "semanas-leyenda-item" });
    s.createSpan({ cls: `semanas-leyenda-muestra ${cls}` });
    s.createSpan({ text: texto });
  }
  if (per) {
    const s = leyenda.createSpan({ cls: "semanas-leyenda-item" });
    s.createSpan({ cls: "semanas-leyenda-muestra muestra-examenes" });
    s.createSpan({ text: "Periodo de exámenes" });
  }
}

/** Casilla de marcar como hecha (la usan la fila y sus subtareas). */
function casilla(ctx: Contexto, el: HTMLElement, t: TareaIdx, alMarcar: () => void) {
  const check = el.createEl("button", {
    cls: "casilla",
    attr: { type: "button", role: "checkbox", "aria-checked": String(t.hecha), "aria-label": `${t.hecha ? "Reabrir" : "Marcar como hecha"}: ${t.descripcion}` },
  });
  if (t.hecha) setIcon(check, "check");
  check.addEventListener("click", (e) => {
    e.stopPropagation();
    check.addClass("casilla-pulsada");
    if (!t.hecha) {
      setIcon(check, "check");
      check.setAttr("aria-checked", "true");
      alMarcar();
    }
    void ctx.p.acciones.alternar(t);
  });
  check.addEventListener("keydown", (e) => e.stopPropagation());
}

function filaRegistro(ctx: Contexto, reg: HTMLElement, { t, tipo }: Item, veces: Map<ISO, number>, todas: TareaIdx[]) {
  const { p, hoy } = ctx;
  const d = diasEntre(hoy, t.fecha!);
  const f = reg.createDiv({ cls: `registro-fila registro-${tipo}`, attr: { role: "row", tabindex: "0" } });
  f.style.setProperty("--tarea-color", p.color(t.tags[0]));
  if (d < 0) f.addClass("registro-atrasada");
  // Casilla (los exámenes no la llevan: se dan por hechos cuando pasa su fecha)
  const celda = f.createSpan({ cls: "registro-casilla" });
  if (tipo !== "examen") casilla(ctx, celda, t, () => f.addClass("registro-hecha"));
  const faltan = f.createSpan({ cls: `registro-dias${d >= 0 && d <= 3 ? " pronto" : ""}` });
  faltan.createSpan({ cls: "registro-n", text: d === 0 ? "hoy" : String(Math.abs(d)) });
  if (d !== 0) faltan.createSpan({ cls: "registro-u", text: d < 0 ? "tarde" : d === 1 ? "día" : "días" });
  const fe = f.createSpan({ cls: "registro-fecha" });
  fe.createSpan({ text: `${fechaColumna(t.fecha!)} ${fechaCorta(t.fecha!).split(" ").pop()}` });
  if (t.hora) fe.createSpan({ cls: "registro-hora", text: t.hora });
  if ((veces.get(t.fecha!) ?? 0) > 1) fe.setAttr("title", "Más de una cosa ese día");
  f.createSpan({ cls: "registro-tipo" }).createSpan({ cls: `tipo tipo-${tipo}`, text: NOMBRE[tipo] });
  const asig = f.createSpan();
  if (t.tags[0]) pastillaTag(p, asig, t.tags[0]);
  const desc = f.createSpan({ cls: "registro-desc" });
  desc.createSpan({ text: t.descripcion });
  // Subtarea suelta (su tarea principal no sale en Inicio): se dice de cuál es
  if (t.padre !== null) {
    const padre = todas.find((x) => x.path === t.path && x.linea === t.padre);
    if (padre) {
      const de = desc.createSpan({ cls: "registro-padre" });
      setIcon(de.createSpan({ cls: "meta-icono" }), "corner-down-right");
      de.createSpan({ text: padre.descripcion });
    }
  }
  const hijos = subtareas(todas, t);
  if (hijos.length) desc.createSpan({ cls: "registro-progreso", text: `${hijos.filter((h) => h.hecha).length}/${hijos.length}`, attr: { title: "Subtareas hechas" } });
  f.addEventListener("click", () => void p.abrirTarea(t));
  f.addEventListener("keydown", (e) => e.key === "Enter" && void p.abrirTarea(t));
  if (hijos.length) subtareasDe(ctx, reg, hijos);
}

/** Subtareas debajo de su tarea: casilla, texto y, si la tienen, su fecha. */
function subtareasDe(ctx: Contexto, reg: HTMLElement, hijos: TareaIdx[]) {
  const { p, hoy } = ctx;
  const caja = reg.createDiv({ cls: "registro-subs", attr: { role: "row" } });
  for (const h of hijos) {
    const s = caja.createDiv({ cls: "registro-sub", attr: { tabindex: "0" } });
    if (h.hecha) s.addClass("registro-hecha");
    casilla(ctx, s, h, () => s.addClass("registro-hecha"));
    s.createSpan({ cls: "registro-sub-desc", text: h.descripcion });
    if (h.fecha && !h.hecha) {
      const tarde = h.fecha < hoy;
      s.createSpan({ cls: `registro-sub-fecha${tarde ? " tarde" : ""}`, text: `${fechaColumna(h.fecha)}${h.hora ? ` ${h.hora}` : ""}` });
    }
    s.addEventListener("click", () => void p.abrirTarea(h));
    s.addEventListener("keydown", (e) => e.key === "Enter" && void p.abrirTarea(h));
  }
}
