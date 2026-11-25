// Pestaña Asignaturas: registro con una fila por asignatura del cuatrimestre en curso (pendientes,
// próxima entrega, avance y horario); cada fila se despliega con sus tareas. Las demás, aparte.

import { setIcon } from "obsidian";
import { Contexto } from "../panel";
import { Asignatura } from "../../ajustes";
import { importantes, ordenar, pendiente, progresoPorTag } from "../../core/consultas";
import { DIAS_CORTOS, diasEntre, fechaCorta } from "../../core/fechas";
import { lista, pastillaTag } from "../fila";
import { barra, cabeceraDoc, titulo } from "../comun";
import { ModalAnadir } from "../modales";
import { datoCurso } from "./hoy";

export function pintarAsignaturas(ctx: Contexto, el: HTMLElement) {
  const { p, hoy, tareas, todas } = ctx;
  const progreso = progresoPorTag(tareas, hoy);
  const cuatri = p.cuatriActual(hoy);
  const enCurso = (a: Asignatura) => a.cuatri === "anual" || a.cuatri === String(cuatri);
  const actuales = p.ajustes.asignaturas.filter(enCurso);
  const otras = p.ajustes.asignaturas.filter((a) => !enCurso(a));
  const sinConfigurar = [...progreso.keys()].filter((tag) => tag && !p.asignatura(tag));
  const pendientes = tareas.filter(pendiente).length;

  cabeceraDoc(ctx.cabecera, "Asignaturas", [datoCurso(p, hoy), `${actuales.length} en curso · ${pendientes} tareas pendientes`].filter((x): x is string => !!x));

  const registro = (padre: HTMLElement, lista_: Asignatura[]) => {
    const r = padre.createDiv({ cls: "asignaturas", attr: { role: "table" } });
    const cab = r.createDiv({ cls: "asig-fila asig-cabecera", attr: { "aria-hidden": "true" } });
    for (const c of ["Asignatura", "Pendientes", "Lo próximo", "Avance", "Clases", ""]) cab.createSpan({ text: c });
    for (const a of lista_) filaAsig(r, a);
    return r;
  };

  const filaAsig = (padre: HTMLElement, a: Asignatura) => {
    const pr = progreso.get(a.tag) ?? { hechas: 0, total: 0, pendientes: 0, proxima: null };
    const det = padre.createEl("details", { cls: "asig" });
    det.style.setProperty("--tarea-color", p.color(a.tag));
    const s = det.createEl("summary", { cls: "asig-fila" });

    const nom = s.createSpan({ cls: "asig-nombre" });
    pastillaTag(p, nom, a.tag);
    nom.createSpan({ text: a.nombre });

    s.createSpan({ cls: `asig-n${pr.pendientes ? "" : " asig-al-dia"}`, text: pr.pendientes ? String(pr.pendientes) : "al día" });

    const prox = s.createSpan({ cls: "asig-proxima" });
    const imp = importantes(tareas.filter((t) => t.tags.includes(a.tag)), hoy, p.ajustes.prioridadImportante)[0];
    if (imp) {
      const d = diasEntre(hoy, imp.fecha!);
      prox.createSpan({ cls: "asig-proxima-dias", text: d === 0 ? "hoy" : `${d} d` });
      prox.createSpan({ text: imp.descripcion });
    } else if (pr.proxima) prox.createSpan({ text: fechaCorta(pr.proxima) });
    else prox.createSpan({ cls: "asig-suave", text: "—" });

    const av = s.createSpan({ cls: "asig-avance" });
    barra(av, pr.total ? pr.hechas / pr.total : 0, p.color(a.tag));
    av.createSpan({ text: `${pr.hechas}/${pr.total}` });

    const clases = p.curso.clases.filter((cl) => cl.tag === a.tag);
    s.createSpan({
      cls: "asig-clases",
      text: clases.length ? clases.map((cl) => `${DIAS_CORTOS[cl.dia]} ${cl.inicio}`).join(" · ") : "—",
      attr: clases.length ? { title: clases.map((cl) => `${DIAS_CORTOS[cl.dia]} ${cl.inicio}–${cl.fin}${cl.aula ? ` · ${cl.aula}` : ""}`).join("\n") } : {},
    });

    const mas = s.createEl("button", { cls: "boton-icono", attr: { type: "button", "aria-label": `Nueva tarea de ${a.nombre}`, title: "Nueva tarea" } });
    setIcon(mas, "plus");
    mas.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      new ModalAnadir(p, { tag: a.tag }).open();
    });

    const pend = ordenar(tareas.filter((t) => pendiente(t) && t.tags.includes(a.tag)));
    const dentro = det.createDiv({ cls: "asig-tareas" });
    lista(p, dentro, pend, { hoy, todas }, "No tiene tareas pendientes.");
  };

  if (actuales.length) registro(el, actuales);
  else el.createDiv({ cls: "hoja-vacia", text: "Añade tus asignaturas en la sección «Configuración» del archivo de tareas." });

  if (sinConfigurar.length) {
    titulo(el, "Etiquetas sin asignatura");
    el.createDiv({
      cls: "hoja-ayuda",
      text: `${sinConfigurar.map((t) => "#" + t).join(", ")}: añádelas a la tabla «Asignaturas» del archivo para darles nombre y color.`,
    });
  }

  if (otras.length) {
    const det = el.createEl("details", { cls: "desplegable" });
    const sum = det.createEl("summary");
    sum.createSpan({ text: "Otras asignaturas" });
    sum.createSpan({ cls: "grupo-n", text: String(otras.length) });
    registro(det, otras);
  }
}
