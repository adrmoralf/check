import { describe, expect, it } from "vitest";
import {
  avanceCuatrimestre, clasesDelDia, cuatrimestreDe, diasLaborables, parsearHorario, parsearNoLectivos,
} from "../src/core/curso";
import { diasEntre, fechaCorta, lunesDe, sumarDias, sumarMeses } from "../src/core/fechas";

const c1 = { inicio: "2026-10-05", finClases: "2027-01-22", finExamenes: "2027-02-13" };
const c2 = { inicio: "2027-02-15", finClases: "2027-06-04", finExamenes: "2027-06-26" };

describe("fechas", () => {
  it("suma días cruzando meses y el cambio de hora", () => {
    expect(sumarDias("2026-10-24", 2)).toBe("2026-10-26");
    expect(sumarDias("2026-12-31", 1)).toBe("2027-01-01");
    expect(diasEntre("2026-11-17", "2026-12-02")).toBe(15);
  });
  it("lunes de la semana y meses", () => {
    expect(lunesDe("2026-11-22")).toBe("2026-11-16");
    expect(lunesDe("2026-11-16")).toBe("2026-11-16");
    expect(sumarMeses("2026-12-15", 1)).toBe("2027-01-01");
    expect(sumarMeses("2027-01-01", -1)).toBe("2026-12-01");
  });
  it("formato corto en español", () => {
    expect(fechaCorta("2026-11-18")).toBe("mié 18 nov");
  });
});

describe("días no lectivos", () => {
  it("lee días sueltos, rangos y comentarios", () => {
    const r = parsearNoLectivos("# festivos\n2026-12-08 Inmaculada\n2026-12-19..2027-01-06 Navidad\n\nmal");
    expect(r.dias).toEqual([
      { desde: "2026-12-08", hasta: "2026-12-08", nombre: "Inmaculada" },
      { desde: "2026-12-19", hasta: "2027-01-06", nombre: "Navidad" },
    ]);
    expect(r.errores).toHaveLength(1);
  });

  it("cuenta días laborables sin fines de semana ni festivos", () => {
    const { dias } = parsearNoLectivos("2026-12-08 Inmaculada");
    // Del lun 7 dic (incluido) al lun 14 (excluido): 5 laborables menos el 8
    expect(diasLaborables("2026-12-07", "2026-12-14", dias)).toBe(4);
    expect(diasLaborables("2026-11-17", "2026-11-17", dias)).toBe(0);
  });
});

describe("horario", () => {
  const { clases, errores } = parsearHorario(
    "C1 lun 15:00-18:00 CI TL02\nC1 lun 18:00-19:30 RIS aula 216\nC2 vie 17:00-19:00 EMP 208\nC1 xyz 1-2 A",
  );

  it("lee clases y avisa de líneas mal escritas", () => {
    expect(clases).toHaveLength(3);
    expect(clases[1]).toEqual({ cuatri: 1, dia: 1, inicio: "18:00", fin: "19:30", tag: "RIS", aula: "aula 216" });
    expect(errores).toHaveLength(1);
  });

  it("da las clases de un día dentro del periodo de clases", () => {
    expect(clasesDelDia("2026-11-16", clases, c1, c2, []).map((c) => c.tag)).toEqual(["CI", "RIS"]);
    expect(clasesDelDia("2027-01-25", clases, c1, c2, [])).toEqual([]);
    expect(clasesDelDia("2027-02-19", clases, c1, c2, []).map((c) => c.tag)).toEqual(["EMP"]);
    const navidad = parsearNoLectivos("2026-12-19..2027-01-06").dias;
    expect(clasesDelDia("2026-12-21", clases, c1, c2, navidad)).toEqual([]);
  });
});

describe("cuatrimestres", () => {
  it("elige el cuatrimestre en curso", () => {
    expect(cuatrimestreDe("2026-11-17", c1, c2)).toBe(1);
    expect(cuatrimestreDe("2027-02-14", c1, c2)).toBe(2);
    expect(cuatrimestreDe("2027-07-01", c1, c2)).toBeNull();
  });
  it("avance entre 0 y 1", () => {
    expect(avanceCuatrimestre("2026-10-05", c1)).toBe(0);
    expect(avanceCuatrimestre("2027-03-01", c1)).toBe(1);
    expect(avanceCuatrimestre("2026-12-09", c1)).toBeCloseTo(65 / 131, 5);
  });
});
