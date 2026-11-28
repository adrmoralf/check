// Sintaxis de una tarea (una línea de Markdown):
//
//   - [ ] Entregar la memoria #RIS @2027-01-20 23:59 !alta
//   - [x] Repasar el tema 2 #CI @2026-11-20 ✓2026-11-19
//
//   #ETIQUETA          asignatura (o cualquier etiqueta)
//   @AAAA-MM-DD HH:MM  fecha límite; la hora es opcional
//   !max !alta !media !baja   prioridad (sin nada = normal)
//   +examen +entrega +practica +avance   tipo (sin nada, Inicio lo deduce del texto)
//   ✓AAAA-MM-DD        día en que se hizo (lo pone la app al marcarla)
//   ↻semanal           se repite (diaria, laborables, semanal, quincenal, mensual, anual,
//                      un día de la semana como ↻lunes, o cada N días/semanas/meses: ↻3d ↻2s ↻1m)
//   - [-]              cancelada
//
// Las líneas con sangría que siguen a una tarea y no son casillas son sus notas.
//
// Para no perder nada que se escriba a mano o con IA, también se entiende la sintaxis
// del plugin Tasks de Obsidian (📅 fecha, ⏫ prioridad, ✅ hecha).

import { DIAS_LARGOS, ISO, diaSemana, esFinDeSemana, esISO, sumarDias } from "./fechas";

export type TipoTarea = "examen" | "entrega" | "practica" | "avance";
export const TIPOS: { v: TipoTarea; nombre: string }[] = [
  { v: "examen", nombre: "Examen" },
  { v: "entrega", nombre: "Entrega" },
  { v: "practica", nombre: "Práctica" },
  { v: "avance", nombre: "Avance" },
];

export interface Tarea {
  estado: string;
  hecha: boolean;
  cancelada: boolean;
  descripcion: string;
  tags: string[];
  /** 0 mínima · 1 baja · 2 normal · 3 media · 4 alta · 5 máxima */
  prioridad: number;
  /** Tipo puesto a mano (+examen, +entrega, +practica, +avance) */
  tipo: TipoTarea | null;
  vence: ISO | null;
  /** Hora límite "HH:MM" (opcional) */
  hora: string | null;
  programada: ISO | null;
  inicio: ISO | null;
  hechaEl: ISO | null;
  /** Fecha que usan las vistas (la de vencimiento). */
  fecha: ISO | null;
  recurrente: boolean;
  /** Regla de repetición (sin el ↻), p. ej. "semanal" o "lunes" */
  repetir: string | null;
}

export const PRIORIDAD_TOKEN: Record<number, string> = { 5: "!max", 4: "!alta", 3: "!media", 1: "!baja", 0: "!min" };
export const PRIORIDAD_NOMBRE: Record<number, string> = {
  5: "máxima", 4: "alta", 3: "media", 2: "normal", 1: "baja", 0: "mínima",
};

const RE_LINEA = /^(\s*(?:[-*+]|\d+[.)])\s+)\[(.)\](\s+)(.*)$/;
const RE_TAG = /(^|\s)#([^\s#\]|,;:!?()]+)/g;
const RE_FECHA = /(^|\s)@(\d{4}-\d{2}-\d{2})(?:\s+(\d{1,2}:\d{2}))?(?=\s|$)/u;
const RE_PRIO = /(^|\s)!(máxima|maxima|máx|max|alta|media|baja|mínima|minima|mín|min)(?=\s|$)/iu;
const RE_TIPO = /(^|\s)\+(examen|entrega|pr[aá]ctica|avance)(?=\s|$)/iu;
const RE_HECHA = /(^|\s)[✓✔]\s?(\d{4}-\d{2}-\d{2})(?=\s|$)/u;
const RE_REPETIR = /(^|\s)↻\s?([\p{L}\d]+)(?=\s|$)/u;
// Compatibilidad con Tasks
const RE_TASKS_FECHA = (e: string) => new RegExp(`(^|\\s)${e}\\uFE0F?\\s*(\\d{4}-\\d{2}-\\d{2})`, "u");
const EMOJI_PRIO: [string, number][] = [["🔺", 5], ["⏫", 4], ["🔼", 3], ["🔽", 1], ["⏬", 0]];

const PRIO_VALOR: Record<string, number> = {
  máxima: 5, maxima: 5, máx: 5, max: 5, alta: 4, media: 3, baja: 1, mínima: 0, minima: 0, mín: 0, min: 0,
};

const hora2 = (h: string) => h.padStart(5, "0");

export function esLineaTarea(linea: string): boolean {
  return RE_LINEA.test(linea);
}

/** Quita la sintaxis de enlaces de Markdown y Obsidian para mostrar el texto. */
export function textoPlano(s: string): string {
  return s
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2")
    .replace(/\[\[([^\]]+)\]\]/g, (_, ruta: string) => ruta.split("#")[0].split("/").pop() ?? ruta)
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/(\*\*|__|`)/g, "");
}

export function parsearTarea(linea: string): Tarea | null {
  const m = linea.match(RE_LINEA);
  if (!m) return null;
  const estado = m[2];
  const resto = m[4];

  const tags: string[] = [];
  for (const t of resto.matchAll(RE_TAG)) tags.push(t[2]);

  // Fecha y hora
  let vence: ISO | null = null;
  let hora: string | null = null;
  const f = resto.match(RE_FECHA);
  if (f && esISO(f[2])) {
    vence = f[2];
    hora = f[3] ? hora2(f[3]) : null;
  } else {
    const t = resto.match(RE_TASKS_FECHA("📅"));
    if (t && esISO(t[2])) vence = t[2];
  }

  // Prioridad
  let prioridad = 2;
  const p = resto.match(RE_PRIO);
  if (p) prioridad = PRIO_VALOR[p[2].toLowerCase()] ?? 2;
  else for (const [e, v] of EMOJI_PRIO) if (resto.includes(e)) { prioridad = v; break; }

  const tp = resto.match(RE_TIPO);
  const tipo = tp ? (tp[2].toLowerCase().replace("á", "a") as TipoTarea) : null;

  // Fecha de hecha
  let hechaEl: ISO | null = null;
  const h = resto.match(RE_HECHA) ?? resto.match(RE_TASKS_FECHA("✅"));
  if (h && esISO(h[2])) hechaEl = h[2];

  const rep = resto.match(RE_REPETIR);
  const repetir = rep && reglaValida(rep[2]) ? normalizarRegla(rep[2]) : null;

  const descripcion = textoPlano(
    resto
      .replace(new RegExp(RE_REPETIR.source, "gu"), "$1")
      .replace(new RegExp(RE_FECHA.source, "gu"), "$1")
      .replace(new RegExp(RE_PRIO.source, "giu"), "$1")
      .replace(new RegExp(RE_TIPO.source, "giu"), "$1")
      .replace(new RegExp(RE_HECHA.source, "gu"), "$1")
      .replace(/\s*(📅|⏳|🛫|✅|❌|➕)️?\s*\d{4}-\d{2}-\d{2}/gu, "")
      .replace(/\s*[🔺⏫🔼🔽⏬]️?/gu, "")
      .replace(RE_TAG, "$1")
      .replace(/\s\^[\w-]+\s*$/, ""),
  )
    .replace(/\(\s*\)/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  return {
    estado,
    hecha: estado === "x" || estado === "X",
    cancelada: estado === "-",
    descripcion,
    tags,
    prioridad,
    tipo,
    vence,
    hora,
    programada: null,
    inicio: null,
    hechaEl,
    fecha: vence,
    recurrente: repetir !== null,
    repetir,
  };
}

// ---------------------------------------------------------------- repetición

const sinTildes = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const DIAS_NORM = DIAS_LARGOS.map(sinTildes);
const ALIAS_REGLA: Record<string, string> = {
  diario: "diaria", diaria: "diaria", laborables: "laborables", laborable: "laborables",
  semanal: "semanal", quincenal: "quincenal", mensual: "mensual", anual: "anual",
};

/** Deja la regla en su forma canónica (sin tildes en los días, alias resueltos). */
export function normalizarRegla(r: string): string {
  const n = sinTildes(r);
  if (ALIAS_REGLA[n]) return ALIAS_REGLA[n];
  const i = DIAS_NORM.findIndex((d) => d === n || d.slice(0, 3) === n);
  if (i >= 0) return DIAS_LARGOS[i];
  return n;
}

export function reglaValida(r: string): boolean {
  const n = normalizarRegla(r);
  return Object.values(ALIAS_REGLA).includes(n) || DIAS_LARGOS.includes(n) || /^[1-9]\d{0,2}[dsm]$/.test(n);
}

/** Suma meses conservando el día (el 31 pasa al último día de los meses más cortos). */
function masMeses(iso: ISO, n: number): ISO {
  const [a, m, d] = iso.split("-").map(Number);
  const total = a * 12 + (m - 1) + n;
  const anio = Math.floor(total / 12);
  const mes = (total % 12) + 1;
  const ultimo = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
  return `${anio}-${String(mes).padStart(2, "0")}-${String(Math.min(d, ultimo)).padStart(2, "0")}`;
}

/** Texto legible de la regla: «cada semana», «cada lunes»… */
export function describirRegla(r: string): string {
  const n = normalizarRegla(r);
  const fijos: Record<string, string> = {
    diaria: "cada día", laborables: "cada día laborable", semanal: "cada semana", quincenal: "cada 2 semanas",
    mensual: "cada mes", anual: "cada año",
  };
  if (fijos[n]) return fijos[n];
  if (DIAS_LARGOS.includes(n)) return `cada ${n}`;
  const m = n.match(/^(\d+)([dsm])$/);
  if (m) {
    const k = Number(m[1]);
    const u = { d: ["día", "días"], s: ["semana", "semanas"], m: ["mes", "meses"] }[m[2] as "d" | "s" | "m"];
    return k === 1 ? `cada ${u[0]}` : `cada ${k} ${u[1]}`;
  }
  return n;
}

/** Fecha siguiente a `desde` según la regla. */
export function siguienteSegunRegla(r: string, desde: ISO): ISO {
  const n = normalizarRegla(r);
  switch (n) {
    case "diaria": return sumarDias(desde, 1);
    case "laborables": {
      let d = sumarDias(desde, 1);
      while (esFinDeSemana(d)) d = sumarDias(d, 1);
      return d;
    }
    case "semanal": return sumarDias(desde, 7);
    case "quincenal": return sumarDias(desde, 14);
    case "mensual": return masMeses(desde, 1);
    case "anual": return masMeses(desde, 12);
  }
  const dia = DIAS_LARGOS.indexOf(n);
  if (dia >= 0) {
    let d = sumarDias(desde, 1);
    while (diaSemana(d) !== dia) d = sumarDias(d, 1);
    return d;
  }
  const m = n.match(/^(\d+)([dsm])$/);
  if (m) {
    const k = Math.max(1, Number(m[1]));
    return m[2] === "d" ? sumarDias(desde, k) : m[2] === "s" ? sumarDias(desde, 7 * k) : masMeses(desde, k);
  }
  return sumarDias(desde, 7);
}

/** Próxima fecha de una tarea que se repite: después de su fecha y, como pronto, mañana. */
export function proximaFecha(r: string, fecha: ISO | null, hoy: ISO): ISO {
  let d = siguienteSegunRegla(r, fecha ?? hoy);
  for (let i = 0; i < 1000 && d <= hoy; i++) d = siguienteSegunRegla(r, d);
  return d;
}

/** Línea de la siguiente repetición: pendiente, con la nueva fecha y sin ✓. */
export function lineaSiguiente(linea: string, hoy: ISO): string | null {
  const t = parsearTarea(linea);
  if (!t?.repetir) return null;
  const m = linea.match(RE_LINEA)!;
  const base = (m[1] + "[ ]" + m[3] + m[4])
    .replace(new RegExp(RE_HECHA.source, "gu"), "$1")
    .replace(/\s*✅️?\s*\d{4}-\d{2}-\d{2}/gu, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+$/, "");
  return cambiarFecha(base, proximaFecha(t.repetir, t.fecha, hoy));
}

// ---------------------------------------------------------------- edición de líneas

function anadirAlFinal(linea: string, trozo: string): string {
  return `${linea.replace(/\s+$/, "")} ${trozo}`;
}

/** Cambia (o quita) la fecha; si no se indica hora se conserva la que hubiera. */
export function cambiarFecha(linea: string, nueva: ISO | null, hora?: string | null): string {
  const actual = linea.match(RE_FECHA);
  const horaFinal = hora === undefined ? (actual?.[3] ? hora2(actual[3]) : null) : hora ? hora2(hora) : null;
  const token = nueva ? `@${nueva}${horaFinal ? " " + horaFinal : ""}` : "";
  // Si la fecha estaba en sintaxis de Tasks, se pasa a la propia
  let base = linea.replace(/\s*📅️?\s*\d{4}-\d{2}-\d{2}/u, "");
  if (base.match(RE_FECHA)) {
    base = base.replace(RE_FECHA, (_t, pre) => (token ? `${pre}${token}` : ""));
    return base.replace(/\s{2,}/g, " ").replace(/\s+$/, "");
  }
  return token ? anadirAlFinal(base, token) : base;
}

export function cambiarPrioridad(linea: string, prioridad: number): string {
  const sin = linea
    .replace(new RegExp(RE_PRIO.source, "giu"), "$1")
    .replace(/\s*[🔺⏫🔼🔽⏬]️?/gu, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+$/, "");
  const token = PRIORIDAD_TOKEN[prioridad];
  return token ? anadirAlFinal(sin, token) : sin;
}

/** Marca o desmarca como hecha, poniendo o quitando ✓fecha. */
export function alternarHecha(linea: string, hoy: ISO): string {
  const m = linea.match(RE_LINEA);
  if (!m) return linea;
  const hecha = m[2] === "x" || m[2] === "X";
  if (hecha) {
    return (m[1] + "[ ]" + m[3] + m[4])
      .replace(new RegExp(RE_HECHA.source, "gu"), "$1")
      .replace(/\s*✅️?\s*\d{4}-\d{2}-\d{2}/gu, "")
      .replace(/\s{2,}/g, " ")
      .replace(/\s+$/, "");
  }
  return anadirAlFinal(m[1] + "[x]" + m[3] + m[4], `✓${hoy}`);
}

export interface NuevaTarea {
  descripcion: string;
  tag?: string;
  fecha?: ISO | null;
  hora?: string | null;
  prioridad?: number;
  tipo?: TipoTarea | null;
  repetir?: string | null;
}

export function construirLinea(t: NuevaTarea): string {
  const partes = [`- [ ] ${t.descripcion.trim()}`];
  if (t.tag) partes.push(`#${t.tag.replace(/^#/, "")}`);
  if (t.fecha) partes.push(`@${t.fecha}${t.hora ? " " + hora2(t.hora) : ""}`);
  const p = t.prioridad !== undefined ? PRIORIDAD_TOKEN[t.prioridad] : undefined;
  if (p) partes.push(p);
  if (t.tipo) partes.push(`+${t.tipo}`);
  if (t.repetir) partes.push(`↻${normalizarRegla(t.repetir)}`);
  return partes.join(" ");
}

/** Reescribe una línea existente con nuevos datos, conservando sangría, estado y fecha de hecha. */
export function reescribirLinea(linea: string, t: NuevaTarea): string {
  const m = linea.match(RE_LINEA);
  if (!m) return linea;
  const hechaEl = m[4].match(RE_HECHA)?.[2];
  const nueva = construirLinea(t).replace(/^- \[ \] /, "");
  return `${m[1]}[${m[2]}]${m[3]}${nueva}${hechaEl ? ` ✓${hechaEl}` : ""}`;
}
