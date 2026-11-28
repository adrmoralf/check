import { describe, expect, it } from "vitest";
import { insertarEnSeccion, insertarSubtarea, moverBloque } from "../src/core/insertar";

const nota = [
  "# Tareas",
  "",
  "## Tareas por asignatura",
  "",
  "### Proyectos de Automatización",
  "",
  "- [ ] Cuadro eléctrico #PA 📅 2026-11-18",
  "- [ ] Examen de conexionado #PA 📅 2026-12-02 ⏫",
  "",
  "### Control de Sistemas de Distribución",
  "",
  "- [ ] Mirar la asignatura #CSD",
  "",
  "### Todas las asignaturas",
  "",
].join("\n");

describe("insertarEnSeccion", () => {
  it("añade al final de la lista de la sección", () => {
    const r = insertarEnSeccion(nota, "- [ ] Nueva #PA", "Proyectos de Automatización");
    const l = r.contenido.split("\n");
    expect(r.linea).toBe(8);
    expect(l[8]).toBe("- [ ] Nueva #PA");
    expect(l[9]).toBe("");
    expect(l[10]).toBe("### Control de Sistemas de Distribución");
  });

  it("ignora tildes y mayúsculas en el nombre", () => {
    const r = insertarEnSeccion(nota, "- [ ] X #PA", "proyectos de automatizacion");
    expect(r.contenido.split("\n")[r.linea]).toBe("- [ ] X #PA");
    expect(r.linea).toBe(8);
  });

  it("crea la sección tras la última que tiene tareas", () => {
    const r = insertarEnSeccion(nota, "- [ ] Primera #EMP", "Emprendimiento");
    const l = r.contenido.split("\n");
    expect(l[r.linea]).toBe("- [ ] Primera #EMP");
    expect(l[r.linea - 2]).toBe("### Emprendimiento");
    expect(l.indexOf("### Emprendimiento")).toBeLessThan(l.indexOf("### Todas las asignaturas"));
    expect(l.indexOf("### Emprendimiento")).toBeGreaterThan(l.indexOf("- [ ] Mirar la asignatura #CSD"));
  });

  it("conserva los saltos de línea CRLF", () => {
    const r = insertarEnSeccion(nota.replace(/\n/g, "\r\n"), "- [ ] Y #PA", "Proyectos de Automatización");
    expect(r.contenido.includes("\r\n- [ ] Y #PA\r\n")).toBe(true);
    expect(/[^\r]\n/.test(r.contenido)).toBe(false);
  });

  it("sección existente pero vacía", () => {
    const r = insertarEnSeccion("### Vacía\n### Otra\n", "- [ ] Z", "Vacía");
    expect(r.contenido).toBe("### Vacía\n\n- [ ] Z\n\n### Otra\n");
  });
});

describe("insertarSubtarea", () => {
  it("añade con tabulador debajo de la tarea", () => {
    const r = insertarSubtarea(nota, "- [ ] Repasar esquemas #PA", 7);
    const l = r.contenido.split("\n");
    expect(r.linea).toBe(8);
    expect(l[8]).toBe("\t- [ ] Repasar esquemas #PA");
  });

  it("va después de las subtareas existentes y copia su sangría", () => {
    const base = "- [ ] Examen\n    - [ ] T1\n    - [ ] T2\n- [ ] Otra";
    const r = insertarSubtarea(base, "- [ ] T3", 0);
    expect(r.contenido).toBe("- [ ] Examen\n    - [ ] T1\n    - [ ] T2\n    - [ ] T3\n- [ ] Otra");
    expect(r.linea).toBe(3);
  });
});

describe("mover una tarea", () => {
  const doc = [
    "### RIS",
    "",
    "- [ ] Memoria #RIS",
    "\t- [ ] Introducción",
    "- [ ] Leer el artículo #RIS",
    "  nota del artículo",
    "\t- [ ] Resumen",
    "",
    "### CI",
    "",
    "- [ ] Repasar #CI",
  ].join("\n");

  it("la hace subtarea de otra, con sus subtareas y notas", () => {
    const r = moverBloque(doc, 4, { padre: 2 });
    expect(r.contenido.split("\n").slice(0, 8)).toEqual([
      "### RIS",
      "",
      "- [ ] Memoria #RIS",
      "\t- [ ] Introducción",
      "\t- [ ] Leer el artículo #RIS",
      "\t  nota del artículo",
      "\t\t- [ ] Resumen",
      "",
    ]);
    expect(r.linea).toBe(4);
  });

  it("la saca a otra sección como tarea suelta", () => {
    const r = moverBloque(doc, 3, { seccion: "CI" });
    const ls = r.contenido.split("\n");
    expect(ls[r.linea]).toBe("- [ ] Introducción");
    expect(ls.slice(-2)).toEqual(["- [ ] Repasar #CI", "- [ ] Introducción"]);
    expect(ls).not.toContain("\t- [ ] Introducción");
  });

  it("no deja hacerla subtarea de sí misma", () => {
    expect(() => moverBloque(doc, 4, { padre: 6 })).toThrow();
  });
});
