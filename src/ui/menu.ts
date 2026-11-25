// Menú del clic derecho sobre una tarea.

import { Menu } from "obsidian";
import type TareasApp from "../main";
import { TareaIdx } from "../core/consultas";
import { hoyISO, maxISO, proximoLunes, sumarDias } from "../core/fechas";
import { ModalAnadir, ModalFecha } from "./modales";

export function menuTarea(p: TareasApp, t: TareaIdx, evento: MouseEvent) {
  const hoy = hoyISO();
  // Posponer cuenta desde la fecha de la tarea o desde hoy si ya pasó
  const base = t.fecha ? maxISO(t.fecha, hoy) : hoy;
  const m = new Menu();

  m.addItem((i) => i.setTitle(t.hecha ? "Reabrir" : "Marcar como hecha").setIcon(t.hecha ? "rotate-ccw" : "check").onClick(() => p.acciones.alternar(t)));
  m.addItem((i) => i.setTitle("Editar…").setIcon("pencil").onClick(() => new ModalAnadir(p, { editar: t }).open()));
  m.addSeparator();

  const fechas: [string, string, string][] = [
    ["Hoy", "sun", hoy],
    ["Mañana", "sunrise", sumarDias(hoy, 1)],
    ["Posponer 1 día", "chevron-right", sumarDias(base, 1)],
    ["Posponer 1 semana", "chevrons-right", sumarDias(base, 7)],
    ["Al próximo lunes", "calendar-plus", proximoLunes(hoy)],
  ];
  for (const [titulo, icono, fecha] of fechas) {
    m.addItem((i) => i.setTitle(titulo).setIcon(icono).onClick(() => p.acciones.moverA(t, fecha)));
  }
  m.addItem((i) => i.setTitle("Elegir fecha…").setIcon("calendar-search").onClick(() => new ModalFecha(p.app, t.fecha ?? hoy, (f) => void p.acciones.moverA(t, f)).open()));
  if (t.fecha) m.addItem((i) => i.setTitle("Quitar fecha").setIcon("calendar-x").onClick(() => p.acciones.moverA(t, null)));
  m.addSeparator();

  const prioridades: [number, string][] = [[5, "Máxima"], [4, "Alta"], [3, "Media"], [2, "Normal"], [1, "Baja"]];
  for (const [valor, nombre] of prioridades) {
    m.addItem((i) => i.setTitle(`Prioridad: ${nombre}`).setChecked(t.prioridad === valor).onClick(() => p.acciones.prioridad(t, valor)));
  }
  m.addSeparator();
  m.addItem((i) => i.setTitle("Añadir subtarea…").setIcon("list-plus").onClick(() => new ModalAnadir(p, { padre: t, tag: t.tags[0] }).open()));
  m.addItem((i) => i.setTitle("Eliminar").setIcon("trash-2").onClick(() => p.acciones.eliminar(t)));

  m.showAtMouseEvent(evento);
}
