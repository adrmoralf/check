// Avisos del sistema (notificaciones de Windows / Ubuntu). Funcionan mientras Check esté abierto,
// también escondido en la bandeja:
//   · cada día a la hora elegida, un resumen de lo de hoy y de lo que vence mañana;
//   · las tareas con hora, unas horas antes.
// Cada aviso sale una sola vez: lo ya avisado se recuerda en este equipo.

import type TareasApp from "./main";
import * as backend from "./backend";
import { pendiente } from "./core/consultas";
import { hoyISO, sumarDias } from "./core/fechas";

const CLAVE = "check.avisados";
const COMPROBAR_MS = 60_000;

function leerAvisados(): string[] {
  try {
    return JSON.parse(localStorage.getItem(CLAVE) ?? "[]");
  } catch {
    return [];
  }
}

function guardarAvisados(l: string[]) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(l.slice(-300)));
  } catch {
    /* sin almacenamiento: como mucho se repite algún aviso */
  }
}

const minutos = (h: string) => {
  const [a, b] = h.split(":").map(Number);
  return a * 60 + b;
};

const lista = (ts: { descripcion: string }[]) => {
  const nombres = ts.slice(0, 3).map((t) => `· ${t.descripcion}`);
  if (ts.length > 3) nombres.push(`… y ${ts.length - 3} más`);
  return nombres.join("\n");
};

export class Avisos {
  private temporizador: number | undefined;

  constructor(private a: TareasApp) {}

  iniciar() {
    window.clearInterval(this.temporizador);
    if (!this.a.equipo.avisos) return;
    // Un poco después de arrancar (a que se cargue todo) y luego cada minuto
    window.setTimeout(() => void this.comprobar(), 5000);
    this.temporizador = window.setInterval(() => void this.comprobar(), COMPROBAR_MS);
  }

  async comprobar(ahora = new Date()) {
    if (!this.a.equipo.avisos || !this.a.almacen.listo) return;
    const avisados = leerAvisados();
    const ya = (k: string) => avisados.includes(k);
    const hoy = hoyISO(ahora);
    const manana = sumarDias(hoy, 1);
    const min = ahora.getHours() * 60 + ahora.getMinutes();
    const pend = this.a.almacen.todas.filter(pendiente);
    const nuevos: string[] = [];

    // Resumen del día
    const kDia = `dia|${hoy}`;
    if (!ya(kDia) && min >= minutos(this.a.equipo.avisoHora || "09:00")) {
      const deHoy = pend.filter((t) => t.fecha === hoy);
      const atrasadas = pend.filter((t) => t.fecha && t.fecha < hoy);
      const deManana = pend.filter((t) => t.fecha === manana);
      const partes: string[] = [];
      if (deHoy.length) partes.push(`Hoy (${deHoy.length}):\n${lista(deHoy)}`);
      if (deManana.length) partes.push(`Mañana vence (${deManana.length}):\n${lista(deManana)}`);
      if (atrasadas.length) partes.push(`${atrasadas.length} atrasada${atrasadas.length === 1 ? "" : "s"}`);
      if (partes.length) await backend.notificar("Check · tus tareas", partes.join("\n\n"));
      nuevos.push(kDia);
    }

    // Tareas con hora: unas horas antes
    const antes = Math.max(0, this.a.equipo.avisoHorasAntes) * 60;
    for (const t of pend) {
      if (t.fecha !== hoy || !t.hora) continue;
      const k = `hora|${t.fecha}|${t.hora}|${t.descripcion}`;
      const falta = minutos(t.hora) - min;
      if (ya(k) || falta > antes || falta < 0) continue;
      const cuando = falta < 60 ? `en ${falta} min` : `en ${Math.round(falta / 6) / 10} h`.replace(".", ",");
      await backend.notificar(t.descripcion, `Hoy a las ${t.hora} (${cuando})${t.tags[0] ? ` · ${this.a.asignatura(t.tags[0])?.nombre ?? t.tags[0]}` : ""}`);
      nuevos.push(k);
    }

    if (nuevos.length) guardarAvisados([...avisados, ...nuevos]);
  }

  /** Aviso de prueba desde los ajustes. */
  async probar(): Promise<boolean> {
    return backend.notificar("Check", "Así se verán los avisos de tus tareas.");
  }
}
