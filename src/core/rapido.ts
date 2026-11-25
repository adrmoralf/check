// Añadir rápido escribiendo: convierte una frase como «memoria RIS mañana 23:59 alta» en una
// tarea con asignatura, fecha, hora, prioridad, tipo (+examen, +entrega, +practica) y repetición. Lo que no se reconoce queda como texto.

import { DIAS_LARGOS, ISO, MESES_LARGOS, diaSemana, esISO, proximoLunes, sumarDias } from "./fechas";
import { NuevaTarea, TipoTarea, normalizarRegla } from "./tarea";

export interface Rapida extends NuevaTarea {
  descripcion: string;
  /** Lo que se ha entendido, para enseñarlo mientras se escribe */
  entendido: string[];
  /** Tramos reconocidos [inicio, fin) en el texto tal como se escribió, para resaltarlos */
  tramos: [number, number][];
}

const sinTildes = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const DIAS = DIAS_LARGOS.map(sinTildes);
const MESES = MESES_LARGOS.map(sinTildes);
const dos = (n: number) => String(n).padStart(2, "0");

/** Siguiente día de la semana `dia` (0 = domingo) después de hoy; con `incluirHoy` puede ser hoy. */
function siguienteDia(hoy: ISO, dia: number, incluirHoy = false): ISO {
  let d = incluirHoy ? hoy : sumarDias(hoy, 1);
  while (diaSemana(d) !== dia) d = sumarDias(d, 1);
  return d;
}

/** Fecha con día y mes: la próxima vez que llega (este año o el siguiente). */
function fechaDiaMes(hoy: ISO, dia: number, mes: number, anio?: number): ISO | null {
  let a = anio ?? Number(hoy.slice(0, 4));
  if (anio !== undefined && anio < 100) a = 2000 + anio;
  let iso = `${a}-${dos(mes)}-${dos(dia)}`;
  if (!esISO(iso)) return null;
  if (anio === undefined && iso < hoy) {
    iso = `${a + 1}-${dos(mes)}-${dos(dia)}`;
    if (!esISO(iso)) return null;
  }
  return iso;
}

interface Regla {
  re: RegExp;
  aplicar: (m: RegExpMatchArray, r: Rapida, hoy: ISO) => boolean | void;
}

const NUM_DIA = "(lunes|martes|miercoles|jueves|viernes|sabado|domingo)";
const MES = `(${MESES.join("|")}|ene|feb|mar|abr|may|jun|jul|ago|sep|sept|oct|nov|dic)`;

const mesDe = (s: string) => {
  const n = sinTildes(s);
  const i = MESES.findIndex((m) => m === n || m.startsWith(n.slice(0, 3)));
  return i + 1;
};

// El orden importa: primero lo más largo («pasado mañana» antes que «mañana»)
const REGLAS: Regla[] = [
  // Repetición
  { re: /\b(?:cada dia laborable|los dias laborables|entre semana|laborables)\b/, aplicar: (_m, r) => { r.repetir = "laborables"; } },
  { re: /\b(?:cada dia|todos los dias|a diario|diariamente)\b/, aplicar: (_m, r) => { r.repetir = "diaria"; } },
  { re: /\bcada (\d{1,3}) (dias|semanas|meses)\b/, aplicar: (m, r) => { r.repetir = `${m[1]}${m[2][0] === "d" ? "d" : m[2][0] === "s" ? "s" : "m"}`; } },
  { re: /\b(?:cada (?:dos|2) semanas|quincenalmente|cada quincena)\b/, aplicar: (_m, r) => { r.repetir = "quincenal"; } },
  { re: /\b(?:cada semana|todas las semanas|semanalmente)\b/, aplicar: (_m, r) => { r.repetir = "semanal"; } },
  { re: /\b(?:cada mes|todos los meses|mensualmente)\b/, aplicar: (_m, r) => { r.repetir = "mensual"; } },
  { re: /\b(?:cada ano|todos los anos|anualmente)\b/, aplicar: (_m, r) => { r.repetir = "anual"; } },
  {
    re: new RegExp(`\\b(?:cada|todos los) ${NUM_DIA}s?\\b`),
    aplicar: (m, r, hoy) => {
      const d = DIAS.indexOf(m[1]);
      r.repetir = normalizarRegla(DIAS_LARGOS[d]);
      r.fecha ??= siguienteDia(hoy, d, true);
    },
  },

  // Fechas
  { re: /\bpasado manana\b/, aplicar: (_m, r, hoy) => { r.fecha = sumarDias(hoy, 2); } },
  { re: /\b(?:para )?manana\b(?! (?:por|de) la)/, aplicar: (_m, r, hoy) => { r.fecha = sumarDias(hoy, 1); } },
  { re: /\b(?:para )?hoy\b/, aplicar: (_m, r, hoy) => { r.fecha = hoy; } },
  { re: /\b(?:la )?(?:semana que viene|proxima semana)\b/, aplicar: (_m, r, hoy) => { r.fecha = proximoLunes(hoy); } },
  { re: /\b(?:en|dentro de) (\d{1,3}) (dias?|semanas?)\b/, aplicar: (m, r, hoy) => { r.fecha = sumarDias(hoy, Number(m[1]) * (m[2].startsWith("s") ? 7 : 1)); } },
  {
    // «el lunes», «el próximo lunes», «el lunes que viene»: el siguiente lunes después de hoy
    re: new RegExp(`\\b(?:(?:el|este|para el) )?(?:proximo )?${NUM_DIA}(?: que viene)?\\b`),
    aplicar: (m, r, hoy) => { r.fecha = siguienteDia(hoy, DIAS.indexOf(m[1])); },
  },
  { re: /\b(\d{4})-(\d{2})-(\d{2})\b/, aplicar: (m, r) => { const iso = `${m[1]}-${m[2]}-${m[3]}`; if (!esISO(iso)) return false; r.fecha = iso; } },
  {
    re: /\b(?:el )?(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?\b/,
    aplicar: (m, r, hoy) => {
      const f = fechaDiaMes(hoy, Number(m[1]), Number(m[2]), m[3] ? Number(m[3]) : undefined);
      if (!f) return false;
      r.fecha = f;
    },
  },
  {
    re: new RegExp(`\\b(?:el )?(\\d{1,2}) (?:de )?${MES}(?: (?:de )?(\\d{4}))?\\b`),
    aplicar: (m, r, hoy) => {
      const f = fechaDiaMes(hoy, Number(m[1]), mesDe(m[2]), m[3] ? Number(m[3]) : undefined);
      if (!f) return false;
      r.fecha = f;
    },
  },

  // Hora
  {
    re: /\b(?:a las |a la )?(\d{1,2})(?::(\d{2}))?(?: ?(?:h\b|horas\b))?(?: (de la (?:manana|tarde|noche)|pm|am))?/,
    aplicar: (m, r) => {
      // Solo si hay una señal clara de que es una hora
      const texto = m[0];
      if (!/:|a las|a la|h\b|horas|de la|pm|am/.test(texto)) return false;
      let h = Number(m[1]);
      const min = m[2] ? Number(m[2]) : 0;
      if ((m[3] === "pm" || m[3] === "de la tarde" || m[3] === "de la noche") && h < 12) h += 12;
      if (h > 23 || min > 59) return false;
      r.hora = `${dos(h)}:${dos(min)}`;
    },
  },

  // Tipo
  { re: /(?:^|\s)\+(examen|entrega|practica)\b/, aplicar: (m, r) => { r.tipo = m[1] as TipoTarea; } },

  // Prioridad
  { re: /(?:^|\s)!(max|maxima|alta|media|baja)\b/, aplicar: (m, r) => { r.prioridad = prioridadDe(m[1]); } },
  { re: /\b(?:prioridad (maxima|alta|media|baja)|(maxima|alta|media|baja) prioridad)\b/, aplicar: (m, r) => { r.prioridad = prioridadDe(m[1] ?? m[2]); } },
  { re: /\b(?:muy urgente|urgentisimo|urgente)\b/, aplicar: (_m, r) => { r.prioridad = 5; } },
  { re: /\bimportante\b/, aplicar: (_m, r) => { r.prioridad = 4; } },
  // «alta», «baja»… sueltas al final de la frase
  { re: /\b(maxima|alta|media|baja)\s*$/, aplicar: (m, r) => { r.prioridad = prioridadDe(m[1]); } },
];

function prioridadDe(s: string): number {
  return { max: 5, maxima: 5, alta: 4, media: 3, baja: 1 }[s] ?? 2;
}

/**
 * Interpreta una frase. `asignaturas` sirve para reconocer «RIS» o «#RIS»: las etiquetas cortas
 * (2 letras) solo en mayúsculas, para no confundir «pa» o «ci» con palabras normales.
 */
export function parsearRapido(texto: string, hoy: ISO, asignaturas: { tag: string; nombre: string }[]): Rapida {
  const r: Rapida = { descripcion: "", entendido: [], tramos: [], fecha: null, hora: null, prioridad: 2, tipo: null, repetir: null };
  // Se trabaja sobre una copia en minúsculas y sin tildes con las mismas posiciones que el original
  let original = ` ${texto.trim()} `;
  // Posición en `original` → posición en el texto escrito (se quitó un espacio delante y los iniciales)
  const desfase = texto.length - texto.trimStart().length - 1;
  const quitar = (desde: number, hasta: number) => {
    // El tramo resaltado no incluye los espacios de los bordes
    let a = desde;
    let b = hasta;
    while (a < b && original[a] === " ") a++;
    while (b > a && original[b - 1] === " ") b--;
    if (b > a) r.tramos.push([a + desfase, b + desfase]);
    original = original.slice(0, desde) + " ".repeat(hasta - desde) + original.slice(hasta);
  };

  // Asignatura
  const conAlmohadilla = original.match(/(^|\s)#([^\s#]+)/);
  if (conAlmohadilla) {
    const a = asignaturas.find((x) => x.tag.toLowerCase() === conAlmohadilla[2].toLowerCase());
    r.tag = a?.tag ?? conAlmohadilla[2];
    const i = conAlmohadilla.index! + conAlmohadilla[1].length;
    quitar(i, i + conAlmohadilla[2].length + 1);
  } else {
    for (const a of [...asignaturas].sort((x, y) => y.tag.length - x.tag.length)) {
      const flags = a.tag.length >= 3 ? "i" : "";
      const m = original.match(new RegExp(`(^|[\\s,.;(])(${a.tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})(?=$|[\\s,.;)])`, flags));
      if (m) {
        r.tag = a.tag;
        const i = m.index! + m[1].length;
        quitar(i, i + m[2].length);
        break;
      }
    }
  }

  // Cada regla se prueba en todas sus apariciones hasta que una encaja (p. ej. «tema 2 a las 10»)
  for (const regla of REGLAS) {
    const re = new RegExp(regla.re.source, regla.re.flags + "g");
    for (const m of sinTildes(original).matchAll(re)) {
      const antes = JSON.stringify(r);
      if (regla.aplicar(m, r, hoy) === false) {
        Object.assign(r, JSON.parse(antes));
        continue;
      }
      quitar(m.index!, m.index! + m[0].length);
      break;
    }
  }

  // Lo que queda es la descripción; fuera conectores sueltos al principio o al final
  let d = original.replace(/\s{2,}/g, " ").trim();
  const sueltas = /^(?:para|de|del|el|la|a|en|y|,|-)\s+|\s+(?:para|de|del|el|la|a las|a la|a|en|y|antes del?|hasta el|,|-)$/i;
  for (let i = 0; i < 4; i++) d = d.replace(sueltas, "").trim();
  r.descripcion = d ? d.charAt(0).toUpperCase() + d.slice(1) : "";

  if (r.tag) r.entendido.push(`#${r.tag}`);
  if (r.fecha) r.entendido.push(`@${r.fecha}${r.hora ? " " + r.hora : ""}`);
  else if (r.hora) r.hora = null;
  if (r.prioridad !== 2) r.entendido.push({ 5: "!max", 4: "!alta", 3: "!media", 1: "!baja" }[r.prioridad!] ?? "");
  if (r.tipo) r.entendido.push(`+${r.tipo}`);
  if (r.repetir) r.entendido.push(`↻${r.repetir}`);
  return r;
}
