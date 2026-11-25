// Cabecera con las instrucciones de formato (para personas e IA), documento nuevo y
// conversión desde una nota con la sintaxis del plugin Tasks.

import { ConfigDocumento, escribirConfig } from "./documento";
import { PRIORIDAD_TOKEN } from "./tarea";

export const CABECERA = `---
tipo: lista-de-tareas
formato: 1
---

# Tareas

> [!info] Formato (para editar a mano o con IA)
> Una tarea por línea: \`- [ ] Texto #ASIG @AAAA-MM-DD HH:MM !alta\`
> - \`#ASIG\` asignatura: la etiqueta de la tabla *Asignaturas* (al final). Una tarea puede no tener.
> - \`@AAAA-MM-DD\` fecha límite; la hora \`HH:MM\` detrás es opcional.
> - Prioridad: \`!max\`, \`!alta\`, \`!media\` o \`!baja\`; sin nada es normal.
> - \`- [x]\` hecha (la app añade \`✓AAAA-MM-DD\` con el día) · \`- [-]\` cancelada.
> - \`↻semanal\` se repite (también \`↻diaria\`, \`↻laborables\`, \`↻mensual\`, \`↻lunes\`, \`↻2s\` = cada 2 semanas): al marcarla hecha aparece la siguiente.
> - Subtareas: con sangría (tabulador) debajo de su tarea.
> - Notas: líneas con sangría debajo de la tarea que no son casillas (enlaces, apuntes).
> - Cada tarea va en la sección de su asignatura (\`### Nombre\`); las que no tienen, en *Otras tareas*.
> - La configuración (asignaturas, cuatrimestres, días no lectivos y horario) está al final, en *Configuración*.
`;

export function documentoNuevo(cfg: Omit<ConfigDocumento, "errores">): string {
  return [CABECERA, "## Tareas", "", "## Otras tareas", "", escribirConfig(cfg)].join("\n");
}

const RE_LINEA = /^(\s*(?:[-*+]|\d+[.)])\s+)\[(.)\](\s+)(.*)$/;
const RE_TAG = /(^|\s)#([^\s#\]|,;:!?()]+)/g;
const PRIO: [string, number][] = [["🔺", 5], ["⏫", 4], ["🔼", 3], ["🔽", 1], ["⏬", 0]];

/** Convierte una línea de Tasks a la sintaxis propia, conservando enlaces y sangría. */
export function convertirLineaTasks(linea: string): string {
  const m = linea.match(RE_LINEA);
  if (!m) return linea;
  let resto = m[4];
  const tags = [...resto.matchAll(RE_TAG)].map((t) => t[2]);
  const fecha = resto.match(/📅️?\s*(\d{4}-\d{2}-\d{2})/u)?.[1] ?? resto.match(/⏳️?\s*(\d{4}-\d{2}-\d{2})/u)?.[1];
  const hecha = resto.match(/✅️?\s*(\d{4}-\d{2}-\d{2})/u)?.[1];
  const prio = PRIO.find(([e]) => resto.includes(e))?.[1];
  // «(hasta las 23:59)» → hora de la fecha límite
  const hora = resto.match(/\(hasta las (\d{1,2}:\d{2})\)/)?.[1];
  resto = resto
    .replace(/\s*\(hasta las \d{1,2}:\d{2}\)/, "")
    .replace(/\s*(📅|⏳|🛫|✅|❌|➕)️?\s*\d{4}-\d{2}-\d{2}/gu, "")
    .replace(/\s*[🔺⏫🔼🔽⏬]️?/gu, "")
    .replace(RE_TAG, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
  const partes = [resto, ...tags.map((t) => `#${t}`)];
  if (fecha) partes.push(`@${fecha}${hora ? " " + hora.padStart(5, "0") : ""}`);
  if (prio !== undefined && PRIORIDAD_TOKEN[prio]) partes.push(PRIORIDAD_TOKEN[prio]);
  if (hecha) partes.push(`✓${hecha}`);
  return `${m[1]}[${m[2]}]${m[3]}${partes.join(" ")}`;
}

/**
 * Documento nuevo a partir de una nota de Tasks: conserva sus secciones de tareas a partir del
 * primer encabezado `##` que contenga tareas (las vistas ```tasks``` y la ayuda antigua se descartan).
 */
export function migrarDesdeTasks(viejo: string, cfg: Omit<ConfigDocumento, "errores">, intro?: string): string {
  const ls = viejo.split(/\r?\n/);
  const esH2 = (l: string) => /^##\s/.test(l);
  // Primer ## a partir del cual aparecen tareas, saltando el de «Tareas por asignatura» y las vistas
  let inicio = -1;
  for (let i = 0; i < ls.length; i++) {
    if (!esH2(ls[i])) continue;
    let j = i + 1;
    let conTareas = false;
    while (j < ls.length && !esH2(ls[j])) {
      if (RE_LINEA.test(ls[j])) conTareas = true;
      j++;
    }
    if (conTareas) {
      inicio = i;
      break;
    }
  }
  const cuerpo = inicio >= 0 ? ls.slice(inicio).map(convertirLineaTasks) : [];
  while (cuerpo.length && cuerpo[cuerpo.length - 1].trim() === "") cuerpo.pop();
  return [
    CABECERA,
    ...(intro ? [intro, ""] : []),
    ...cuerpo,
    "",
    "## Otras tareas",
    "",
    escribirConfig(cfg),
  ].join("\n");
}
