import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  alternarHecha, cambiarFecha, cambiarPrioridad, construirLinea, parsearTarea, reescribirLinea,
} from "../src/core/tarea";
import { itemsDeLista, leerConfig, tareasDelDocumento } from "../src/core/documento";
import { convertirLineaTasks, documentoNuevo, migrarDesdeTasks } from "../src/core/plantilla";
import { generarIcs } from "../src/core/ics";
import { CURSO_INICIAL } from "../src/ajustes";

const DEF = { ...CURSO_INICIAL, errores: [] as string[] };

describe("sintaxis propia", () => {
  it("lee texto, asignatura, fecha con hora y prioridad", () => {
    const t = parsearTarea("- [ ] Entregar la memoria de prácticas #RIS @2027-01-20 23:59 !alta")!;
    expect(t.descripcion).toBe("Entregar la memoria de prácticas");
    expect(t.tags).toEqual(["RIS"]);
    expect(t.vence).toBe("2027-01-20");
    expect(t.hora).toBe("23:59");
    expect(t.fecha).toBe("2027-01-20");
    expect(t.prioridad).toBe(4);
  });

  it("fecha sin hora, prioridades y hecha", () => {
    expect(parsearTarea("- [ ] A @2026-12-01")!.hora).toBeNull();
    expect(parsearTarea("- [ ] A !max")!.prioridad).toBe(5);
    expect(parsearTarea("- [ ] A !media")!.prioridad).toBe(3);
    expect(parsearTarea("- [ ] A !baja")!.prioridad).toBe(1);
    expect(parsearTarea("- [ ] A")!.prioridad).toBe(2);
    const h = parsearTarea("- [x] Repaso #CI @2026-11-20 ✓2026-11-19")!;
    expect(h.hecha).toBe(true);
    expect(h.hechaEl).toBe("2026-11-19");
    expect(h.descripcion).toBe("Repaso");
  });

  it("no confunde un correo o un enlace con fecha o etiqueta", () => {
    const t = parsearTarea("- [ ] Escribir a profe@ejemplo.es sobre [[Guía#Fechas|fechas]] #PA")!;
    expect(t.vence).toBeNull();
    expect(t.tags).toEqual(["PA"]);
    expect(t.descripcion).toBe("Escribir a profe@ejemplo.es sobre fechas");
  });

  it("entiende también la sintaxis de Tasks", () => {
    const t = parsearTarea("- [ ] Examen #PA 📅 2026-12-02 ⏫")!;
    expect(t.vence).toBe("2026-12-02");
    expect(t.prioridad).toBe(4);
    expect(t.descripcion).toBe("Examen");
  });

  it("edita fecha, hora y prioridad", () => {
    expect(cambiarFecha("- [ ] A #PA @2026-11-18 !alta", "2026-11-25")).toBe("- [ ] A #PA @2026-11-25 !alta");
    expect(cambiarFecha("- [ ] A @2026-11-18 10:00", "2026-11-25")).toBe("- [ ] A @2026-11-25 10:00");
    expect(cambiarFecha("- [ ] A @2026-11-18 10:00", "2026-11-25", null)).toBe("- [ ] A @2026-11-25");
    expect(cambiarFecha("- [ ] A #PA", "2026-11-20", "9:30")).toBe("- [ ] A #PA @2026-11-20 09:30");
    expect(cambiarFecha("- [ ] A @2026-11-18 !alta", null)).toBe("- [ ] A !alta");
    expect(cambiarFecha("- [ ] A 📅 2026-11-18", "2026-11-19")).toBe("- [ ] A @2026-11-19");
    expect(cambiarPrioridad("- [ ] A @2026-11-18 !alta", 3)).toBe("- [ ] A @2026-11-18 !media");
    expect(cambiarPrioridad("- [ ] A !alta", 2)).toBe("- [ ] A");
  });

  it("marca y desmarca con ✓fecha", () => {
    const h = alternarHecha("\t- [ ] A @2026-11-18", "2026-11-17");
    expect(h).toBe("\t- [x] A @2026-11-18 ✓2026-11-17");
    expect(alternarHecha(h, "2026-11-17")).toBe("\t- [ ] A @2026-11-18");
  });

  it("construye y reescribe líneas", () => {
    expect(construirLinea({ descripcion: " Entregar P2 ", tag: "#RIS", fecha: "2026-12-01", hora: "9:05", prioridad: 4 }))
      .toBe("- [ ] Entregar P2 #RIS @2026-12-01 09:05 !alta");
    expect(reescribirLinea("\t- [x] Viejo #PA ✓2026-11-10", { descripcion: "Nuevo", tag: "CI", prioridad: 2 }))
      .toBe("\t- [x] Nuevo #CI ✓2026-11-10");
  });
});

describe("documento", () => {
  const doc = documentoNuevo(CURSO_INICIAL)
    .replace("## Tareas\n", "## Tareas\n\n### Proyectos de Automatización\n\n- [ ] Examen #PA @2026-12-02 !alta\n\t- [ ] Repasar #PA\n");

  it("lee la configuración que escribe", () => {
    const cfg = leerConfig(doc, { ...DEF, asignaturas: [] });
    expect(cfg.errores).toEqual([]);
    expect(cfg.asignaturas).toEqual(CURSO_INICIAL.asignaturas);
    expect(cfg.c1).toEqual(CURSO_INICIAL.c1);
    expect(cfg.c2).toEqual(CURSO_INICIAL.c2);
    expect(cfg.noLectivos).toBe(CURSO_INICIAL.noLectivos);
    expect(cfg.horario).toBe(CURSO_INICIAL.horario);
  });

  it("avisa de colores mal escritos y usa los valores por defecto si falta una sección", () => {
    const cfg = leerConfig("## Configuración\n### Asignaturas\n| Etiqueta | Nombre | Color | Cuatrimestre |\n|---|---|---|---|\n| X | Equis | fucsia | 2 |", DEF);
    expect(cfg.asignaturas).toEqual([{ tag: "X", nombre: "Equis", color: "blue", cuatri: "2" }]);
    expect(cfg.errores).toHaveLength(1);
    expect(cfg.c1).toEqual(CURSO_INICIAL.c1);
  });

  it("extrae las tareas con su padre por sangría y no lee la configuración como tareas", () => {
    const ts = tareasDelDocumento("tareas.md", doc);
    expect(ts.map((t) => t.descripcion)).toEqual(["Examen", "Repasar"]);
    expect(ts[1].padre).toBe(ts[0].linea);
  });

  it("ignora casillas dentro de bloques de código", () => {
    const items = itemsDeLista(["```", "- [ ] no", "```", "- [ ] sí"]);
    expect(items).toEqual([{ linea: 3, padre: -1, esTarea: true }]);
  });
});

describe("migración desde Tasks", () => {
  it("convierte una línea conservando enlaces, sangría y hora", () => {
    expect(convertirLineaTasks("- [ ] Entrega de la memoria (hasta las 23:59) #RIS 📅 2027-01-20 ⏫"))
      .toBe("- [ ] Entrega de la memoria #RIS @2027-01-20 23:59 !alta");
    expect(convertirLineaTasks("\t- [x] Terminar trabajo AEI #AEI 📅 2026-11-21 ✅ 2026-11-21"))
      .toBe("\t- [x] Terminar trabajo AEI #AEI @2026-11-21 ✓2026-11-21");
    expect(convertirLineaTasks("- [ ] Ver ([[A/B|guía]]) #AEI")).toBe("- [ ] Ver ([[A/B|guía]]) #AEI");
  });

  it("migra el Tareas.md real sin perder ninguna tarea", () => {
    const viejo = readFileSync(join(__dirname, "datos", "Tareas-tasks.md"), "utf8");
    const antes = tareasDelDocumento("viejo.md", viejo);
    const nuevo = migrarDesdeTasks(viejo, CURSO_INICIAL);
    const despues = tareasDelDocumento("nuevo.md", nuevo);
    expect(despues.length).toBe(antes.length);
    for (let i = 0; i < antes.length; i++) {
      expect(despues[i].tags).toEqual(antes[i].tags);
      expect(despues[i].fecha).toBe(antes[i].fecha);
      expect(despues[i].prioridad).toBe(antes[i].prioridad);
      expect(despues[i].hecha).toBe(antes[i].hecha);
      expect(despues[i].hechaEl).toBe(antes[i].hechaEl);
      expect(despues[i].padre === null).toBe(antes[i].padre === null);
    }
    expect(nuevo).not.toMatch(/```tasks|📅|⏫|✅/u);
    expect(nuevo).toContain("@2027-01-20 23:59");
    expect(leerConfig(nuevo, DEF).errores).toEqual([]);
  });
});

describe("calendario .ics", () => {
  const ts = tareasDelDocumento("t.md", [
    "- [ ] Entrega, memoria; final #RIS @2027-01-20 23:59 !alta",
    "- [ ] Examen #PA @2026-12-02",
    "- [x] Hecha #PA @2026-11-01 ✓2026-11-01",
    "- [ ] Sin fecha #PA",
  ].join("\n"));
  const ics = generarIcs(ts, (tag) => (tag === "RIS" ? "Redes Inalámbricas de Sensores" : undefined), new Date("2026-11-23T10:00:00Z"));

  it("solo incluye pendientes con fecha, con hora o de todo el día", () => {
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    // 23:59 locales pasadas a UTC (se calcula aquí para no depender de la zona del equipo)
    const esperado = new Date(2027, 0, 20, 23, 59).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    expect(ics).toContain(`DTSTART:${esperado}`);
    expect(ics).not.toMatch(/DTSTART:\d{8}T\d{6}(?!Z)/);
    expect(ics).toContain("DTSTART;VALUE=DATE:20261202");
    expect(ics).toContain("DTEND;VALUE=DATE:20261203");
    expect(ics).toContain("SUMMARY:Entrega\\, memoria\\; final");
    expect(ics).toContain("Asignatura: Redes Inalámbricas de Sensores");
    expect(ics.split("\r\n").every((l) => new TextEncoder().encode(l).length <= 75)).toBe(true);
  });
});
