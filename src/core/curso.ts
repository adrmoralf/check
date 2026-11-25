// Calendario académico: cuatrimestres, días no lectivos y horario de clases.

import { ISO, esISO, sumarDias, diasEntre, diaSemana, esFinDeSemana } from "./fechas";

export type Cuatri = 1 | 2;

export interface Periodo {
  inicio: ISO;
  finClases: ISO;
  finExamenes: ISO;
}

export interface NoLectivo {
  desde: ISO;
  hasta: ISO;
  nombre: string;
}

export interface Clase {
  cuatri: Cuatri;
  /** 1 = lunes … 5 = viernes (6 sábado, 0 domingo) */
  dia: number;
  inicio: string;
  fin: string;
  tag: string;
  aula: string;
}

const DIAS: Record<string, number> = {
  dom: 0, domingo: 0, lun: 1, lunes: 1, mar: 2, martes: 2, mie: 3, mié: 3, miercoles: 3, miércoles: 3,
  jue: 4, jueves: 4, vie: 5, viernes: 5, sab: 6, sáb: 6, sabado: 6, sábado: 6,
};

function lineasUtiles(texto: string): { n: number; l: string }[] {
  return texto
    .split(/\r?\n/)
    .map((l, i) => ({ n: i + 1, l: l.replace(/#.*$/, "").trim() }))
    .filter((x) => x.l !== "");
}

/**
 * Una línea por día o rango, con nombre opcional:
 *   2026-12-08 Inmaculada
 *   2026-12-19..2027-01-06 Navidad
 */
export function parsearNoLectivos(texto: string): { dias: NoLectivo[]; errores: string[] } {
  const dias: NoLectivo[] = [];
  const errores: string[] = [];
  for (const { n, l } of lineasUtiles(texto)) {
    const m = l.match(/^(\d{4}-\d{2}-\d{2})(?:\s*(?:\.\.|–|-{1,2}|a)\s*(\d{4}-\d{2}-\d{2}))?\s*(.*)$/);
    if (!m || !esISO(m[1]) || (m[2] && !esISO(m[2]))) {
      errores.push(`Línea ${n}: «${l}» no es una fecha (AAAA-MM-DD) ni un rango (AAAA-MM-DD..AAAA-MM-DD).`);
      continue;
    }
    const desde = m[1];
    const hasta = m[2] ?? m[1];
    if (hasta < desde) {
      errores.push(`Línea ${n}: el rango termina antes de empezar.`);
      continue;
    }
    dias.push({ desde, hasta, nombre: m[3].trim() || "No lectivo" });
  }
  return { dias, errores };
}

export function noLectivoDe(iso: ISO, dias: NoLectivo[]): NoLectivo | undefined {
  return dias.find((d) => d.desde <= iso && iso <= d.hasta);
}

/**
 * Una línea por clase:  C1 lun 15:00-18:00 CI TL02
 * (cuatrimestre, día, horas, etiqueta de la asignatura y aula opcional, que puede tener espacios).
 */
export function parsearHorario(texto: string): { clases: Clase[]; errores: string[] } {
  const clases: Clase[] = [];
  const errores: string[] = [];
  for (const { n, l } of lineasUtiles(texto)) {
    const m = l.match(/^C?([12])\s+(\S+)\s+(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})\s+#?(\S+)(?:\s+(.+))?$/i);
    const dia = m ? DIAS[m[2].toLowerCase().normalize("NFC")] : undefined;
    if (!m || dia === undefined) {
      errores.push(`Línea ${n}: «${l}». Formato: C1 lun 15:00-18:00 CI TL02`);
      continue;
    }
    const hora = (h: string) => h.padStart(5, "0");
    clases.push({ cuatri: Number(m[1]) as Cuatri, dia, inicio: hora(m[3]), fin: hora(m[4]), tag: m[5], aula: m[6]?.trim() ?? "" });
  }
  clases.sort((a, b) => a.cuatri - b.cuatri || a.dia - b.dia || a.inicio.localeCompare(b.inicio));
  return { clases, errores };
}

/** Cuatrimestre "en curso" para una fecha: el C1 hasta sus exámenes, luego el C2. Null tras el C2. */
export function cuatrimestreDe(iso: ISO, c1: Periodo, c2: Periodo): Cuatri | null {
  if (iso <= c1.finExamenes) return 1;
  if (iso <= c2.finExamenes) return 2;
  return null;
}

export function periodoDe(c: Cuatri, c1: Periodo, c2: Periodo): Periodo {
  return c === 1 ? c1 : c2;
}

export function clasesDelDia(iso: ISO, clases: Clase[], c1: Periodo, c2: Periodo, noLectivos: NoLectivo[]): Clase[] {
  if (noLectivoDe(iso, noLectivos)) return [];
  const dia = diaSemana(iso);
  return clases.filter((c) => {
    const p = periodoDe(c.cuatri, c1, c2);
    return c.dia === dia && p.inicio <= iso && iso <= p.finClases;
  });
}

/** Días de estudio entre hoy (incluido) y `hasta` (excluido), sin fines de semana ni días no lectivos. */
export function diasLaborables(hoy: ISO, hasta: ISO, noLectivos: NoLectivo[]): number {
  let n = 0;
  const total = diasEntre(hoy, hasta);
  for (let i = 0; i < total; i++) {
    const d = sumarDias(hoy, i);
    if (!esFinDeSemana(d) && !noLectivoDe(d, noLectivos)) n++;
  }
  return n;
}

/** Fracción (0..1) del cuatrimestre transcurrida, de su inicio al final de los exámenes. */
export function avanceCuatrimestre(hoy: ISO, p: Periodo): number {
  const total = diasEntre(p.inicio, p.finExamenes);
  if (total <= 0) return 0;
  return Math.min(1, Math.max(0, diasEntre(p.inicio, hoy) / total));
}
