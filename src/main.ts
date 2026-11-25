// Tareas: aplicación de escritorio (Tauri) sobre un único archivo Markdown en Google Drive.
// Reutiliza la interfaz del Panel de tareas de Obsidian; este módulo hace de «plugin»: carga el
// archivo, vigila los cambios externos (Drive, IA, Obsidian), guarda y publica el calendario.

import "./estilo.css";
import { instalarDom } from "./shim/dom";
instalarDom();

import { Notice, setIcon } from "obsidian";
import { Acciones } from "./acciones";
import { Ajustes, AjustesEquipo, Asignatura, CURSO_INICIAL, EQUIPO_INICIAL, colorCss } from "./ajustes";
import * as backend from "./backend";
import { publicarCalendario } from "./calendario";
import { TareaIdx, clave } from "./core/consultas";
import { Clase, Cuatri, NoLectivo, cuatrimestreDe, parsearHorario, parsearNoLectivos } from "./core/curso";
import { leerConfig, tareasDelDocumento } from "./core/documento";
import { ISO } from "./core/fechas";
import { documentoNuevo } from "./core/plantilla";
import { abrirAjustes } from "./ui/ajustesModal";
import { ModalAnadir } from "./ui/modales";
import { Panel } from "./ui/panel";
import { Avisos } from "./avisos";
import { actualizarBandeja } from "./bandeja";
import { ModalConflictos } from "./ui/conflictos";
import { Actualizador } from "./actualizador";

interface Curso {
  clases: Clase[];
  noLectivos: NoLectivo[];
  erroresHorario: string[];
  erroresNoLectivos: string[];
}

class Almacen {
  todas: TareaIdx[] = [];
  listo = false;
  buscar(k: string): TareaIdx | undefined {
    return this.todas.find((t) => clave(t) === k);
  }
}

const VIGILANCIA_MS = 2000;
/** Cada cuántas vueltas de la vigilancia se buscan copias en conflicto de Drive (≈ 30 s) */
const VUELTAS_CONFLICTOS = 15;

export default class TareasApp {
  app: undefined = undefined;
  equipo: AjustesEquipo = { ...EQUIPO_INICIAL };
  ajustes!: Ajustes;
  curso!: Curso;
  erroresConfig: string[] = [];
  almacen = new Almacen();
  acciones = new Acciones(this);
  contenido = "";
  private marca = { modificado: 0, tam: 0 };
  private panel: Panel | null = null;
  private estado!: HTMLElement;
  private raiz: HTMLElement;
  private temporizadorIcs: number | undefined;
  avisos = new Avisos(this);
  actualizador = new Actualizador(this);
  private vueltas = 0;
  private conflictos: string[] = [];
  private botonConflictos: HTMLElement | null = null;
  private resolviendo = false;

  constructor(raiz: HTMLElement) {
    this.raiz = raiz;
    this.aplicarConfig(CURSO_INICIAL as Omit<Ajustes, keyof AjustesEquipo | "notaTareas">);
  }

  // ---------------------------------------------------------------- arranque
  async iniciar() {
    try {
      const guardado = JSON.parse(await backend.leerConfig());
      // Inicio pasó a ser la pestaña principal: quien abría en Hoy o en Entregas abre ahora en
      // Inicio (solo esta vez; después se respeta lo que se elija en Ajustes)
      if (!guardado.inicioPrincipal && ["hoy", "entregas", undefined].includes(guardado.pestanaInicial)) guardado.pestanaInicial = "inicio";
      this.equipo = { ...EQUIPO_INICIAL, ...guardado, inicioPrincipal: true };
    } catch {
      this.equipo = { ...EQUIPO_INICIAL };
    }
    this.aplicarTema();
    matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => this.aplicarTema());
    const m = this.equipo.ruta ? await backend.marcaArchivo(this.equipo.ruta) : null;
    if (!m?.existe) return this.bienvenida(this.equipo.ruta ? `No encuentro el archivo ${this.equipo.ruta}. ¿Se ha movido o aún no ha sincronizado Drive?` : undefined);
    await this.abrirArchivo(this.equipo.ruta);
  }

  async abrirArchivo(ruta: string) {
    this.equipo.ruta = ruta;
    await this.guardarEquipo();
    const contenido = await backend.leerArchivo(ruta);
    // Primero los datos y los ajustes del equipo, después el panel (que lee la pestaña inicial)
    await this.recargar(contenido);
    this.montar();
    this.panel?.pintar();
    const m = await backend.marcaArchivo(ruta);
    this.marca = { modificado: m.modificado, tam: m.tam };
    window.setInterval(() => void this.vigilar(), VIGILANCIA_MS);
    this.programarCalendario(1500);
    await this.iniciarSistema();
  }

  /** Bandeja, atajo global, avisos, eventos del menú de la bandeja, archivado y conflictos. */
  private async iniciarSistema() {
    await backend.configBandeja(this.equipo.bandeja).catch(() => {});
    await this.aplicarAtajo();
    this.avisos.iniciar();
    void actualizarBandeja(this.almacen.todas);
    await backend.escuchar("nueva-tarea", () => new ModalAnadir(this).open());
    if (this.equipo.archivarSolo) {
      const n = await this.acciones.archivar(this.equipo.archivarDias, false).catch(() => 0);
      if (n) this.ponerEstado(`${n} tarea${n === 1 ? "" : "s"} terminada${n === 1 ? "" : "s"} archivada${n === 1 ? "" : "s"}`);
    }
    void this.buscarConflictos();
    void this.actualizador.iniciar();
    // A medianoche cambia «hoy»: se repinta y se actualiza el número de la bandeja
    let dia = new Date().toDateString();
    window.setInterval(() => {
      if (new Date().toDateString() === dia) return;
      dia = new Date().toDateString();
      this.panel?.pintar();
      void actualizarBandeja(this.almacen.todas);
    }, 60_000);
  }

  async aplicarAtajo() {
    const error = await backend.registrarAtajo(this.equipo.atajo, () => {
      void backend.mostrarVentana().then(() => {
        if (this.panel) this.panel.enfocarRapido();
        else new ModalAnadir(this).open();
      });
    });
    if (error) this.ponerEstado(error, true);
  }

  // ---------------------------------------------------------------- conflictos de Drive
  private async buscarConflictos() {
    if (!this.equipo.ruta) return;
    this.conflictos = await backend.buscarConflictos(this.equipo.ruta).catch(() => []);
    if (!this.botonConflictos) return;
    this.botonConflictos.toggleClass("oculto", !this.conflictos.length);
    const n = this.conflictos.length;
    this.botonConflictos.setAttr("title", `${n} copia${n === 1 ? "" : "s"} en conflicto de Drive: pulsa para juntarla${n === 1 ? "" : "s"}`);
    if (n && !this.resolviendo) this.ponerEstado(`Drive ha creado ${n === 1 ? "una copia" : `${n} copias`} en conflicto del archivo`, true);
  }

  private resolverConflictos() {
    if (!this.conflictos.length) return;
    this.resolviendo = true;
    new ModalConflictos(this, [...this.conflictos], () => {
      this.resolviendo = false;
      void this.buscarConflictos();
    }).open();
  }

  /** Pantalla para elegir un archivo existente o crear uno nuevo. */
  private bienvenida(aviso?: string) {
    this.raiz.empty();
    const b = this.raiz.createDiv({ cls: "bienvenida" });
    const logo = b.createDiv({ cls: "bienvenida-logo" });
    setIcon(logo, "list-checks");
    b.createEl("h1", { text: "Check" });
    b.createEl("p", { text: "Todas tus tareas en un único archivo Markdown. Ponlo en Google Drive para tenerlo en todos tus PC y edítalo también a mano o con IA." });
    if (aviso) b.createDiv({ cls: "bienvenida-aviso", text: aviso });
    const botones = b.createDiv({ cls: "bienvenida-botones" });
    const abrir = botones.createEl("button", { cls: "mod-cta", text: "Abrir un archivo existente" });
    abrir.addEventListener("click", async () => {
      const r = await backend.elegirArchivo();
      if (r) await this.abrirArchivo(r);
    });
    const crear = botones.createEl("button", { text: "Crear un archivo nuevo" });
    crear.addEventListener("click", async () => {
      const r = await backend.elegirNuevo();
      if (!r) return;
      await backend.escribirArchivo(r, documentoNuevo(CURSO_INICIAL));
      await this.abrirArchivo(r);
    });
  }

  /** Barra superior y panel. */
  private montar() {
    this.raiz.empty();
    // Raíl institucional: marca, pestañas (las pone el panel), asignaturas y acciones
    const rail = this.raiz.createEl("aside", { cls: "rail" });
    const marca = rail.createDiv({ cls: "rail-marca" });
    setIcon(marca.createSpan({ cls: "rail-logo" }), "list-checks");
    const nombre = marca.createDiv({ cls: "rail-nombre" });
    nombre.createSpan({ cls: "rail-titulo", text: "Check" });
    nombre.createSpan({ cls: "rail-archivo", text: this.equipo.ruta.split(/[\\/]/).pop() ?? "" });
    const centro = rail.createDiv({ cls: "rail-centro" });
    const pie = rail.createDiv({ cls: "rail-pie" });
    this.estado = pie.createDiv({ cls: "rail-estado", attr: { role: "status" } });
    this.avisoActualizacion(pie);
    const acciones = pie.createDiv({ cls: "rail-acciones" });
    const boton = (icono: string, etiqueta: string, fn: () => unknown) => {
      const b = acciones.createEl("button", { cls: "rail-boton", attr: { type: "button", "aria-label": etiqueta, title: etiqueta } });
      setIcon(b, icono);
      b.addEventListener("click", () => void fn());
      return b;
    };
    this.botonConflictos = boton("alert-triangle", "Copias en conflicto de Drive", () => this.resolverConflictos());
    this.botonConflictos.addClass("boton-conflicto", "oculto");
    boton("refresh-cw", "Recargar el archivo", async () => this.recargar(await this.leer()));
    boton("file-text", "Abrir el archivo en el editor", () => backend.abrirConSistema(this.equipo.ruta));
    boton("cloud-upload", "Publicar el calendario ahora", () => this.publicar(true));
    boton("settings", "Ajustes", () => abrirAjustes(this));
    const hoja = this.raiz.createEl("main", { cls: "hoja" });
    this.panel = new Panel(this as never, hoja, { rail: centro });
    document.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "n") {
        e.preventDefault();
        new ModalAnadir(this).open();
      }
    });
  }

  /** Aviso en el raíl cuando hay una versión nueva: un clic abre las novedades y el botón de actualizar. */
  private avisoActualizacion(pie: HTMLElement) {
    const aviso = pie.createEl("button", { cls: "rail-actualizacion oculto", attr: { type: "button" } });
    setIcon(aviso.createSpan({ cls: "rail-actualizacion-icono" }), "download");
    const texto = aviso.createSpan();
    aviso.addEventListener("click", () => this.actualizador.abrir());
    const pintar = () => {
      const u = this.actualizador.pendiente;
      aviso.toggleClass("oculto", !u);
      if (u) {
        texto.setText(`Actualizar a ${u.version}`);
        aviso.setAttr("title", `Check ${u.version} está disponible (tienes la ${u.currentVersion})`);
      }
    };
    this.actualizador.escuchar(pintar);
    pintar();
  }

  // ---------------------------------------------------------------- archivo
  async leer(): Promise<string> {
    return backend.leerArchivo(this.equipo.ruta);
  }

  /** Guarda el contenido, lo vuelve a analizar y programa la publicación del calendario. */
  async guardar(contenido: string) {
    try {
      await backend.escribirArchivo(this.equipo.ruta, contenido);
    } catch (e) {
      new Notice(`No se pudo guardar: ${e}`, 10000);
      throw e;
    }
    const m = await backend.marcaArchivo(this.equipo.ruta);
    this.marca = { modificado: m.modificado, tam: m.tam };
    await this.recargar(contenido);
    this.ponerEstado("Guardado");
  }

  async recargar(contenido: string) {
    this.contenido = contenido;
    const cfg = leerConfig(contenido, { ...CURSO_INICIAL, errores: [] });
    this.erroresConfig = cfg.errores;
    this.aplicarConfig(cfg);
    this.almacen.todas = tareasDelDocumento(this.equipo.ruta, contenido);
    this.almacen.listo = true;
    this.panel?.aplicarModo();
    this.panel?.pintar();
    const nombre = this.equipo.ruta.split(/[\\/]/).pop() ?? "";
    void backend.ponerTitulo(`Check — ${nombre}`);
    if (this.erroresConfig.length) this.ponerEstado(`${this.erroresConfig.length} aviso(s) en la configuración`, true);
    this.programarCalendario();
    void actualizarBandeja(this.almacen.todas);
  }

  /** Detecta cambios hechos fuera (Drive, IA, Obsidian) y los carga. */
  private async vigilar() {
    if (!this.equipo.ruta) return;
    if (++this.vueltas % VUELTAS_CONFLICTOS === 0) void this.buscarConflictos();
    const m = await backend.marcaArchivo(this.equipo.ruta);
    if (!m.existe) {
      this.ponerEstado("No se encuentra el archivo (¿Drive desconectado?)", true);
      return;
    }
    if (m.modificado === this.marca.modificado && m.tam === this.marca.tam) return;
    this.marca = { modificado: m.modificado, tam: m.tam };
    const contenido = await this.leer();
    if (contenido === this.contenido) return;
    await this.recargar(contenido);
    this.ponerEstado("Actualizado con cambios externos");
  }

  private ponerEstado(t: string, aviso = false) {
    if (!this.estado) return;
    this.estado.setText(t);
    this.estado.toggleClass("rail-estado-aviso", aviso);
    const hora = new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
    this.estado.setAttr("title", `${t} · ${hora}`);
  }

  // ---------------------------------------------------------------- calendario
  private programarCalendario(ms = 8000) {
    if (!this.equipo.publicarSolo || !this.equipo.gistToken) return;
    window.clearTimeout(this.temporizadorIcs);
    this.temporizadorIcs = window.setTimeout(() => void this.publicar(false), ms);
  }

  async publicar(manual: boolean) {
    const r = await publicarCalendario(this, manual);
    if (r) this.ponerEstado(r.mensaje, !r.ok);
    if (manual && r) new Notice(r.mensaje);
  }

  // ---------------------------------------------------------------- ajustes
  aplicarConfig(cfg: { asignaturas: Asignatura[]; c1: Ajustes["c1"]; c2: Ajustes["c2"]; noLectivos: string; horario: string }) {
    this.ajustes = {
      ...this.equipo,
      asignaturas: cfg.asignaturas,
      c1: cfg.c1,
      c2: cfg.c2,
      noLectivos: cfg.noLectivos,
      horario: cfg.horario,
      notaTareas: this.equipo.ruta.split(/[\\/]/).pop() ?? "el archivo",
    };
    const h = parsearHorario(cfg.horario);
    const n = parsearNoLectivos(cfg.noLectivos);
    this.curso = { clases: h.clases, noLectivos: n.dias, erroresHorario: h.errores, erroresNoLectivos: n.errores };
  }

  async guardarEquipo() {
    await backend.guardarConfig(JSON.stringify(this.equipo, null, 2));
  }

  async cambiarEquipo(cambios: Partial<AjustesEquipo>) {
    const rutaAntes = this.equipo.ruta;
    const atajoAntes = this.equipo.atajo;
    Object.assign(this.equipo, cambios);
    await this.guardarEquipo();
    this.aplicarTema();
    await backend.configBandeja(this.equipo.bandeja).catch(() => {});
    if (this.equipo.atajo !== atajoAntes) await this.aplicarAtajo();
    this.avisos.iniciar();
    if (cambios.buscarActualizaciones !== undefined) this.actualizador.programar();
    if (cambios.ruta && cambios.ruta !== rutaAntes) {
      location.reload();
      return;
    }
    await this.recargar(this.contenido);
  }

  aplicarTema() {
    const oscuro = this.equipo.tema === "oscuro" || (this.equipo.tema === "auto" && matchMedia("(prefers-color-scheme: dark)").matches);
    document.body.toggleClass("theme-dark", oscuro);
    document.body.toggleClass("theme-light", !oscuro);
    // Color principal y tamaño del texto elegidos en los ajustes
    const s = document.body.style;
    const acento = /^#[0-9a-f]{6}$/i.test(this.equipo.acento) ? this.equipo.acento : "";
    for (const v of ["--interactive-accent", "--interactive-accent-hover", "--text-accent", "--text-on-accent"]) s.removeProperty(v);
    if (acento) {
      s.setProperty("--interactive-accent", acento);
      s.setProperty("--interactive-accent-hover", `color-mix(in srgb, ${acento} 82%, ${oscuro ? "white" : "black"})`);
      s.setProperty("--text-accent", oscuro ? `color-mix(in srgb, ${acento} 75%, white)` : acento);
      s.setProperty("--text-on-accent", luminancia(acento) > 0.55 ? "#10201f" : "#ffffff");
    }
    const tam = Math.min(20, Math.max(12, Number(this.equipo.tamTexto) || 15));
    s.setProperty("--font-text-size", `${tam}px`);
    s.setProperty("--font-ui-small", `${Math.round(tam * 0.87)}px`);
  }

  // ---------------------------------------------------------------- lo que usa la interfaz del panel
  asignatura(tag: string | undefined): Asignatura | undefined {
    return tag ? this.ajustes.asignaturas.find((a) => a.tag.toLowerCase() === tag.toLowerCase()) : undefined;
  }

  color(tag: string | undefined): string {
    return colorCss(this.asignatura(tag)?.color);
  }

  cuatriActual(hoy: ISO): Cuatri | null {
    return cuatrimestreDe(hoy, this.ajustes.c1, this.ajustes.c2);
  }

  /** Clic en una tarea: abrir el formulario de edición. */
  async abrirTarea(t: TareaIdx) {
    new ModalAnadir(this, { editar: t }).open();
  }
}

/** Luminancia relativa de un color #rrggbb (0 negro … 1 blanco). */
function luminancia(hex: string): number {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

const app = new TareasApp(document.getElementById("app")!);
void app.iniciar().catch((e) => {
  document.getElementById("app")!.setText(`Error al arrancar: ${e}`);
});
