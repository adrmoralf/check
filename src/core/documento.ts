// El archivo de tareas completo: tareas (en cualquier sección) y configuración
// (sección «## Configuración» con tablas y listas que se editan a mano o con IA).

import { Asignatura, CuatriAsig } from "../ajustes";
import { TareaIdx, extraerTareas, ItemLista } from "./consultas";
import { Periodo } from "./curso";
import { esISO } from "./fechas";
import { parsearTarea } from "./tarea";

export interface ConfigDocumento {
  asignaturas: Asignatura[];
  c1: Periodo;
  c2: Periodo;
  noLectivos: string;
  horario: string;
  errores: string[];
}

export const COLOR_ES: Record<string, string> = {
  rojo: "red", naranja: "orange", amarillo: "yellow", verde: "green",
  cian: "cyan", azul: "blue", morado: "purple", rosa: "pink",
};
export const COLOR_ES_INV: Record<string, string> = Object.fromEntries(Object.entries(COLOR_ES).map(([a, b]) => [b, a]));

const RE_ENCABEZADO = /^(#{1,6})\s+(.*?)\s*#*\s*$/;
const RE_ITEM = /^(\s*)(?:[-*+]|\d+[.)])\s/;
const RE_CASILLA = /^\s*(?:[-*+]|\d+[.)])\s+\[.\]\s/;

const normalizar = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const anchoSangria = (s: string) => s.replace(/\t/g, "    ").length;

export function lineas(contenido: string): string[] {
  return contenido.split(/\r?\n/);
}

/** Elementos de lista con su padre, como hace Obsidian (sangría), ignorando bloques de código. */
export function itemsDeLista(ls: string[]): ItemLista[] {
  const items: ItemLista[] = [];
  const pila: { ancho: number; linea: number }[] = [];
  let enCodigo = false;
  ls.forEach((l, i) => {
    if (/^\s*(```|~~~)/.test(l)) {
      enCodigo = !enCodigo;
      pila.length = 0;
      return;
    }
    if (enCodigo) return;
    const m = l.match(RE_ITEM);
    if (!m) {
      if (l.trim() === "" || RE_ENCABEZADO.test(l)) pila.length = 0;
      return;
    }
    const ancho = anchoSangria(m[1]);
    while (pila.length && pila[pila.length - 1].ancho >= ancho) pila.pop();
    items.push({ linea: i, padre: pila.length ? pila[pila.length - 1].linea : -1, esTarea: RE_CASILLA.test(l) });
    pila.push({ ancho, linea: i });
  });
  return items;
}

export function tareasDelDocumento(path: string, contenido: string): TareaIdx[] {
  const ls = lineas(contenido);
  return extraerTareas(path, ls, itemsDeLista(ls), parsearTarea);
}

// ---------------------------------------------------------------- configuración

/** Subsecciones de «## Configuración»: nombre normalizado → líneas. */
function seccionesConfig(ls: string[]): Map<string, string[]> {
  const res = new Map<string, string[]>();
  let dentro = false;
  let actual: string | null = null;
  for (const l of ls) {
    const m = l.match(RE_ENCABEZADO);
    if (m) {
      const nivel = m[1].length;
      if (nivel <= 2) {
        dentro = normalizar(m[2]).startsWith("configuracion");
        actual = null;
        continue;
      }
      if (dentro && nivel === 3) {
        actual = normalizar(m[2]);
        res.set(actual, []);
        continue;
      }
    }
    if (dentro && actual) res.get(actual)!.push(l);
  }
  return res;
}

function filasTabla(ls: string[]): string[][] {
  const filas = ls
    .filter((l) => l.trim().startsWith("|"))
    .map((l) => l.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim()));
  // Fuera la cabecera y la línea separadora |---|
  return filas.filter((f, i) => i > 0 && !f.every((c) => /^:?-{2,}:?$/.test(c)));
}

function itemsLista(ls: string[]): string {
  return ls
    .filter((l) => /^\s*[-*]\s+/.test(l))
    .map((l) => l.replace(/^\s*[-*]\s+/, "").trim())
    .join("\n");
}

function buscar(secciones: Map<string, string[]>, ...nombres: string[]): string[] | undefined {
  for (const [k, v] of secciones) if (nombres.some((n) => k.startsWith(n))) return v;
  return undefined;
}

export function leerConfig(contenido: string, defecto: ConfigDocumento): ConfigDocumento {
  const sec = seccionesConfig(lineas(contenido));
  const errores: string[] = [];
  const cfg: ConfigDocumento = { ...defecto, errores };

  const asig = buscar(sec, "asignaturas");
  if (asig) {
    cfg.asignaturas = filasTabla(asig).filter((f) => f[0]).map((f, i) => {
      const tag = f[0].replace(/^#/, "");
      const colorTxt = normalizar(f[2] ?? "");
      const color = COLOR_ES[colorTxt] ?? (/^#[0-9a-f]{6}$/i.test(f[2] ?? "") ? f[2] : "blue");
      if (f[2] && !COLOR_ES[colorTxt] && !/^#[0-9a-f]{6}$/i.test(f[2])) errores.push(`Asignaturas, fila ${i + 1}: color «${f[2]}» no reconocido (usa ${Object.keys(COLOR_ES).join(", ")} o #rrggbb).`);
      const c = normalizar(f[3] ?? "");
      const cuatri: CuatriAsig = c.startsWith("2") ? "2" : c.startsWith("anual") ? "anual" : "1";
      return { tag, nombre: f[1] || tag, color, cuatri };
    });
  }

  const cuat = buscar(sec, "cuatrimestres");
  if (cuat) {
    for (const f of filasTabla(cuat)) {
      const n = f[0]?.replace(/\D/g, "");
      const [inicio, finClases, finExamenes] = [f[1], f[2], f[3]];
      if (![inicio, finClases, finExamenes].every((d) => d && esISO(d))) {
        errores.push(`Cuatrimestres: la fila «${f.join(" | ")}» necesita tres fechas AAAA-MM-DD.`);
        continue;
      }
      const p: Periodo = { inicio, finClases, finExamenes };
      if (n === "1") cfg.c1 = p;
      if (n === "2") cfg.c2 = p;
    }
  }

  const nl = buscar(sec, "dias no lectivos", "festivos");
  if (nl) cfg.noLectivos = itemsLista(nl);
  const hor = buscar(sec, "horario");
  if (hor) cfg.horario = itemsLista(hor);
  return cfg;
}

/** Texto de la sección de configuración (para crear o migrar el archivo). */
export function escribirConfig(cfg: Omit<ConfigDocumento, "errores">): string {
  const color = (c: string) => COLOR_ES_INV[c] ?? c;
  const cuatri = (c: CuatriAsig) => (c === "anual" ? "anual" : c);
  return [
    "## Configuración",
    "",
    "### Asignaturas",
    "",
    "| Etiqueta | Nombre | Color | Cuatrimestre |",
    "|---|---|---|---|",
    ...cfg.asignaturas.map((a) => `| ${a.tag} | ${a.nombre} | ${color(a.color)} | ${cuatri(a.cuatri)} |`),
    "",
    "### Cuatrimestres",
    "",
    "| Cuatrimestre | Inicio de clases | Último día de clase | Fin de exámenes |",
    "|---|---|---|---|",
    `| 1 | ${cfg.c1.inicio} | ${cfg.c1.finClases} | ${cfg.c1.finExamenes} |`,
    `| 2 | ${cfg.c2.inicio} | ${cfg.c2.finClases} | ${cfg.c2.finExamenes} |`,
    "",
    "### Días no lectivos",
    "",
    ...cfg.noLectivos.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith("#")).map((l) => `- ${l}`),
    "",
    "### Horario",
    "",
    ...cfg.horario.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith("#")).map((l) => `- ${l}`),
    "",
  ].join("\n");
}

/** Línea de las tareas que deben ir bajo un encabezado concreto (para insertar). */
export function existeSeccion(contenido: string, nombre: string): boolean {
  const n = normalizar(nombre);
  return lineas(contenido).some((l) => {
    const m = l.match(RE_ENCABEZADO);
    return m !== null && normalizar(m[2]) === n;
  });
}
