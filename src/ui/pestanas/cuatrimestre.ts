// Pestaña Cuatrimestre: avance del cuatrimestre y línea de tiempo semana a semana hasta el final
// de los exámenes, con entregas, exámenes, días no lectivos y fin de clases.

import { Contexto } from "../panel";
import { TareaIdx, ordenar, pendiente } from "../../core/consultas";
import { avanceCuatrimestre, diasLaborables, periodoDe } from "../../core/curso";
import { ISO, diaMes, diasEntre, fechaCorta, lunesDe, maxISO, sumarDias } from "../../core/fechas";
import { pastillaTag } from "../fila";
import { barra, cabeceraDoc } from "../comun";

interface Hito {
  fecha: ISO;
  hasta?: ISO;
  texto: string;
  tipo: "tarea" | "nolectivo" | "periodo" | "hoy";
  tarea?: TareaIdx;
}

export function pintarCuatrimestre(ctx: Contexto, el: HTMLElement) {
  const { p, hoy, tareas } = ctx;
  const cuatri = p.cuatriActual(hoy);
  if (!cuatri) {
    el.createDiv({ cls: "hoja-vacia", text: "El curso ha terminado. Actualiza las fechas en los ajustes para el siguiente." });
    return;
  }
  const per = periodoDe(cuatri, p.ajustes.c1, p.ajustes.c2);
  const avance = avanceCuatrimestre(hoy, per);
  const semanaActual = Math.max(1, Math.floor(diasEntre(lunesDe(per.inicio), hoy) / 7) + 1);
  const semanasTotales = Math.floor(diasEntre(lunesDe(per.inicio), per.finExamenes) / 7) + 1;

  // Cabecera de documento con el avance
  const datos: string[] = [hoy < per.inicio ? `Empieza el ${fechaCorta(per.inicio)}` : `Semana ${Math.min(semanaActual, semanasTotales)} de ${semanasTotales}`];
  if (hoy <= per.finClases) datos.push(`${diasLaborables(maxISO(hoy, per.inicio), sumarDias(per.finClases, 1), p.curso.noLectivos)} días de clase por delante`);
  datos.push(`${Math.max(0, diasEntre(hoy, per.finExamenes))} días hasta el fin de exámenes`);
  const der = cabeceraDoc(ctx.cabecera, `${cuatri === 1 ? "Primer" : "Segundo"} cuatrimestre`, datos);
  const filaAv = der.createDiv({ cls: "cuatri-avance" });
  barra(filaAv, avance);
  filaAv.createSpan({ text: `${Math.round(avance * 100)} % del cuatrimestre` });

  // Hitos desde hoy hasta el final de los exámenes
  const desde = maxISO(hoy, per.inicio);
  const hitos: Hito[] = [{ fecha: hoy, texto: "Hoy", tipo: "hoy" }];
  for (const t of ordenar(tareas.filter((x) => pendiente(x) && x.fecha && x.fecha >= desde && x.fecha <= per.finExamenes))) {
    if (t.prioridad >= p.ajustes.prioridadImportante || t.vence) hitos.push({ fecha: t.fecha!, texto: t.descripcion, tipo: "tarea", tarea: t });
  }
  for (const n of p.curso.noLectivos) {
    if (n.hasta >= desde && n.desde <= per.finExamenes) hitos.push({ fecha: maxISO(n.desde, desde), hasta: n.hasta, texto: n.nombre, tipo: "nolectivo" });
  }
  if (per.finClases >= desde) hitos.push({ fecha: per.finClases, texto: "Último día de clase", tipo: "periodo" });
  const iniExamenes = sumarDias(per.finClases, 1);
  hitos.push({ fecha: maxISO(iniExamenes, desde), hasta: per.finExamenes, texto: "Periodo de exámenes", tipo: "periodo" });
  hitos.sort((a, b) => a.fecha.localeCompare(b.fecha) || (a.tipo === "hoy" ? -1 : b.tipo === "hoy" ? 1 : 0));

  const linea = el.createDiv({ cls: "pt-timeline" });
  let semana = "";
  let ultimaSemana: ISO | null = null;
  for (const h of hitos) {
    const lunes = lunesDe(h.fecha);
    if (lunes !== semana) {
      if (ultimaSemana) {
        const vacias = Math.round(diasEntre(ultimaSemana, lunes) / 7) - 1;
        if (vacias > 0) linea.createDiv({ cls: "pt-tl-hueco", text: `${vacias} semana${vacias === 1 ? "" : "s"} sin entregas` });
      }
      semana = lunes;
      ultimaSemana = lunes;
      linea.createDiv({ cls: "pt-tl-semana", text: lunes === lunesDe(hoy) ? "Esta semana" : `Semana del ${diaMes(lunes)}` });
    }
    const it = linea.createDiv({ cls: `pt-tl-item pt-tl-${h.tipo}` });
    if (h.tarea) {
      it.style.setProperty("--tarea-color", p.color(h.tarea.tags[0]));
      if (h.tarea.prioridad >= p.ajustes.prioridadImportante) it.addClass("pt-tl-importante");
      it.addEventListener("click", () => void p.abrirTarea(h.tarea!));
    }
    it.createDiv({ cls: "pt-tl-marca" });
    const cuerpo = it.createDiv({ cls: "pt-tl-cuerpo" });
    cuerpo.createDiv({ cls: "pt-tl-fecha", text: h.hasta && h.hasta !== h.fecha ? `${fechaCorta(h.fecha)} – ${fechaCorta(h.hasta)}` : fechaCorta(h.fecha) });
    const txt = cuerpo.createDiv({ cls: "pt-tl-texto", text: h.texto });
    if (h.tarea?.tags[0]) pastillaTag(p, txt, h.tarea.tags[0]);
    if (h.tipo === "tarea") {
      const d = diasEntre(hoy, h.fecha);
      cuerpo.createDiv({ cls: "pt-tl-dias", text: d === 0 ? "hoy" : `en ${d} días` });
    }
  }
}
