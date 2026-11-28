// Qué tareas son exámenes, entregas, prácticas o avances (para la pestaña Inicio): por el tipo
// puesto a mano (+examen…), si no por su texto y, si no se reconoce, por tener una prioridad importante.
// Los avances (+avance) solo se reconocen por el tipo: son trabajo para ir avanzando en una
// asignatura, con menos peso que una entrega.

import type { ISO } from "./fechas";
import type { TipoTarea } from "./tarea";

export type TipoEntrega = TipoTarea | "importante";

// Solo cuando la tarea empieza por la palabra («Examen de PA», «Parcialito de SLP»): un examen
// pasado se da por hecho solo, y «Estudiar para el examen» o «Práctica tras el parcialito» no
// son exámenes (darlas por hechas escondería una tarea atrasada)
const RE_EXAMEN = /^(ex[aá]men(es)?|parcial(ito)?|recuperaci[oó]n)\b/i;
const RE_PRACTICA = /\b(pr[aá]cticas?|laboratorio)\b/i;
const RE_ENTREGA = /\b(entrega[rs]?|memoria|proyecto|informe|trabajo|presentaci[oó]n|exposici[oó]n|defensa|subir|enviar|tarea evaluable)\b/i;

interface ConTipo {
  descripcion: string;
  prioridad: number;
  tipo?: TipoTarea | null;
}

/** Qué es una tarea según su tipo o su texto (o si es importante por su prioridad); null si no entra. */
export function tipoDe(t: ConTipo, minimo: number): TipoEntrega | null {
  if (t.tipo) return t.tipo;
  if (RE_EXAMEN.test(t.descripcion)) return "examen";
  if (RE_ENTREGA.test(t.descripcion)) return "entrega";
  if (RE_PRACTICA.test(t.descripcion)) return "practica";
  return t.prioridad >= minimo ? "importante" : null;
}

export function esExamen(t: { descripcion: string; tipo?: TipoTarea | null }): boolean {
  return t.tipo ? t.tipo === "examen" : RE_EXAMEN.test(t.descripcion);
}

/**
 * Un examen cuya fecha ya ha pasado se da por hecho: no hace falta marcarlo y no sale como
 * atrasado. (Si se marca a mano, también vale.)
 */
export function examenPasado(t: { descripcion: string; tipo?: TipoTarea | null; hecha: boolean; cancelada: boolean; fecha: ISO | null }, hoy: ISO): boolean {
  return !t.hecha && !t.cancelada && t.fecha !== null && t.fecha < hoy && esExamen(t);
}
