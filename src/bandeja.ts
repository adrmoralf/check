// Icono de la bandeja del sistema: el de la app con un círculo rojo y el número de tareas para hoy
// (más las atrasadas), y un texto con el resumen al pasar el ratón.

import * as backend from "./backend";
import { TareaIdx, pendiente } from "./core/consultas";
import { hoyISO } from "./core/fechas";
import iconoUrl from "../src-tauri/icons/32x32.png";

let imagen: Promise<HTMLImageElement> | null = null;
let ultimo = "";

function cargarIcono(): Promise<HTMLImageElement> {
  imagen ??= new Promise((ok, mal) => {
    const i = new Image();
    i.onload = () => ok(i);
    i.onerror = mal;
    i.src = iconoUrl;
  });
  return imagen;
}

async function dibujar(n: number): Promise<Uint8Array | undefined> {
  const lado = 32;
  const c = document.createElement("canvas");
  c.width = c.height = lado;
  const g = c.getContext("2d");
  if (!g) return undefined;
  g.drawImage(await cargarIcono(), 0, 0, lado, lado);
  if (n > 0) {
    const texto = n > 9 ? "9+" : String(n);
    const r = 9;
    g.fillStyle = "#e5484d";
    g.beginPath();
    g.arc(lado - r, lado - r, r, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#ffffff";
    g.font = `bold ${texto.length > 1 ? 11 : 14}px Segoe UI, Ubuntu, sans-serif`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(texto, lado - r, lado - r + 1);
  }
  const blob = await new Promise<Blob | null>((ok) => c.toBlob(ok, "image/png"));
  return blob ? new Uint8Array(await blob.arrayBuffer()) : undefined;
}

export async function actualizarBandeja(todas: TareaIdx[]) {
  const hoy = hoyISO();
  const pend = todas.filter(pendiente);
  const deHoy = pend.filter((t) => t.fecha === hoy).length;
  const atrasadas = pend.filter((t) => t.fecha && t.fecha < hoy).length;
  const partes = [`${deHoy} para hoy`];
  if (atrasadas) partes.push(`${atrasadas} atrasada${atrasadas === 1 ? "" : "s"}`);
  const texto = `Check · ${partes.join(" · ")}`;
  const n = deHoy + atrasadas;
  const clave = `${texto}|${n}`;
  if (clave === ultimo) return;
  ultimo = clave;
  try {
    await backend.actualizarBandeja(texto, await dibujar(n));
  } catch (e) {
    console.warn("No se pudo actualizar la bandeja", e);
  }
}
