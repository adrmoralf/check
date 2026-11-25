// Qué tareas son exámenes, entregas o prácticas (para la pestaña Inicio): por el tipo puesto a
// mano (+examen…), si no por su texto y, si no se reconoce, por tener una prioridad importante.

import type { TipoTarea } from "./tarea";

export type TipoEntrega = TipoTarea | "importante";

const RE_EXAMEN = /\b(ex[aá]men(es)?|parcial(ito)?|final|prueba|test|control|recuperaci[oó]n)\b/i;
const RE_PRACTICA = /\b(pr[aá]cticas?|laboratorio)\b/i;
const RE_ENTREGA = /\b(entrega[rs]?|memoria|proyecto|informe|trabajo|presentaci[oó]n|exposici[oó]n|defensa|subir|enviar|tarea evaluable)\b/i;

/** Qué es una tarea según su tipo o su texto (o si es importante por su prioridad); null si no entra. */
export function tipoDe(t: { descripcion: string; prioridad: number; tipo?: TipoTarea | null }, minimo: number): TipoEntrega | null {
  if (t.tipo) return t.tipo;
  if (RE_EXAMEN.test(t.descripcion)) return "examen";
  if (RE_ENTREGA.test(t.descripcion)) return "entrega";
  if (RE_PRACTICA.test(t.descripcion)) return "practica";
  return t.prioridad >= minimo ? "importante" : null;
}
