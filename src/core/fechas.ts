// Fechas como texto ISO "AAAA-MM-DD", sin zonas horarias: todo se calcula en UTC
// para que sumar días o restar fechas no dependa del cambio de hora.

export type ISO = string;

const MS_DIA = 86_400_000;

export const DIAS_CORTOS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
export const DIAS_LARGOS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
export const MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
export const MESES_LARGOS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

const RE_ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

export function esISO(s: string): boolean {
  const m = s.match(RE_ISO);
  if (!m) return false;
  const t = Date.UTC(+m[1], +m[2] - 1, +m[3]);
  return desdeUTC(t) === s;
}

export function aUTC(iso: ISO): number {
  const [a, m, d] = iso.split("-").map(Number);
  return Date.UTC(a, m - 1, d);
}

export function desdeUTC(t: number): ISO {
  return new Date(t).toISOString().slice(0, 10);
}

const dos = (n: number) => String(n).padStart(2, "0");

/** Fecha local de hoy (la del reloj del usuario). */
export function hoyISO(ahora: Date = new Date()): ISO {
  return `${ahora.getFullYear()}-${dos(ahora.getMonth() + 1)}-${dos(ahora.getDate())}`;
}

export function sumarDias(iso: ISO, n: number): ISO {
  return desdeUTC(aUTC(iso) + n * MS_DIA);
}

/** Días desde `desde` hasta `hasta` (positivo si `hasta` es posterior). */
export function diasEntre(desde: ISO, hasta: ISO): number {
  return Math.round((aUTC(hasta) - aUTC(desde)) / MS_DIA);
}

/** 0 = domingo … 6 = sábado. */
export function diaSemana(iso: ISO): number {
  return new Date(aUTC(iso)).getUTCDay();
}

export function esFinDeSemana(iso: ISO): boolean {
  const d = diaSemana(iso);
  return d === 0 || d === 6;
}

export function lunesDe(iso: ISO): ISO {
  return sumarDias(iso, -((diaSemana(iso) + 6) % 7));
}

export function proximoLunes(iso: ISO): ISO {
  return sumarDias(lunesDe(iso), 7);
}

export function primeroDeMes(iso: ISO): ISO {
  return iso.slice(0, 8) + "01";
}

export function sumarMeses(iso: ISO, n: number): ISO {
  const [a, m] = iso.split("-").map(Number);
  const total = a * 12 + (m - 1) + n;
  return `${Math.floor(total / 12)}-${dos((total % 12) + 1)}-01`;
}

export function maxISO(a: ISO, b: ISO): ISO {
  return a > b ? a : b;
}

/** "mié 18 nov" */
export function fechaCorta(iso: ISO): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${DIAS_CORTOS[diaSemana(iso)]} ${d} ${MESES_CORTOS[m - 1]}`;
}

/** "miércoles, 18 de noviembre" */
export function fechaLarga(iso: ISO): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${DIAS_LARGOS[diaSemana(iso)]}, ${d} de ${MESES_LARGOS[m - 1]}`;
}

/** "18 nov" (sin día de la semana) */
export function diaMes(iso: ISO): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${d} ${MESES_CORTOS[m - 1]}`;
}

/** Texto relativo: "hoy", "mañana", "ayer", "hace 3 días" o la fecha corta. */
export function relativa(iso: ISO, hoy: ISO): string {
  const d = diasEntre(hoy, iso);
  if (d === 0) return "hoy";
  if (d === 1) return "mañana";
  if (d === -1) return "ayer";
  if (d < 0) return `hace ${-d} días`;
  return fechaCorta(iso);
}
