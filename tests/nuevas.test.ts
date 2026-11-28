import { describe, expect, it } from "vitest";
import { construirLinea, describirRegla, lineaSiguiente, parsearTarea, proximaFecha, reescribirLinea } from "../src/core/tarea";
import { tareasDelDocumento } from "../src/core/documento";
import { parsearRapido } from "../src/core/rapido";
import { archivar } from "../src/core/archivo";
import { fusionar } from "../src/core/fusion";
import { CURSO_INICIAL } from "../src/ajustes";
import { examenPasado, tipoDe } from "../src/core/entregas";
import { progresoPorTag } from "../src/core/consultas";

const HOY = "2026-11-23"; // lunes
const ASIG = CURSO_INICIAL.asignaturas;

describe("tipo de tarea", () => {
  it("lee +examen, +entrega y +práctica y los quita de la descripción", () => {
    const t = parsearTarea("- [ ] Laboratorio 3 #PR @2026-12-01 +práctica !alta")!;
    expect(t.tipo).toBe("practica");
    expect(t.descripcion).toBe("Laboratorio 3");
    expect(parsearTarea("- [ ] Algo +examen")!.tipo).toBe("examen");
    expect(parsearTarea("- [ ] Sumar 2+2")!.tipo).toBeNull();
  });
  it("se escribe al construir y reescribir la línea", () => {
    expect(construirLinea({ descripcion: "Memoria", tag: "RIS", fecha: "2027-01-20", tipo: "entrega" })).toBe("- [ ] Memoria #RIS @2027-01-20 +entrega");
    expect(reescribirLinea("- [x] A +examen ✓2026-11-20", { descripcion: "A", tipo: null })).toBe("- [x] A ✓2026-11-20");
  });
  it("el tipo puesto manda sobre el deducido del texto", () => {
    expect(tipoDe({ descripcion: "Examen parcial", prioridad: 2, tipo: "entrega" }, 4)).toBe("entrega");
    expect(tipoDe({ descripcion: "Examen parcial", prioridad: 2, tipo: null }, 4)).toBe("examen");
    expect(tipoDe({ descripcion: "Práctica 2", prioridad: 2 }, 4)).toBe("practica");
    expect(tipoDe({ descripcion: "Entregar la práctica 2", prioridad: 2 }, 4)).toBe("entrega");
  });
  it("lee +avance y la línea rápida también lo entiende", () => {
    const t = parsearTarea("- [ ] Repasar el tema 3 #CI @2026-12-01 +avance")!;
    expect(t.tipo).toBe("avance");
    expect(t.descripcion).toBe("Repasar el tema 3");
    expect(tipoDe(t, 4)).toBe("avance");
    expect(parsearRapido("repasar tema 3 CI viernes +avance", HOY, ASIG).tipo).toBe("avance");
  });
  it("un examen pasado cuenta como hecho sin marcarlo", () => {
    const [examen, entrega, cuadro] = tareasDelDocumento("t.md", [
      "- [ ] Examen de PA #PA @2026-11-20",
      "- [ ] Memoria #PA @2026-11-20 +entrega",
      "- [ ] Cuadro eléctrico del circuito de control #PA @2026-11-20",
    ].join("\n"));
    expect(examenPasado(examen, HOY)).toBe(true);
    expect(examenPasado(examen, "2026-11-20")).toBe(false); // el mismo día aún no
    expect(examenPasado(entrega, HOY)).toBe(false);
    // «control» ya no se toma por examen (escondería una tarea atrasada)
    expect(examenPasado(cuadro, HOY)).toBe(false);
    expect(tipoDe({ descripcion: "Estudiar para el examen", prioridad: 4 }, 4)).toBe("importante");
    expect(tipoDe({ descripcion: "Práctica 2, tras el parcialito", prioridad: 2 }, 4)).toBe("practica");
    expect(progresoPorTag([examen, entrega], HOY).get("PA")).toMatchObject({ hechas: 1, total: 2 });
  });
  it("la línea rápida entiende +entrega", () => {
    const r = parsearRapido("memoria RIS mañana +entrega", HOY, ASIG);
    expect(r.tipo).toBe("entrega");
    expect(r.descripcion).toBe("Memoria");
  });
});

describe("repetición", () => {
  it("lee ↻ y lo quita de la descripción", () => {
    const t = parsearTarea("- [ ] Repasar apuntes #CI @2026-11-23 ↻semanal")!;
    expect(t.repetir).toBe("semanal");
    expect(t.recurrente).toBe(true);
    expect(t.descripcion).toBe("Repasar apuntes");
    expect(parsearTarea("- [ ] A ↻miércoles")!.repetir).toBe("miércoles");
    expect(parsearTarea("- [ ] A ↻mie")!.repetir).toBe("miércoles");
    expect(parsearTarea("- [ ] A ↻2s")!.repetir).toBe("2s");
    expect(parsearTarea("- [ ] A ↻loquesea")!.repetir).toBeNull();
  });

  it("calcula la próxima fecha", () => {
    expect(proximaFecha("semanal", "2026-11-23", HOY)).toBe("2026-11-30");
    expect(proximaFecha("diaria", "2026-11-20", HOY)).toBe("2026-11-24"); // atrasada: como pronto mañana
    expect(proximaFecha("laborables", "2026-11-27", "2026-11-27")).toBe("2026-11-30");
    expect(proximaFecha("jueves", "2026-11-23", HOY)).toBe("2026-11-26");
    expect(proximaFecha("mensual", "2027-01-31", "2027-01-31")).toBe("2027-02-28");
    expect(proximaFecha("3d", "2026-11-23", HOY)).toBe("2026-11-26");
    expect(describirRegla("2s")).toBe("cada 2 semanas");
  });

  it("la siguiente repetición sale pendiente, sin ✓ y con la hora", () => {
    const hecha = "\t- [x] Informe #PR @2026-11-23 10:00 !alta ↻semanal ✓2026-11-23";
    expect(lineaSiguiente(hecha, HOY)).toBe("\t- [ ] Informe #PR @2026-11-30 10:00 !alta ↻semanal");
    expect(lineaSiguiente("- [ ] Sin repetir @2026-11-23", HOY)).toBeNull();
  });

  it("construir y reescribir conservan la repetición", () => {
    expect(construirLinea({ descripcion: "A", fecha: "2026-11-24", repetir: "lunes" })).toBe("- [ ] A @2026-11-24 ↻lunes");
    expect(reescribirLinea("- [ ] A ↻lunes", { descripcion: "B", repetir: "semanal" })).toBe("- [ ] B ↻semanal");
  });
});

describe("notas", () => {
  it("las líneas con sangría que no son casillas son notas de la tarea", () => {
    const doc = ["- [ ] Práctica 3 #AEI", "  enlace: https://campus.ejemplo.es", "  - pedir la maqueta", "\t- [ ] Subtarea", "- [ ] Otra"].join("\n");
    const ts = tareasDelDocumento("x", doc);
    expect(ts[0].notas).toEqual(["enlace: https://campus.ejemplo.es", "pedir la maqueta"]);
    expect(ts[1].notas).toEqual([]);
    expect(ts[1].padre).toBe(0);
  });
});

describe("añadir escribiendo", () => {
  const p = (s: string) => parsearRapido(s, HOY, ASIG);

  it("asignatura, mañana, hora y prioridad", () => {
    const r = p("memoria RIS mañana 23:59 alta");
    expect(r).toMatchObject({ descripcion: "Memoria", tag: "RIS", fecha: "2026-11-24", hora: "23:59", prioridad: 4 });
  });

  it("días de la semana, fechas y «en N días»", () => {
    expect(p("entregar informe el viernes").fecha).toBe("2026-11-27");
    expect(p("examen PA 8/2").fecha).toBe("2027-02-08");
    expect(p("examen 20 de enero a las 9").fecha).toBe("2027-01-20");
    expect(p("examen 20 de enero a las 9").hora).toBe("09:00");
    expect(p("llamar en 3 días").fecha).toBe("2026-11-26");
    expect(p("revisar la semana que viene").fecha).toBe("2026-11-30");
    expect(p("algo a las 5 de la tarde hoy").hora).toBe("17:00");
  });

  it("repetición", () => {
    expect(p("repasar CI cada semana").repetir).toBe("semanal");
    const r = p("gimnasio todos los martes");
    expect(r.repetir).toBe("martes");
    expect(r.fecha).toBe("2026-11-24");
    expect(r.descripcion).toBe("Gimnasio");
  });

  it("no confunde palabras normales ni números del texto", () => {
    const r = p("leer el tema 2 para el jueves");
    expect(r.descripcion).toBe("Leer el tema 2");
    expect(r.fecha).toBe("2026-11-26");
    expect(r.hora).toBeNull();
    expect(p("ir pa casa").tag).toBeUndefined();
    expect(p("ir PA casa").tag).toBe("PA");
    expect(p("tarea #TFM urgente")).toMatchObject({ tag: "TFM", prioridad: 5, descripcion: "Tarea" });
  });
});

describe("archivar", () => {
  const doc = [
    "# Tareas",
    "",
    "### Redes Inalámbricas de Sensores",
    "",
    "- [x] Vieja #RIS ✓2026-09-01",
    "\t- [x] Su subtarea ✓2026-09-01",
    "- [x] Reciente #RIS ✓2026-11-20",
    "- [ ] Pendiente #RIS",
    "- [-] Cancelada #RIS",
    "",
  ].join("\n");

  it("mueve las hechas hace más de N días y las canceladas, con sus subtareas", () => {
    const r = archivar(doc, null, HOY, 30, "Tareas.md");
    expect(r.n).toBe(2);
    expect(r.principal).not.toContain("Vieja");
    expect(r.principal).not.toContain("Su subtarea");
    expect(r.principal).not.toContain("Cancelada");
    expect(r.principal).toContain("Reciente");
    expect(r.principal).toContain("Pendiente");
    expect(r.archivo).toContain("### Redes Inalámbricas de Sensores");
    expect(r.archivo).toContain("- [x] Vieja #RIS ✓2026-09-01\n\t- [x] Su subtarea ✓2026-09-01");
  });

  it("sin nada que archivar no cambia el archivo", () => {
    const r = archivar(doc, null, HOY, 365, "Tareas.md");
    expect(r.principal.includes("Vieja")).toBe(true);
    expect(r.n).toBe(1); // solo la cancelada
  });
});

describe("conflictos de Drive", () => {
  const principal = ["### Proyectos de Robótica", "", "- [ ] Informe #PR @2026-11-30", "- [ ] Común #PR", ""].join("\n");
  const copia = [
    "### Proyectos de Robótica",
    "",
    "- [x] Informe #PR @2026-11-30 ✓2026-11-23",
    "\t- [ ] Nueva subtarea #PR",
    "- [ ] Común #PR @2026-12-01",
    "- [ ] Solo en la copia #PR",
    "",
  ].join("\n");

  it("añade lo que falta, completa lo hecho y avisa de lo distinto", () => {
    const r = fusionar(principal, copia);
    expect(r.completadas).toEqual(["Informe"]);
    expect(r.anadidas).toEqual(["Nueva subtarea", "Solo en la copia"]);
    expect(r.distintas).toEqual(["Común"]);
    expect(r.contenido).toContain("- [x] Informe #PR @2026-11-30 ✓2026-11-23");
    expect(r.contenido).toMatch(/Informe.*\n\t- \[ \] Nueva subtarea/);
    expect(r.contenido).toContain("- [ ] Común #PR\n");
  });

  it("juntar dos veces no duplica", () => {
    const una = fusionar(principal, copia).contenido;
    expect(fusionar(una, copia).contenido).toBe(una);
  });
});

describe("resaltado de lo reconocido", () => {
  it("devuelve los tramos en el texto tal como se escribió", () => {
    const texto = "  memoria RIS mañana 23:59 alta";
    const r = parsearRapido(texto, HOY, ASIG);
    const trozos = r.tramos.sort((a, b) => a[0] - b[0]).map(([a, b]) => texto.slice(a, b));
    expect(trozos).toEqual(["RIS", "mañana", "23:59", "alta"]);
  });
});
