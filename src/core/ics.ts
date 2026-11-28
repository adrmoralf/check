// Calendario .ics de las tareas pendientes con fecha, para publicarlo en el Gist al que
// está suscrito Google Calendar (sustituye al plugin iCal de Obsidian).

import { TareaIdx } from "./consultas";
import { sumarDias } from "./fechas";
import { PRIORIDAD_NOMBRE } from "./tarea";

const escapar = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** Las líneas de un .ics no pueden pasar de 75 octetos: se pliegan con salto + espacio. */
function plegar(linea: string): string {
  const bytes = new TextEncoder().encode(linea);
  if (bytes.length <= 75) return linea;
  const partes: string[] = [];
  let actual = "";
  for (const ch of linea) {
    const tam = new TextEncoder().encode(actual + ch).length;
    if (tam > (partes.length ? 74 : 75)) {
      partes.push(actual);
      actual = ch;
    } else actual += ch;
  }
  partes.push(actual);
  return partes.join("\r\n ");
}

/** Identificador estable: la misma tarea conserva el evento aunque cambie de fecha. */
function uid(t: TareaIdx): string {
  let h = 5381;
  for (const ch of `${t.descripcion}|${t.tags.join(",")}`) h = ((h << 5) + h + ch.codePointAt(0)!) >>> 0;
  return `${h.toString(36)}@tareas-app`;
}

const compacta = (iso: string) => iso.replace(/-/g, "");

/** Fecha y hora locales (las del equipo) pasadas a UTC: 20270120T225900Z. Google trata las
 *  horas sin zona de un calendario suscrito como UTC, así que hay que dar la hora absoluta. */
function utc(fecha: string, hora: string): string {
  const [a, m, d] = fecha.split("-").map(Number);
  const [h, min] = hora.split(":").map(Number);
  return new Date(a, m - 1, d, h, min).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export function generarIcs(tareas: TareaIdx[], nombreAsignatura: (tag: string) => string | undefined, ahora = new Date()): string {
  const sello = ahora.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const ev: string[] = [];
  const vistos = new Set<string>();
  for (const t of tareas) {
    // Los exámenes que ya pasaron se quedan en el calendario (no hace falta marcarlos)
    if (t.hecha || t.cancelada || !t.fecha) continue;
    let id = uid(t);
    while (vistos.has(id)) id = "x" + id;
    vistos.add(id);
    const asig = t.tags.map((tag) => nombreAsignatura(tag) ?? `#${tag}`).join(", ");
    const desc = [asig && `Asignatura: ${asig}`, t.prioridad !== 2 && `Prioridad: ${PRIORIDAD_NOMBRE[t.prioridad]}`].filter(Boolean).join("\n");
    ev.push("BEGIN:VEVENT", `UID:${id}`, `DTSTAMP:${sello}`);
    if (t.hora) {
      const inicio = utc(t.fecha, t.hora);
      ev.push(`DTSTART:${inicio}`, `DTEND:${inicio}`);
    } else {
      ev.push(`DTSTART;VALUE=DATE:${compacta(t.fecha)}`, `DTEND;VALUE=DATE:${compacta(sumarDias(t.fecha, 1))}`);
    }
    ev.push(`SUMMARY:${escapar(t.descripcion)}`);
    if (desc) ev.push(`DESCRIPTION:${escapar(desc)}`);
    if (t.tags.length) ev.push(`CATEGORIES:${t.tags.map(escapar).join(",")}`);
    ev.push("END:VEVENT");
  }
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//tareas-app//ES", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    "X-WR-CALNAME:Tareas",
    ...ev,
    "END:VCALENDAR",
  ].map(plegar).join("\r\n") + "\r\n";
}
