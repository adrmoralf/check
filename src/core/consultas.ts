// Consultas sobre el índice de tareas que usan las vistas (puras, sin Obsidian).

import { examenPasado } from "./entregas";
import { ISO, diasEntre, hoyISO, lunesDe, sumarDias } from "./fechas";
import { Tarea } from "./tarea";

export interface TareaIdx extends Tarea {
  path: string;
  /** Línea (desde 0) en su archivo */
  linea: number;
  texto: string;
  /** Línea de la tarea padre si es una subtarea */
  padre: number | null;
  /** Notas: líneas con sangría justo debajo que no son casillas */
  notas: string[];
}

const ancho = (s: string) => (s.match(/^\s*/)?.[0] ?? "").replace(/\t/g, "    ").length;
const RE_CASILLA = /^\s*(?:[-*+]|\d+[.)])\s+\[.\]/;

/** Líneas de notas que siguen a la tarea de la línea `i` (cuántas y su texto limpio). */
export function notasDe(lineas: string[], i: number): string[] {
  const base = ancho(lineas[i] ?? "");
  const res: string[] = [];
  for (let j = i + 1; j < lineas.length; j++) {
    const l = lineas[j];
    if (l.trim() === "" || RE_CASILLA.test(l) || ancho(l) <= base) break;
    res.push(l.trim().replace(/^[-*+]\s+/, ""));
  }
  return res;
}

export interface ItemLista {
  linea: number;
  padre: number;
  esTarea: boolean;
}

export const clave = (t: { path: string; linea: number }) => `${t.path}::${t.linea}`;

/** Convierte las líneas de un archivo y sus elementos de lista en tareas indexadas. */
export function extraerTareas(
  path: string,
  lineas: string[],
  items: ItemLista[],
  parsear: (l: string) => Tarea | null,
): TareaIdx[] {
  const tareas: TareaIdx[] = [];
  const esTarea = new Set(items.filter((i) => i.esTarea).map((i) => i.linea));
  const porLinea = new Map(items.map((i) => [i.linea, i]));
  for (const it of items) {
    if (!it.esTarea) continue;
    const texto = lineas[it.linea] ?? "";
    const t = parsear(texto);
    if (!t) continue;
    // El padre es la tarea más cercana hacia arriba (saltando las notas escritas como viñetas)
    let p = it.padre;
    while (p >= 0 && !esTarea.has(p)) p = porLinea.get(p)?.padre ?? -1;
    const padre = p >= 0 ? p : null;
    tareas.push({ ...t, path, linea: it.linea, texto, padre, notas: notasDe(lineas, it.linea) });
  }
  return tareas;
}

/** Pendiente: sin hacer ni cancelar (un examen que ya pasó cuenta como hecho, ver examenPasado). */
export const pendiente = (t: Tarea) => !t.hecha && !t.cancelada && !examenPasado(t, hoyISO());

/** Hecha a mano o, si es un examen, porque su fecha ya pasó. */
export const terminada = (t: Tarea, hoy: ISO = hoyISO()) => t.hecha || examenPasado(t, hoy);

export function ordenar<T extends Tarea>(ts: T[]): T[] {
  return [...ts].sort((a, b) => {
    if (a.fecha && b.fecha && a.fecha !== b.fecha) return a.fecha < b.fecha ? -1 : 1;
    if (!!a.fecha !== !!b.fecha) return a.fecha ? -1 : 1;
    return b.prioridad - a.prioridad || a.descripcion.localeCompare(b.descripcion);
  });
}

export interface Filtro {
  tags: Set<string>;
  texto: string;
}

export function filtrar<T extends Tarea>(ts: T[], f: Filtro): T[] {
  const texto = f.texto.trim().toLowerCase();
  return ts.filter(
    (t) =>
      (f.tags.size === 0 || t.tags.some((tag) => f.tags.has(tag))) &&
      (!texto || t.descripcion.toLowerCase().includes(texto) || t.tags.some((tag) => tag.toLowerCase().includes(texto))),
  );
}

export function subtareas(ts: TareaIdx[], t: TareaIdx): TareaIdx[] {
  return ts.filter((x) => x.path === t.path && x.padre === t.linea && !x.cancelada);
}

export interface Resumen {
  atrasadas: TareaIdx[];
  hoy: TareaIdx[];
  semana: TareaIdx[];
  sinFecha: TareaIdx[];
}

export function resumen(ts: TareaIdx[], hoy: ISO): Resumen {
  const pend = ordenar(ts.filter(pendiente));
  return {
    atrasadas: pend.filter((t) => t.fecha !== null && t.fecha < hoy),
    hoy: pend.filter((t) => t.fecha === hoy),
    semana: pend.filter((t) => t.fecha !== null && t.fecha >= hoy && diasEntre(hoy, t.fecha) <= 7),
    sinFecha: pend.filter((t) => t.fecha === null),
  };
}

export function importantes(ts: TareaIdx[], hoy: ISO, minimo: number): TareaIdx[] {
  return ordenar(ts.filter((t) => pendiente(t) && t.fecha !== null && t.fecha >= hoy && t.prioridad >= minimo));
}

/** Tareas pendientes agrupadas por su fecha, para `n` días desde `desde`. */
export function porDia(ts: TareaIdx[], desde: ISO, n: number): Map<ISO, TareaIdx[]> {
  const mapa = new Map<ISO, TareaIdx[]>();
  for (let i = 0; i < n; i++) mapa.set(sumarDias(desde, i), []);
  for (const t of ordenar(ts.filter(pendiente))) {
    if (t.fecha && mapa.has(t.fecha)) mapa.get(t.fecha)!.push(t);
  }
  return mapa;
}

export interface Progreso {
  hechas: number;
  total: number;
  pendientes: number;
  proxima: ISO | null;
}

export function progresoPorTag(ts: TareaIdx[], hoy: ISO): Map<string, Progreso> {
  const mapa = new Map<string, Progreso>();
  for (const t of ts) {
    if (t.cancelada) continue;
    for (const tag of t.tags.length ? t.tags : [""]) {
      const p = mapa.get(tag) ?? { hechas: 0, total: 0, pendientes: 0, proxima: null };
      p.total++;
      if (terminada(t, hoy)) p.hechas++;
      else {
        p.pendientes++;
        if (t.fecha && t.fecha >= hoy && (!p.proxima || t.fecha < p.proxima)) p.proxima = t.fecha;
      }
      mapa.set(tag, p);
    }
  }
  return mapa;
}

/** Tareas completadas en cada una de las últimas `semanas` semanas (de lunes a domingo), la última es la actual. */
export function completadasPorSemana(ts: TareaIdx[], hoy: ISO, semanas: number): { lunes: ISO; n: number }[] {
  const actual = lunesDe(hoy);
  const res = Array.from({ length: semanas }, (_, i) => ({ lunes: sumarDias(actual, -7 * (semanas - 1 - i)), n: 0 }));
  for (const t of ts) {
    if (!t.hecha || !t.hechaEl) continue;
    const i = res.findIndex((s) => s.lunes === lunesDe(t.hechaEl!));
    if (i >= 0) res[i].n++;
  }
  return res;
}

/**
 * Racha: días seguidos con al menos una tarea completada. La actual cuenta hacia atrás
 * desde hoy (o desde ayer si hoy todavía no has completado ninguna).
 */
export function rachas(ts: TareaIdx[], hoy: ISO): { actual: number; mejor: number } {
  const dias = new Set(ts.filter((t) => t.hecha && t.hechaEl).map((t) => t.hechaEl!));
  let actual = 0;
  let d = dias.has(hoy) ? hoy : sumarDias(hoy, -1);
  while (dias.has(d)) {
    actual++;
    d = sumarDias(d, -1);
  }
  let mejor = 0;
  for (const dia of [...dias].sort()) {
    if (dias.has(sumarDias(dia, -1))) continue;
    let n = 0;
    let x = dia;
    while (dias.has(x)) {
      n++;
      x = sumarDias(x, 1);
    }
    mejor = Math.max(mejor, n);
  }
  return { actual, mejor };
}
