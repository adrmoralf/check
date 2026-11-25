// Ajustes. Lo del curso (asignaturas, cuatrimestres, festivos, horario) está en el archivo .md y
// se sincroniza; lo de cada equipo (ruta del archivo, token del calendario, tema…) se guarda en local.

import { Periodo } from "./core/curso";

export type Pestana = "inicio" | "hoy" | "asignaturas" | "calendario" | "cuatrimestre";
export type Modo = "auto" | "compacto" | "amplio";
export type Tema = "auto" | "claro" | "oscuro";
export type CuatriAsig = "1" | "2" | "anual";

export interface Asignatura {
  tag: string;
  nombre: string;
  /** Nombre de color del tema (purple, cyan…) o un color "#rrggbb" */
  color: string;
  cuatri: CuatriAsig;
}

/** Ajustes de este equipo (no se sincronizan). */
export interface AjustesEquipo {
  ruta: string;
  pestanaInicial: Pestana;
  /** Ya se pasó la pestaña inicial a Inicio cuando esta se hizo la principal */
  inicioPrincipal: boolean;
  modo: Modo;
  tema: Tema;
  prioridadImportante: number;
  mostrarClases: boolean;
  mostrarCuentaAtras: boolean;
  gistToken: string;
  gistId: string;
  gistArchivo: string;
  publicarSolo: boolean;
  /** Avisos del sistema: resumen diario a `avisoHora` y aviso `avisoHorasAntes` antes de las tareas con hora */
  avisos: boolean;
  avisoHora: string;
  avisoHorasAntes: number;
  /** Cerrar la ventana la deja en la bandeja (la app sigue para los avisos) */
  bandeja: boolean;
  /** Atajo global para nueva tarea (formato de Tauri, p. ej. "CommandOrControl+Alt+N"); vacío = sin atajo */
  atajo: string;
  /** Archivar las hechas hace más de `archivarDias` días; con `archivarSolo`, al abrir la app */
  archivarDias: number;
  archivarSolo: boolean;
  /** Color principal ("" = el de siempre) y tamaño del texto en px */
  acento: string;
  tamTexto: number;
  /** Buscar versiones nuevas de Check al abrir y cada 6 horas */
  buscarActualizaciones: boolean;
}

/** Lo que usa la interfaz: configuración del archivo + ajustes del equipo. */
export interface Ajustes extends AjustesEquipo {
  asignaturas: Asignatura[];
  c1: Periodo;
  c2: Periodo;
  noLectivos: string;
  horario: string;
  /** Nombre del archivo, para los textos de la interfaz */
  notaTareas: string;
}

export const COLORES_TEMA: Record<string, string> = {
  red: "Rojo", orange: "Naranja", yellow: "Amarillo", green: "Verde",
  cyan: "Cian", blue: "Azul", purple: "Morado", pink: "Rosa",
};

export function colorCss(color: string | undefined): string {
  if (!color) return "var(--interactive-accent)";
  return color in COLORES_TEMA ? `var(--color-${color})` : color;
}

export const PESTANAS: { id: Pestana; nombre: string; icono: string }[] = [
  { id: "inicio", nombre: "Inicio", icono: "house" },
  { id: "hoy", nombre: "Hoy", icono: "sun" },
  { id: "asignaturas", nombre: "Asignaturas", icono: "graduation-cap" },
  { id: "calendario", nombre: "Calendario", icono: "calendar" },
  { id: "cuatrimestre", nombre: "Cuatrimestre", icono: "milestone" },
];

export const EQUIPO_INICIAL: AjustesEquipo = {
  ruta: "",
  pestanaInicial: "inicio",
  inicioPrincipal: true,
  modo: "auto",
  tema: "auto",
  prioridadImportante: 4,
  mostrarClases: true,
  mostrarCuentaAtras: true,
  gistToken: "",
  gistId: "",
  gistArchivo: "obsidian.ics",
  publicarSolo: true,
  avisos: true,
  avisoHora: "09:00",
  avisoHorasAntes: 2,
  bandeja: true,
  atajo: "CommandOrControl+Alt+N",
  archivarDias: 30,
  archivarSolo: false,
  acento: "",
  tamTexto: 15,
  buscarActualizaciones: true,
};

// Configuración inicial del curso (un máster de ejemplo). Solo se usa si el archivo no la trae.
export const CURSO_INICIAL = {
  asignaturas: [
    { tag: "AEI", nombre: "Automatización de Edificios Inteligentes", color: "purple", cuatri: "1" },
    { tag: "CI", nombre: "Comunicaciones Industriales", color: "cyan", cuatri: "1" },
    { tag: "PA", nombre: "Proyectos de Automatización", color: "orange", cuatri: "1" },
    { tag: "PR", nombre: "Proyectos de Robótica", color: "green", cuatri: "1" },
    { tag: "RIS", nombre: "Redes Inalámbricas de Sensores", color: "blue", cuatri: "1" },
    { tag: "SDAA", nombre: "Sistemas Digitales Avanzados y Aplicaciones", color: "pink", cuatri: "1" },
    { tag: "CSD", nombre: "Control de Sistemas de Distribución", color: "yellow", cuatri: "2" },
    { tag: "CV", nombre: "Control en Vehículos", color: "red", cuatri: "2" },
    { tag: "EMP", nombre: "Emprendimiento", color: "purple", cuatri: "2" },
    { tag: "OCSE", nombre: "Optimización y Control en Sistemas de Energía", color: "blue", cuatri: "2" },
    { tag: "TFM", nombre: "Trabajo Fin de Máster", color: "#14b8a6", cuatri: "anual" },
  ] as Asignatura[],
  c1: { inicio: "2026-10-05", finClases: "2027-01-22", finExamenes: "2027-02-13" },
  c2: { inicio: "2027-02-15", finClases: "2027-06-04", finExamenes: "2027-06-26" },
  noLectivos: ["2026-12-08 Inmaculada Concepción", "2026-12-19..2027-01-06 Navidad"].join("\n"),
  horario: [
    "C1 lun 15:00-18:00 CI",
    "C1 lun 18:00-19:30 RIS",
    "C1 mar 15:00-18:00 SDAA",
    "C1 mar 18:00-19:30 RIS",
    "C1 mié 15:00-18:00 PA",
    "C1 mié 18:00-19:30 AEI",
    "C1 jue 15:00-18:00 PR",
    "C1 jue 18:00-19:30 AEI",
    "C2 lun 15:00-16:30 CSD",
    "C2 mar 15:00-16:30 OCSE",
    "C2 mar 16:30-19:30 CV",
    "C2 mié 15:00-16:30 OCSE",
    "C2 jue 15:00-16:30 CSD",
    "C2 vie 17:00-19:00 EMP",
  ].join("\n"),
};
