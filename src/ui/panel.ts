// Panel: la hoja de trabajo (cabecera de documento, línea de añadir, buscador y contenido de la
// pestaña activa) y, en el raíl, las pestañas y la leyenda de asignaturas que sirve de filtro.

import { Notice, setIcon } from "obsidian";
import type PanelTareasPlugin from "../main";
import { Modo, PESTANAS, Pestana } from "../ajustes";
import { Filtro, TareaIdx, filtrar, pendiente, resumen } from "../core/consultas";
import { ISO, fechaCorta, hoyISO, primeroDeMes } from "../core/fechas";
import { parsearRapido } from "../core/rapido";
import { TIPOS, construirLinea, describirRegla } from "../core/tarea";
import { ModalAnadir } from "./modales";
import { pintarHoy } from "./pestanas/hoy";
import { pintarInicio } from "./pestanas/inicio";
import { pintarAsignaturas } from "./pestanas/asignaturas";
import { pintarCalendario } from "./pestanas/calendario";
import { pintarCuatrimestre } from "./pestanas/cuatrimestre";

export interface OpcionesPanel {
  pestana?: Pestana;
  modo?: Modo;
  /** Dónde van las pestañas y la leyenda de asignaturas (el raíl de la ventana) */
  rail?: HTMLElement;
}

/** Lo que recibe cada pestaña para dibujarse. */
export interface Contexto {
  p: PanelTareasPlugin;
  panel: Panel;
  hoy: ISO;
  /** Tareas con el filtro aplicado */
  tareas: TareaIdx[];
  /** Todas las tareas (para contar subtareas aunque el filtro las oculte) */
  todas: TareaIdx[];
  /** Cabecera de documento de la pestaña: título y datos a la derecha */
  cabecera: HTMLElement;
}

const ANCHO_AMPLIO = 760;

export class Panel {
  pestana: Pestana;
  filtro: Filtro = { tags: new Set(), texto: "" };
  /** Mes que enseña el calendario y día seleccionado */
  mes: ISO;
  diaSeleccionado: ISO;

  private raiz: HTMLElement;
  private cabecera!: HTMLElement;
  private leyenda: HTMLElement | null = null;
  private filtroActivo!: HTMLElement;
  private contenido!: HTMLElement;
  private rapido!: HTMLInputElement;
  private botonesPestana = new Map<Pestana, { boton: HTMLElement; cuenta: HTMLElement }>();
  private observador: ResizeObserver | null = null;

  constructor(private p: PanelTareasPlugin, contenedor: HTMLElement, private o: OpcionesPanel = {}) {
    const inicial = o.pestana ?? p.ajustes.pestanaInicial;
    // Una pestaña guardada que ya no existe (Semana, Estadísticas, Entregas) vuelve a Inicio
    this.pestana = PESTANAS.some((t) => t.id === inicial) ? inicial : "inicio";
    const hoy = hoyISO();
    this.mes = primeroDeMes(hoy);
    this.diaSeleccionado = hoy;
    contenedor.empty();
    this.raiz = contenedor.createDiv({ cls: "panel-tareas" });
    this.montar();
    this.aplicarModo();
  }

  private montar() {
    const rail = this.o.rail ?? this.raiz;
    const nav = rail.createEl("nav", { cls: "rail-pestanas", attr: { role: "tablist", "aria-label": "Vistas" } });
    for (const t of PESTANAS) {
      const b = nav.createEl("button", { cls: "rail-pestana", attr: { role: "tab", type: "button" } });
      setIcon(b.createSpan({ cls: "rail-pestana-icono" }), t.icono);
      b.createSpan({ cls: "rail-pestana-texto", text: t.nombre });
      const cuenta = b.createSpan({ cls: "rail-cuenta" });
      b.addEventListener("click", () => this.irA(t.id));
      this.botonesPestana.set(t.id, { boton: b, cuenta });
    }
    this.leyenda = rail.createDiv({ cls: "rail-asignaturas" });

    this.cabecera = this.raiz.createDiv({ cls: "hoja-cabecera" });
    const herramientas = this.raiz.createDiv({ cls: "hoja-herramientas" });
    this.montarRapido(herramientas);
    const buscar = herramientas.createDiv({ cls: "hoja-buscar" });
    setIcon(buscar.createSpan({ cls: "hoja-buscar-icono" }), "search");
    const input = buscar.createEl("input", { attr: { type: "search", placeholder: "Buscar", "aria-label": "Buscar tareas" } });
    input.addEventListener("input", () => {
      this.filtro.texto = input.value;
      this.pintarContenido();
    });
    this.filtroActivo = this.raiz.createDiv({ cls: "hoja-filtro" });
    this.contenido = this.raiz.createDiv({ cls: "hoja-contenido" });
  }

  /** Línea para añadir escribiendo: «memoria RIS mañana 23:59 alta» → tarea con todo puesto. */
  private montarRapido(padre: HTMLElement) {
    const caja = padre.createDiv({ cls: "rapido" });
    const fila = caja.createEl("label", { cls: "rapido-fila" });
    setIcon(fila.createSpan({ cls: "rapido-icono" }), "plus");
    const input = fila.createEl("input", {
      attr: { type: "text", placeholder: "Nueva tarea", spellcheck: "false", "aria-label": "Añadir una tarea escribiendo, por ejemplo «memoria RIS mañana 23:59 alta»" },
    });
    this.rapido = input;
    const atajo = (this.p as unknown as { equipo?: { atajo?: string } }).equipo?.atajo;
    const tecla = atajo ? fila.createEl("kbd", { cls: "rapido-atajo", text: atajo.replace("CommandOrControl", "Ctrl"), attr: { title: "Atajo para añadir desde cualquier programa" } }) : null;
    const mas = fila.createEl("button", { cls: "rapido-mas", attr: { type: "button", "aria-label": "Más opciones (Ctrl+N)", title: "Más opciones (Ctrl+N)" } });
    setIcon(mas, "sliders-horizontal");
    mas.addEventListener("click", (e) => {
      e.preventDefault();
      new ModalAnadir(this.p, { tag: [...this.filtro.tags][0] }).open();
    });
    // Lo entendido, en una sola línea de texto: «Memoria · RIS · mié 25 nov · 23:59 · alta»
    const previa = caja.createDiv({ cls: "rapido-previa", attr: { "aria-live": "polite" } });
    const leer = () => parsearRapido(input.value, hoyISO(), this.p.ajustes.asignaturas);
    const PRIO: Record<number, string> = { 5: "máxima", 4: "alta", 3: "media", 1: "baja" };
    const actualizar = () => {
      const hay = !!input.value.trim();
      caja.toggleClass("con-texto", hay);
      tecla?.toggleClass("oculto", hay);
      previa.empty();
      if (!hay) return;
      const r = leer();
      const partes = [r.tag ?? "", r.fecha ? `${fechaCorta(r.fecha)}${r.hora ? ` · ${r.hora}` : ""}` : "", PRIO[r.prioridad ?? 2] ?? "", TIPOS.find((x) => x.v === r.tipo)?.nombre.toLowerCase() ?? "", r.repetir ? describirRegla(r.repetir) : ""].filter(Boolean);
      previa.createSpan({ cls: "rapido-desc", text: r.descripcion || "Falta el texto" });
      if (partes.length) previa.createSpan({ text: ` · ${partes.join(" · ")}` });
    };
    input.addEventListener("input", actualizar);
    input.addEventListener("keydown", async (e) => {
      if (e.key === "Escape") {
        input.value = "";
        actualizar();
        return;
      }
      if (e.key !== "Enter" || e.isComposing) return;
      e.preventDefault();
      const r = leer();
      if (!r.descripcion) return;
      try {
        await this.p.acciones.anadir(construirLinea(r), {
          nota: this.p.ajustes.notaTareas,
          seccion: this.p.asignatura(r.tag)?.nombre ?? "Otras tareas",
        });
        new Notice(`Añadida: ${r.descripcion}`);
        input.value = "";
        actualizar();
      } catch (err) {
        new Notice(`No se pudo añadir: ${(err as Error).message}`);
      }
    });
  }

  /** Pone el cursor en la línea de añadir. */
  enfocarRapido() {
    this.rapido?.focus();
  }

  /** Compacto / amplio: en "auto" depende del ancho disponible. */
  aplicarModo() {
    this.observador?.disconnect();
    this.observador = null;
    const modo = this.o.modo ?? this.p.ajustes.modo;
    if (modo === "auto") {
      this.observador = new ResizeObserver((entradas) => {
        const ancho = entradas[0]?.contentRect.width ?? 0;
        this.raiz.toggleClass("pt-ancho", ancho >= ANCHO_AMPLIO);
      });
      this.observador.observe(this.raiz);
    } else {
      this.raiz.toggleClass("pt-ancho", modo === "amplio");
    }
  }

  irA(pestana: Pestana) {
    this.pestana = pestana;
    this.pintar();
  }

  pintar() {
    const hoy = hoyISO();
    const r = resumen(this.p.almacen.todas, hoy);
    for (const [id, { boton, cuenta }] of this.botonesPestana) {
      boton.toggleClass("is-active", id === this.pestana);
      boton.setAttr("aria-selected", String(id === this.pestana));
      if (id === "hoy") {
        const n = r.atrasadas.length + r.hoy.length;
        cuenta.setText(n ? String(n) : "");
        cuenta.toggleClass("rail-cuenta-roja", r.atrasadas.length > 0);
      }
    }
    this.pintarLeyenda();
    this.pintarContenido();
  }

  /** Leyenda de asignaturas del raíl: cada una filtra al pulsarla. */
  private pintarLeyenda() {
    const l = this.leyenda;
    if (!l) return;
    l.empty();
    const pend = this.p.almacen.todas.filter(pendiente);
    const cuenta = (tag: string) => pend.filter((t) => t.tags.includes(tag)).length;
    const conTareas = new Set(pend.flatMap((t) => t.tags));
    const orden = [
      ...this.p.ajustes.asignaturas.map((a) => a.tag).filter((t) => conTareas.has(t)),
      ...[...conTareas].filter((t) => !this.p.asignatura(t)).sort(),
    ];
    for (const tag of [...this.filtro.tags]) if (!orden.includes(tag)) orden.push(tag);
    if (!orden.length) return;
    l.createDiv({ cls: "rail-rotulo", text: "Asignaturas" });
    for (const tag of orden) {
      const nombre = this.p.asignatura(tag)?.nombre ?? tag;
      const b = l.createEl("button", { cls: "rail-asig", attr: { type: "button", title: `${nombre}: filtrar`, "aria-pressed": String(this.filtro.tags.has(tag)) } });
      b.style.setProperty("--tarea-color", this.p.color(tag));
      b.toggleClass("is-active", this.filtro.tags.has(tag));
      b.createSpan({ cls: "rail-asig-color" });
      b.createSpan({ cls: "rail-asig-tag", text: tag });
      b.createSpan({ cls: "rail-asig-n", text: String(cuenta(tag) || "") });
      b.addEventListener("click", () => {
        if (this.filtro.tags.has(tag)) this.filtro.tags.delete(tag);
        else this.filtro.tags.add(tag);
        this.pintar();
      });
    }
  }

  pintarContenido() {
    const scroll = this.contenido.scrollTop;
    this.contenido.empty();
    this.cabecera.empty();
    this.pintarFiltroActivo();
    if (!this.p.almacen.listo) {
      this.contenido.createDiv({ cls: "hoja-vacia", text: "Cargando tareas…" });
      return;
    }
    const ctx: Contexto = {
      p: this.p,
      panel: this,
      hoy: hoyISO(),
      tareas: filtrar(this.p.almacen.todas, this.filtro),
      todas: this.p.almacen.todas,
      cabecera: this.cabecera,
    };
    const el = this.contenido.createDiv({ cls: `vista vista-${this.pestana}` });
    switch (this.pestana) {
      case "hoy": pintarHoy(ctx, el); break;
      case "inicio": pintarInicio(ctx, el); break;
      case "asignaturas": pintarAsignaturas(ctx, el); break;
      case "calendario": pintarCalendario(ctx, el); break;
      case "cuatrimestre": pintarCuatrimestre(ctx, el); break;
    }
    this.contenido.scrollTop = scroll;
  }

  private pintarFiltroActivo() {
    const f = this.filtroActivo;
    f.empty();
    const tags = [...this.filtro.tags];
    f.toggleClass("oculto", !tags.length);
    if (!tags.length) return;
    f.createSpan({ text: "Solo " });
    f.createSpan({ cls: "hoja-filtro-tags", text: tags.map((t) => this.p.asignatura(t)?.nombre ?? t).join(", ") });
    const quitar = f.createEl("button", { cls: "boton-enlace", text: "Ver todas", attr: { type: "button" } });
    quitar.addEventListener("click", () => {
      this.filtro.tags.clear();
      this.pintar();
    });
  }

  destruir() {
    this.observador?.disconnect();
  }
}

