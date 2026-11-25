// Archivar: saca del archivo de tareas las terminadas hace tiempo (y las canceladas), con sus
// subtareas y notas, y las guarda en otro archivo con las mismas secciones. Así el archivo
// principal se queda corto y fácil de leer (también para una IA).

import { tareasDelDocumento } from "./documento";
import { ISO, diasEntre } from "./fechas";
import { insertarEnSeccion } from "./insertar";

const RE_ENCABEZADO = /^(#{1,6})\s+(.*?)\s*#*\s*$/;
const ancho = (s: string) => (s.match(/^\s*/)?.[0] ?? "").replace(/\t/g, "    ").length;

export interface ResultadoArchivo {
  principal: string;
  archivo: string;
  /** Tareas principales archivadas (sin contar subtareas) */
  n: number;
}

export function cabeceraArchivo(origen: string): string {
  return `# Archivo de tareas\n\nTareas terminadas o canceladas que Check ha sacado de ${origen}.\n`;
}

/** Bloque de la tarea de la línea `i`: ella, sus subtareas y sus notas (todo lo que tiene más sangría). */
export function finDeBloque(ls: string[], i: number): number {
  const base = ancho(ls[i]);
  let j = i + 1;
  while (j < ls.length && ls[j].trim() !== "" && ancho(ls[j]) > base) j++;
  return j;
}

/** Encabezado más cercano por encima de la línea `i` (la sección de la tarea). */
export function seccionDe(ls: string[], i: number): string {
  for (let j = i - 1; j >= 0; j--) {
    const m = ls[j].match(RE_ENCABEZADO);
    if (m) return m[2];
  }
  return "Otras tareas";
}

export function archivar(principal: string, archivo: string | null, hoy: ISO, dias: number, origen: string): ResultadoArchivo {
  const eol = principal.includes("\r\n") ? "\r\n" : "\n";
  const ls = principal.split(/\r?\n/);
  const viejas = tareasDelDocumento("", principal).filter(
    (t) => t.padre === null && (t.cancelada || (t.hecha && t.hechaEl !== null && diasEntre(t.hechaEl, hoy) > dias)),
  );
  let destino = archivo ?? cabeceraArchivo(origen);
  // De abajo arriba para que los números de línea sigan valiendo
  const bloques = viejas
    .map((t) => ({ desde: t.linea, hasta: finDeBloque(ls, t.linea), seccion: seccionDe(ls, t.linea) }))
    .sort((a, b) => b.desde - a.desde);
  for (const b of [...bloques].reverse()) {
    const lineas = ls.slice(b.desde, b.hasta);
    const sangria = lineas[0].match(/^\s*/)![0];
    const texto = lineas.map((l) => (l.startsWith(sangria) ? l.slice(sangria.length) : l)).join(eol);
    destino = insertarEnSeccion(destino, texto, b.seccion).contenido;
  }
  for (const b of bloques) ls.splice(b.desde, b.hasta - b.desde);
  return { principal: ls.join(eol), archivo: destino, n: bloques.length };
}
