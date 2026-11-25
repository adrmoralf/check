// Publica el calendario .ics en el Gist al que está suscrito Google Calendar.

import type TareasApp from "./main";
import { generarIcs } from "./core/ics";

let ultimoPublicado = "";

export async function publicarCalendario(a: TareasApp, manual: boolean): Promise<{ ok: boolean; mensaje: string } | null> {
  const { gistToken, gistId, gistArchivo } = a.equipo;
  if (!gistToken || !gistId || !gistArchivo) {
    return manual ? { ok: false, mensaje: "Falta el token o el Gist del calendario (Ajustes → Calendario)." } : null;
  }
  const ics = generarIcs(a.almacen.todas, (tag) => a.asignatura(tag)?.nombre);
  // Sin cambios desde la última publicación: no se vuelve a subir (salvo a mano)
  const huella = ics.replace(/^DTSTAMP:.*$/gm, "");
  if (!manual && huella === ultimoPublicado) return null;
  try {
    const r = await fetch(`https://api.github.com/gists/${encodeURIComponent(gistId)}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${gistToken}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ files: { [gistArchivo]: { content: ics } } }),
    });
    if (!r.ok) {
      const motivo = r.status === 401 ? "token no válido o caducado" : r.status === 404 ? "Gist no encontrado o sin permiso" : `error ${r.status}`;
      return { ok: false, mensaje: `Calendario no publicado: ${motivo}` };
    }
    ultimoPublicado = huella;
    const n = (ics.match(/BEGIN:VEVENT/g) ?? []).length;
    return { ok: true, mensaje: `Calendario publicado (${n} eventos)` };
  } catch (e) {
    return { ok: false, mensaje: `Calendario no publicado: sin conexión (${e})` };
  }
}
