// Conflictos de Google Drive: cuando el archivo se edita en dos PC a la vez, Drive guarda una de
// las versiones aparte («Tareas (1).md»). Aquí se junta esa copia con el archivo principal:
// se añaden las tareas que solo están en la copia y se marcan como hechas las que allí lo están.

import { TareaIdx } from "./consultas";
import { tareasDelDocumento } from "./documento";
import { seccionDe } from "./archivo";
import { insertarEnSeccion, insertarSubtarea } from "./insertar";

const normal = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

/** Identidad de una tarea entre dos versiones del archivo: texto y etiquetas (no la línea ni la fecha). */
export const identidad = (t: { descripcion: string; tags: string[] }) => `${normal(t.descripcion)}|${t.tags.map(normal).sort().join(",")}`;

export interface ResultadoFusion {
  contenido: string;
  anadidas: string[];
  completadas: string[];
  /** Tareas que están en las dos versiones con fecha, prioridad o estado distintos y no se han tocado */
  distintas: string[];
}

export function fusionar(principal: string, copia: string): ResultadoFusion {
  const res: ResultadoFusion = { contenido: principal, anadidas: [], completadas: [], distintas: [] };
  const lsCopia = copia.split(/\r?\n/);
  const deCopia = tareasDelDocumento("", copia);
  const porLinea = new Map(deCopia.map((t) => [t.linea, t]));

  for (const t of deCopia) {
    const actuales = tareasDelDocumento("", res.contenido);
    const igual = actuales.find((x) => identidad(x) === identidad(t));
    const lineaCopia = lsCopia[t.linea].trim();
    if (!igual) {
      const padreCopia = t.padre !== null ? porLinea.get(t.padre) : undefined;
      const padre = padreCopia ? actuales.find((x) => identidad(x) === identidad(padreCopia)) : undefined;
      // El padre se procesa antes que sus subtareas, así que si faltaba ya se ha añadido
      res.contenido = padre
        ? insertarSubtarea(res.contenido, lineaCopia, padre.linea).contenido
        : insertarEnSeccion(res.contenido, lineaCopia, seccionDe(lsCopia, t.linea)).contenido;
      res.anadidas.push(t.descripcion);
      continue;
    }
    if (t.hecha && !igual.hecha && !igual.cancelada) {
      // Se toma la línea de la copia (con su ✓fecha) conservando la sangría del principal
      const ls = res.contenido.split(/\r?\n/);
      const eol = res.contenido.includes("\r\n") ? "\r\n" : "\n";
      ls[igual.linea] = igual.texto.match(/^\s*/)![0] + lineaCopia;
      res.contenido = ls.join(eol);
      res.completadas.push(t.descripcion);
      continue;
    }
    if (difieren(t, igual)) res.distintas.push(t.descripcion);
  }
  return res;
}

function difieren(a: TareaIdx, b: TareaIdx): boolean {
  return a.fecha !== b.fecha || a.hora !== b.hora || a.prioridad !== b.prioridad || a.cancelada !== b.cancelada || (a.hecha && !b.hecha);
}
