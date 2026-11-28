// Inserción de tareas nuevas en la nota de tareas: dentro de la sección de su asignatura
// (un encabezado con el nombre completo) o como subtarea debajo de otra tarea.

const RE_ENCABEZADO = /^(#{1,6})\s+(.*?)\s*#*\s*$/;
const RE_ITEM = /^(\s*)(?:[-*+]|\d+[.)])\s/;

export interface ResultadoInsercion {
  contenido: string;
  /** Número de línea (desde 0) donde quedó la tarea nueva. */
  linea: number;
}

function normalizar(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

function finDeSeccion(lineas: string[], desde: number, nivel: number): number {
  for (let i = desde + 1; i < lineas.length; i++) {
    const m = lineas[i].match(RE_ENCABEZADO);
    if (m && m[1].length <= nivel) return i;
  }
  return lineas.length;
}

function conSaltos(contenido: string): { lineas: string[]; eol: string } {
  const eol = contenido.includes("\r\n") ? "\r\n" : "\n";
  return { lineas: contenido.split(/\r?\n/), eol };
}

/**
 * Inserta `linea` al final de la lista de la sección cuyo encabezado es `seccion`.
 * Si no existe, crea la sección (al nivel del último encabezado que contenga tareas,
 * justo después de él) o, si no hay ninguno, al final de la nota.
 */
export function insertarEnSeccion(contenido: string, linea: string, seccion: string): ResultadoInsercion {
  const { lineas, eol } = conSaltos(contenido);
  const buscado = normalizar(seccion);

  const inicio = lineas.findIndex((l) => {
    const m = l.match(RE_ENCABEZADO);
    return m !== null && normalizar(m[2]) === buscado;
  });

  if (inicio >= 0) {
    const nivel = lineas[inicio].match(RE_ENCABEZADO)![1].length;
    const fin = finDeSeccion(lineas, inicio, nivel);
    let ultimoItem = -1;
    for (let i = inicio + 1; i < fin; i++) if (RE_ITEM.test(lineas[i])) ultimoItem = i;
    let pos: number;
    if (ultimoItem >= 0) {
      pos = ultimoItem + 1;
    } else {
      // Sección vacía: debajo del encabezado, dejando una línea en blanco
      pos = inicio + 1;
      if (lineas[pos] !== "") lineas.splice(pos, 0, "");
      pos++;
      if (lineas[pos] !== undefined && lineas[pos] !== "") lineas.splice(pos, 0, "");
    }
    lineas.splice(pos, 0, linea);
    return { contenido: lineas.join(eol), linea: pos };
  }

  // No existe: se crea tras la última sección que tenga tareas
  let ultimaConTareas = -1;
  let nivelSeccion = 3;
  for (let i = 0; i < lineas.length; i++) {
    const m = lineas[i].match(RE_ENCABEZADO);
    if (!m) continue;
    const fin = finDeSeccion(lineas, i, m[1].length);
    let tieneTareas = false;
    for (let j = i + 1; j < fin; j++) {
      if (lineas[j].match(RE_ENCABEZADO)) break;
      if (/^\s*[-*+]\s+\[.\]/.test(lineas[j])) tieneTareas = true;
    }
    if (tieneTareas) {
      ultimaConTareas = i;
      nivelSeccion = m[1].length;
    }
  }

  const bloque = [`${"#".repeat(nivelSeccion)} ${seccion}`, "", linea, ""];
  let pos: number;
  if (ultimaConTareas >= 0) {
    pos = finDeSeccion(lineas, ultimaConTareas, nivelSeccion);
    // Que quede una línea en blanco antes del encabezado nuevo
    if (pos > 0 && lineas[pos - 1] !== "") {
      lineas.splice(pos, 0, "");
      pos++;
    }
  } else {
    while (lineas.length && lineas[lineas.length - 1] === "") lineas.pop();
    lineas.push("");
    pos = lineas.length;
  }
  lineas.splice(pos, 0, ...bloque);
  return { contenido: lineas.join(eol), linea: pos + 2 };
}

/** Inserta `linea` como subtarea de la tarea de la línea `padre`, después de sus subtareas actuales. */
export function insertarSubtarea(contenido: string, linea: string, padre: number): ResultadoInsercion {
  const { lineas, eol } = conSaltos(contenido);
  const mPadre = lineas[padre]?.match(RE_ITEM);
  if (!mPadre) throw new Error("La tarea principal ya no está en esa línea.");
  const sangriaPadre = mPadre[1];

  let pos = padre + 1;
  let sangriaHijo: string | null = null;
  while (pos < lineas.length) {
    const l = lineas[pos];
    if (l.trim() === "") break;
    const sangria = l.match(/^(\s*)/)![1];
    if (sangria.length <= sangriaPadre.length) break;
    if (sangriaHijo === null && RE_ITEM.test(l)) sangriaHijo = sangria;
    pos++;
  }
  const sangria = sangriaHijo ?? sangriaPadre + (sangriaPadre.includes(" ") && !sangriaPadre.includes("\t") ? "    " : "\t");
  lineas.splice(pos, 0, sangria + linea.trimStart());
  return { contenido: lineas.join(eol), linea: pos };
}

export type DestinoMover = { padre: number } | { seccion: string };

const anchoSangria = (s: string) => (s.match(/^\s*/)?.[0] ?? "").replace(/\t/g, "    ").length;

/**
 * Mueve la tarea de la línea `linea`, con sus subtareas y notas (todo lo que tiene más sangría
 * debajo), para que sea subtarea de la tarea de la línea `padre` o una tarea suelta al final de
 * la sección `seccion`. La sangría del bloque se ajusta a su nuevo sitio.
 */
export function moverBloque(contenido: string, linea: number, destino: DestinoMover): ResultadoInsercion {
  const { lineas, eol } = conSaltos(contenido);
  if (!RE_ITEM.test(lineas[linea] ?? "")) throw new Error("La tarea ya no está en esa línea.");
  const base = anchoSangria(lineas[linea]);
  let fin = linea + 1;
  while (fin < lineas.length && lineas[fin].trim() !== "" && anchoSangria(lineas[fin]) > base) fin++;
  const n = fin - linea;
  if ("padre" in destino && destino.padre >= linea && destino.padre < fin) throw new Error("Una tarea no puede ser subtarea de sí misma ni de una de sus subtareas.");

  // El bloque sin la sangría de su primera línea (las de dentro conservan la relativa)
  const sangriaBase = lineas[linea].match(/^\s*/)![0];
  const bloque = lineas.slice(linea, fin).map((l) => (l.startsWith(sangriaBase) ? l.slice(sangriaBase.length) : l.trimStart()));
  lineas.splice(linea, n);
  const sinBloque = lineas.join(eol);

  if ("seccion" in destino) return insertarEnSeccion(sinBloque, bloque.join(eol), destino.seccion);

  const padre = destino.padre > linea ? destino.padre - n : destino.padre;
  const r = insertarSubtarea(sinBloque, bloque[0], padre);
  if (bloque.length === 1) return r;
  const ls = r.contenido.split(/\r?\n/);
  const sangria = ls[r.linea].match(/^\s*/)![0];
  ls.splice(r.linea + 1, 0, ...bloque.slice(1).map((l) => sangria + l));
  return { contenido: ls.join(eol), linea: r.linea };
}
