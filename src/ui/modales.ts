// Añadir / editar tarea, con las opciones de un «añadir rápido» clásico: nombre (que entiende la
// frase y resalta lo reconocido), descripción, fecha (atajos, calendario, hora y repetición),
// prioridad, tipo (examen, entrega, práctica), subtarea de… y la asignatura abajo a la izquierda. También el selector de fecha.

import { App, Menu, Modal, Notice, setIcon } from "obsidian";
import type TareasApp from "../main";
import { TareaIdx, ordenar, pendiente } from "../core/consultas";
import {
  DIAS_LARGOS, ISO, MESES_LARGOS, diaSemana, esISO, fechaCorta, hoyISO, lunesDe, primeroDeMes, proximoLunes, sumarDias, sumarMeses,
} from "../core/fechas";
import { parsearRapido } from "../core/rapido";
import { TIPOS, TipoTarea, construirLinea, describirRegla, parsearTarea } from "../core/tarea";

export interface OpcionesAnadir {
  tag?: string;
  fecha?: ISO | null;
  padre?: TareaIdx;
  /** Si se indica, el formulario edita esta tarea en lugar de crear una nueva */
  editar?: TareaIdx;
}

const PRIORIDADES: { v: number; nombre: string; color: string }[] = [
  { v: 5, nombre: "Máxima", color: "var(--sello-rojo)" },
  { v: 4, nombre: "Alta", color: "var(--sello-rojo)" },
  { v: 3, nombre: "Media", color: "var(--sello-azul)" },
  { v: 2, nombre: "Normal", color: "var(--tinta-3)" },
  { v: 1, nombre: "Baja", color: "var(--tinta-3)" },
];

const REGLAS: [string, string][] = [
  ["", "No se repite"], ["diaria", "Cada día"], ["laborables", "Cada día laborable"], ["semanal", "Cada semana"],
  ["quincenal", "Cada 2 semanas"], ["mensual", "Cada mes"], ["anual", "Cada año"],
  ...DIAS_LARGOS.slice(1).concat(DIAS_LARGOS[0]).map((d): [string, string] => [d, `Cada ${d}`]),
];

export class ModalAnadir extends Modal {
  private descripcion = "";
  private tag: string;
  private fecha: ISO | null;
  private hora: string | null = null;
  private prioridad = 2;
  private tipo: TipoTarea | null = null;
  private repetir: string | null = null;
  private notas = "";
  private padre: TareaIdx | null;
  private editar: TareaIdx | null;
  /** Lo elegido a mano (manda sobre lo que se entienda de la frase) */
  private elegido = { tag: false, fecha: false, prioridad: false, tipo: false, repetir: false };
  private popover: HTMLElement | null = null;
  private pintarTodo: () => void = () => {};

  constructor(private p: TareasApp, o: OpcionesAnadir = {}) {
    super(p.app);
    this.editar = o.editar ?? null;
    this.tag = o.tag ?? "";
    this.fecha = o.fecha ?? null;
    this.padre = o.padre ?? null;
    if (o.tag) this.elegido.tag = true;
    if (o.fecha) this.elegido.fecha = true;
    if (this.editar) {
      // Al editar se conserva el texto tal cual (con sus enlaces), sin las marcas de fecha y prioridad
      const t = this.editar;
      this.descripcion = textoEditable(t.texto);
      this.tag = t.tags[0] ?? "";
      this.fecha = t.fecha;
      this.hora = t.hora;
      this.prioridad = t.prioridad;
      this.tipo = t.tipo;
      this.repetir = t.repetir;
      this.notas = t.notas.join("\n");
    }
  }

  onOpen() {
    this.modalEl.addClass("pt-modal", "rapida");
    this.modalEl.setAttr("aria-label", this.editar ? "Editar tarea" : this.padre ? "Nueva subtarea" : "Nueva tarea");
    this.titleEl.addClass("oculto");
    const c = this.contentEl;

    // Nombre, con lo reconocido resaltado debajo del texto
    const nombre = c.createDiv({ cls: "rapida-nombre" });
    const resalte = nombre.createDiv({ cls: "rapida-resalte", attr: { "aria-hidden": "true" } });
    const input = nombre.createEl("input", {
      cls: "rapida-input",
      attr: { type: "text", placeholder: "Nombre de la tarea", spellcheck: "false", "aria-label": "Nombre de la tarea" },
    });
    input.value = this.descripcion;
    const pintarResalte = () => {
      resalte.empty();
      const texto = input.value;
      const tramos = this.editar || !texto.trim() ? [] : parsearRapido(texto, hoyISO(), this.p.ajustes.asignaturas).tramos;
      let i = 0;
      for (const [a, b] of [...tramos].sort((x, y) => x[0] - y[0])) {
        if (a < i) continue;
        resalte.append(texto.slice(i, a));
        resalte.createEl("mark", { text: texto.slice(a, b) });
        i = b;
      }
      resalte.append(texto.slice(i));
      resalte.scrollLeft = input.scrollLeft;
    };
    input.addEventListener("input", () => {
      this.descripcion = input.value;
      pintarResalte();
      this.pintarTodo();
    });
    input.addEventListener("scroll", () => (resalte.scrollLeft = input.scrollLeft));
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.isComposing) {
        e.preventDefault();
        void this.guardar();
      }
    });

    // Descripción (se guarda como notas de la tarea)
    const desc = c.createEl("textarea", { cls: "rapida-desc", attr: { rows: "1", placeholder: "Descripción", "aria-label": "Descripción" } });
    desc.value = this.notas;
    const crecer = () => {
      desc.style.height = "auto";
      desc.style.height = `${Math.min(160, desc.scrollHeight)}px`;
    };
    desc.addEventListener("input", () => {
      this.notas = desc.value;
      crecer();
    });
    desc.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        void this.guardar();
      }
    });

    // Botones de opciones
    const chips = c.createDiv({ cls: "rapida-chips" });
    const chipFecha = this.chip(chips, "calendar", "Fecha");
    const chipPrio = this.chip(chips, "flag", "Prioridad");
    const chipTipo = this.chip(chips, "shapes", "Tipo");
    const chipPadre = this.editar ? null : this.chip(chips, "corner-down-right", "Subtarea de…");
    const chipMas = this.editar ? null : chips.createEl("button", { cls: "rapida-chip rapida-chip-solo", attr: { type: "button", "aria-label": "Más opciones", title: "Más opciones" } });
    if (chipMas) setIcon(chipMas, "ellipsis");

    chipFecha.boton.addEventListener("click", () => this.abrirFecha(chipFecha.boton));
    chipFecha.quitar.addEventListener("click", (e) => {
      e.stopPropagation();
      this.fecha = null;
      this.hora = null;
      this.repetir = null;
      this.elegido.fecha = this.elegido.repetir = true;
      this.pintarTodo();
    });
    chipPrio.boton.addEventListener("click", (e) => this.menuPrioridad(e));
    chipPrio.quitar.addEventListener("click", (e) => {
      e.stopPropagation();
      this.prioridad = 2;
      this.elegido.prioridad = true;
      this.pintarTodo();
    });
    chipTipo.boton.addEventListener("click", (e) => this.menuTipo(e));
    chipTipo.quitar.addEventListener("click", (e) => {
      e.stopPropagation();
      this.tipo = null;
      this.elegido.tipo = true;
      this.pintarTodo();
    });
    if (chipPadre) {
      chipPadre.boton.addEventListener("click", (e) => this.menuPadre(e));
      chipPadre.quitar.addEventListener("click", (e) => {
        e.stopPropagation();
        this.padre = null;
        this.pintarTodo();
      });
    }
    chipMas?.addEventListener("click", (e) => {
      const m = new Menu();
      m.addItem((i) => i.setTitle("Subtarea de…").setIcon("corner-down-right").onClick(() => this.menuPadre(e)));
      m.addItem((i) => i.setTitle("Hora y repetición…").setIcon("repeat").onClick(() => this.abrirFecha(chipFecha.boton)));
      m.showAtMouseEvent(e);
    });

    // Pie: asignatura a la izquierda, acciones a la derecha
    const pie = c.createDiv({ cls: "rapida-pie" });
    const asig = pie.createEl("button", { cls: "rapida-asig", attr: { type: "button", "aria-label": "Asignatura" } });
    asig.addEventListener("click", (e) => this.menuAsignatura(e));
    const acciones = pie.createDiv({ cls: "rapida-acciones" });
    acciones.createEl("button", { text: "Cancelar", attr: { type: "button" } }).addEventListener("click", () => this.close());
    const ok = acciones.createEl("button", { cls: "mod-cta", text: this.editar ? "Guardar" : "Añadir tarea", attr: { type: "button" } });
    ok.addEventListener("click", () => void this.guardar());

    this.pintarTodo = () => {
      const d = this.efectivo();
      const hoy = hoyISO();
      // Fecha
      if (d.fecha) {
        const rel = d.fecha === hoy ? "Hoy" : d.fecha === sumarDias(hoy, 1) ? "Mañana" : fechaCorta(d.fecha);
        chipFecha.poner(`${rel}${d.hora ? ` ${d.hora}` : ""}${d.repetir ? ` · ${describirRegla(d.repetir)}` : ""}`, d.fecha < hoy ? "var(--sello-rojo)" : "var(--sello-azul)");
      } else chipFecha.poner(null);
      // Prioridad
      const pr = PRIORIDADES.find((x) => x.v === d.prioridad);
      chipPrio.poner(d.prioridad !== 2 && pr ? pr.nombre : null, pr?.color);
      // Tipo
      chipTipo.poner(TIPOS.find((x) => x.v === d.tipo)?.nombre ?? null, "var(--tinta)");
      // Subtarea de
      chipPadre?.poner(this.padre ? this.padre.descripcion : null);
      // Asignatura
      asig.empty();
      const a = d.tag ? this.p.asignatura(d.tag) : undefined;
      const marca = asig.createSpan({ cls: "rapida-asig-color" });
      marca.style.setProperty("--tarea-color", d.tag ? this.p.color(d.tag) : "var(--tinta-3)");
      asig.createSpan({ cls: "rapida-asig-texto", text: d.tag ? (a ? `${a.tag} · ${a.nombre}` : d.tag) : "Sin asignatura" });
      setIcon(asig.createSpan({ cls: "rapida-asig-flecha" }), "chevron-down");
      ok.disabled = !d.descripcion.trim();
    };

    pintarResalte();
    this.pintarTodo();
    crecer();
    window.setTimeout(() => input.focus(), 0);
  }

  /** Botón de opción con su texto y una ✕ para quitar el valor. */
  private chip(padre: HTMLElement, icono: string, vacio: string) {
    const boton = padre.createEl("button", { cls: "rapida-chip", attr: { type: "button" } });
    setIcon(boton.createSpan({ cls: "rapida-chip-icono" }), icono);
    const texto = boton.createSpan({ cls: "rapida-chip-texto", text: vacio });
    const quitar = boton.createSpan({ cls: "rapida-chip-quitar oculto", attr: { role: "button", "aria-label": `Quitar ${vacio.toLowerCase()}` } });
    setIcon(quitar, "x");
    const poner = (valor: string | null, color?: string) => {
      texto.setText(valor ?? vacio);
      boton.toggleClass("con-valor", valor !== null);
      quitar.toggleClass("oculto", valor === null);
      if (color && valor !== null) boton.style.setProperty("--chip-color", color);
      else boton.style.removeProperty("--chip-color");
    };
    return { boton, quitar, poner };
  }

  // ---------------------------------------------------------------- fecha

  private cerrarPopover() {
    this.popover?.remove();
    this.popover = null;
  }

  private abrirFecha(ancla: HTMLElement) {
    if (this.popover) return this.cerrarPopover();
    const hoy = hoyISO();
    const pop = document.body.createDiv({ cls: "rapida-pop", attr: { role: "dialog", "aria-label": "Fecha" } });
    this.popover = pop;
    const r = ancla.getBoundingClientRect();
    pop.style.left = `${Math.max(8, Math.min(r.left, window.innerWidth - 296))}px`;
    pop.style.top = `${r.bottom + 6}px`;

    const elegir = (f: ISO | null) => {
      this.fecha = f;
      this.elegido.fecha = true;
      if (!f) {
        this.hora = null;
        this.repetir = null;
        this.elegido.repetir = true;
      }
      this.pintarTodo();
      this.cerrarPopover();
    };

    let finde = hoy;
    while (diaSemana(finde) !== 6) finde = sumarDias(finde, 1);
    const atajos: [string, string, ISO | null][] = [
      ["sun", "Hoy", hoy],
      ["sunrise", "Mañana", sumarDias(hoy, 1)],
      ["sofa", "Este fin de semana", finde],
      ["calendar-plus", "Próxima semana", proximoLunes(hoy)],
      ["circle-slash", "Sin fecha", null],
    ];
    const lista = pop.createDiv({ cls: "rapida-pop-atajos" });
    for (const [icono, nombre, f] of atajos) {
      const b = lista.createEl("button", { cls: "rapida-pop-atajo", attr: { type: "button" } });
      setIcon(b.createSpan({ cls: "rapida-pop-icono" }), icono);
      b.createSpan({ text: nombre });
      b.createSpan({ cls: "rapida-pop-dia", text: f ? fechaCorta(f) : "" });
      b.addEventListener("click", () => elegir(f));
    }

    // Mini calendario
    let mes = primeroDeMes(this.efectivo().fecha ?? hoy);
    const cal = pop.createDiv({ cls: "rapida-cal" });
    const pintarCal = () => {
      cal.empty();
      const [a, m] = mes.split("-").map(Number);
      const cab = cal.createDiv({ cls: "rapida-cal-cab" });
      cab.createSpan({ text: `${MESES_LARGOS[m - 1]} ${a}` });
      const nav = cab.createDiv({ cls: "rapida-cal-nav" });
      const flecha = (icono: string, etiqueta: string, n: number) => {
        const b = nav.createEl("button", { cls: "boton-icono", attr: { type: "button", "aria-label": etiqueta } });
        setIcon(b, icono);
        b.addEventListener("click", () => {
          mes = sumarMeses(mes, n);
          pintarCal();
        });
      };
      flecha("chevron-left", "Mes anterior", -1);
      flecha("chevron-right", "Mes siguiente", 1);
      const rej = cal.createDiv({ cls: "rapida-cal-rejilla" });
      for (const d of ["L", "M", "X", "J", "V", "S", "D"]) rej.createSpan({ cls: "rapida-cal-sem", text: d });
      const sel = this.efectivo().fecha;
      const fin = sumarMeses(mes, 1);
      for (let d = lunesDe(mes); d < fin || diaSemana(d) !== 1; d = sumarDias(d, 1)) {
        const b = rej.createEl("button", { cls: "rapida-cal-dia", text: String(Number(d.slice(8))), attr: { type: "button", "aria-label": fechaCorta(d) } });
        if (d.slice(0, 7) !== mes.slice(0, 7)) b.addClass("fuera");
        if (d < hoy) b.addClass("pasado");
        if (d === hoy) b.addClass("hoy");
        if (d === sel) b.addClass("elegido");
        b.addEventListener("click", () => elegir(d));
      }
    };
    pintarCal();

    // Hora y repetición
    const pie = pop.createDiv({ cls: "rapida-pop-pie" });
    const filaHora = pie.createEl("label", { cls: "rapida-pop-campo" });
    setIcon(filaHora.createSpan({ cls: "rapida-pop-icono" }), "clock");
    filaHora.createSpan({ text: "Hora" });
    const hora = filaHora.createEl("input", { attr: { type: "time" } });
    hora.value = this.efectivo().hora ?? "";
    hora.addEventListener("change", () => {
      this.hora = /^\d{1,2}:\d{2}$/.test(hora.value) ? hora.value : null;
      if (this.hora && !this.efectivo().fecha) {
        this.fecha = hoy;
        this.elegido.fecha = true;
      }
      this.pintarTodo();
    });
    const filaRep = pie.createEl("label", { cls: "rapida-pop-campo" });
    setIcon(filaRep.createSpan({ cls: "rapida-pop-icono" }), "repeat");
    filaRep.createSpan({ text: "Repetir" });
    const rep = filaRep.createEl("select");
    const actual = this.efectivo().repetir;
    const reglas = [...REGLAS];
    if (actual && !reglas.some(([v]) => v === actual)) reglas.push([actual, describirRegla(actual)]);
    for (const [v, t] of reglas) rep.createEl("option", { value: v, text: t });
    rep.value = actual ?? "";
    rep.addEventListener("change", () => {
      this.repetir = rep.value || null;
      this.elegido.repetir = true;
      // Una tarea que se repite necesita fecha: si no tiene, empieza hoy
      if (this.repetir && !this.efectivo().fecha) {
        this.fecha = hoy;
        this.elegido.fecha = true;
      }
      this.pintarTodo();
    });

    // Que quepa en la ventana: debajo del botón, si no encima, y si tampoco, con desplazamiento
    const alto = pop.offsetHeight;
    if (r.bottom + 6 + alto > window.innerHeight - 8) {
      const arriba = r.top - 6 - alto;
      if (arriba >= 8) pop.style.top = `${arriba}px`;
      else {
        pop.style.top = "8px";
        pop.style.maxHeight = `${window.innerHeight - 16}px`;
        pop.style.overflowY = "auto";
      }
    }

    // Cerrar al pulsar fuera
    const fuera = (e: MouseEvent) => {
      if (!pop.isConnected) return document.removeEventListener("mousedown", fuera, true);
      if (!pop.contains(e.target as Node) && !ancla.contains(e.target as Node)) {
        document.removeEventListener("mousedown", fuera, true);
        this.cerrarPopover();
      }
    };
    window.setTimeout(() => document.addEventListener("mousedown", fuera, true), 0);
  }

  // ---------------------------------------------------------------- menús

  private menuPrioridad(e: MouseEvent) {
    const m = new Menu();
    const actual = this.efectivo().prioridad;
    for (const pr of PRIORIDADES) {
      m.addItem((i) =>
        i.setTitle(pr.nombre).setIcon("flag").setChecked(pr.v === actual).onClick(() => {
          this.prioridad = pr.v;
          this.elegido.prioridad = true;
          this.pintarTodo();
        }),
      );
    }
    m.showAtMouseEvent(e);
  }

  private menuTipo(e: MouseEvent) {
    const m = new Menu();
    const actual = this.efectivo().tipo;
    const elegir = (v: TipoTarea | null) => {
      this.tipo = v;
      this.elegido.tipo = true;
      this.pintarTodo();
    };
    for (const t of TIPOS) m.addItem((i) => i.setTitle(t.nombre).setIcon("shapes").setChecked(t.v === actual).onClick(() => elegir(t.v)));
    m.addSeparator();
    m.addItem((i) => i.setTitle("Sin tipo").setChecked(!actual).onClick(() => elegir(null)));
    m.showAtMouseEvent(e);
  }

  private menuAsignatura(e: MouseEvent) {
    const m = new Menu();
    const actual = this.efectivo().tag;
    const elegir = (tag: string) => {
      this.tag = tag;
      this.elegido.tag = true;
      this.pintarTodo();
    };
    m.addItem((i) => i.setTitle("Sin asignatura").setChecked(!actual).onClick(() => elegir("")));
    const cuatri = this.p.cuatriActual(hoyISO());
    const enCurso = this.p.ajustes.asignaturas.filter((a) => a.cuatri === "anual" || a.cuatri === String(cuatri));
    const otras = this.p.ajustes.asignaturas.filter((a) => !enCurso.includes(a));
    if (enCurso.length) m.addSeparator();
    for (const a of enCurso) m.addItem((i) => i.setTitle(`${a.tag} · ${a.nombre}`).setChecked(a.tag === actual).onClick(() => elegir(a.tag)));
    if (otras.length) m.addSeparator();
    for (const a of otras) m.addItem((i) => i.setTitle(`${a.tag} · ${a.nombre}`).setChecked(a.tag === actual).onClick(() => elegir(a.tag)));
    m.showAtMouseEvent(e);
  }

  private menuPadre(e: MouseEvent) {
    const m = new Menu();
    const tag = this.efectivo().tag;
    const candidatas = ordenar(this.p.almacen.todas.filter((t) => pendiente(t) && t.padre === null && (!tag || t.tags.includes(tag)))).slice(0, 14);
    m.addItem((i) =>
      i.setTitle("Ninguna (tarea suelta)").setChecked(!this.padre).onClick(() => {
        this.padre = null;
        this.pintarTodo();
      }),
    );
    if (candidatas.length) m.addSeparator();
    for (const t of candidatas) {
      m.addItem((i) =>
        i.setTitle(`${t.tags[0] ? `${t.tags[0]} · ` : ""}${t.descripcion}${t.fecha ? ` · ${fechaCorta(t.fecha)}` : ""}`).setChecked(t === this.padre).onClick(() => {
          this.padre = t;
          this.pintarTodo();
        }),
      );
    }
    m.showAtMouseEvent(e);
  }

  // ---------------------------------------------------------------- datos

  /**
   * Lo que se va a guardar. Al crear, la frase escrita se interpreta como en la línea de añadir y
   * rellena lo que no se haya elegido a mano (lo elegido a mano manda).
   */
  private efectivo() {
    const base = { descripcion: this.descripcion, tag: this.tag, fecha: this.fecha, hora: this.hora, prioridad: this.prioridad, tipo: this.tipo, repetir: this.repetir };
    if (this.editar || !this.descripcion.trim()) return base;
    const r = parsearRapido(this.descripcion, hoyISO(), this.p.ajustes.asignaturas);
    if (!r.entendido.length || !r.descripcion) return base;
    return {
      descripcion: r.descripcion,
      tag: this.elegido.tag ? this.tag : this.tag || r.tag || "",
      fecha: this.elegido.fecha ? this.fecha : (this.fecha ?? r.fecha ?? null),
      hora: this.hora ?? (this.elegido.fecha ? null : (r.hora ?? null)),
      prioridad: this.elegido.prioridad ? this.prioridad : (r.prioridad ?? 2),
      tipo: this.elegido.tipo ? this.tipo : (this.tipo ?? r.tipo ?? null),
      repetir: this.elegido.repetir ? this.repetir : (this.repetir ?? r.repetir ?? null),
    };
  }

  private datos() {
    const d = this.efectivo();
    return {
      descripcion: d.descripcion,
      tag: d.tag || undefined,
      fecha: d.fecha,
      hora: d.fecha ? d.hora : null,
      prioridad: d.prioridad,
      tipo: d.tipo,
      repetir: d.fecha ? d.repetir : null,
    };
  }

  private listaNotas(): string[] {
    return this.notas.split(/\r?\n/).map((n) => n.trim()).filter(Boolean);
  }

  private async guardar() {
    const datos = this.datos();
    if (!datos.descripcion.trim()) return;
    try {
      if (this.editar) {
        await this.p.acciones.editar(this.editar, datos, this.listaNotas());
      } else {
        await this.p.acciones.anadir(construirLinea(datos), {
          nota: this.p.ajustes.notaTareas,
          seccion: this.p.asignatura(datos.tag)?.nombre ?? "Otras tareas",
          padre: this.padre ?? undefined,
          notas: this.listaNotas(),
        });
        new Notice(`Añadida: ${datos.descripcion}`);
      }
      this.close();
    } catch (e) {
      new Notice(`No se pudo guardar: ${(e as Error).message}`);
    }
  }

  onClose() {
    this.cerrarPopover();
    this.contentEl.empty();
  }
}

/** Texto de la tarea para editarlo: sin casilla, etiquetas, fecha, prioridad, tipo ni ✓. */
function textoEditable(linea: string): string {
  const t = parsearTarea(linea);
  if (!t) return "";
  return linea
    .replace(/^\s*(?:[-*+]|\d+[.)])\s+\[.\]\s+/, "")
    .replace(/(^|\s)#[^\s#\]|,;:!?()]+/g, "$1")
    .replace(/(^|\s)@\d{4}-\d{2}-\d{2}(?:\s+\d{1,2}:\d{2})?(?=\s|$)/g, "$1")
    .replace(/(^|\s)!(máxima|maxima|máx|max|alta|media|baja|mínima|minima|mín|min)(?=\s|$)/giu, "$1")
    .replace(/(^|\s)\+(examen|entrega|pr[aá]ctica)(?=\s|$)/giu, "$1")
    .replace(/(^|\s)[✓✔]\s?\d{4}-\d{2}-\d{2}/gu, "$1")
    .replace(/(^|\s)↻\s?[\p{L}\d]+(?=\s|$)/gu, "$1")
    .replace(/\s*(📅|⏳|🛫|✅)️?\s*\d{4}-\d{2}-\d{2}/gu, "")
    .replace(/\s*[🔺⏫🔼🔽⏬]️?/gu, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export class ModalFecha extends Modal {
  constructor(app: App, private inicial: ISO, private alElegir: (f: ISO) => void) {
    super(app);
  }

  onOpen() {
    this.modalEl.addClass("pt-modal", "pt-modal-fecha");
    this.titleEl.setText("Elegir fecha");
    const input = this.contentEl.createEl("input", { attr: { type: "date" } });
    input.value = this.inicial;
    const ok = this.contentEl.createDiv({ cls: "modal-button-container" }).createEl("button", { cls: "mod-cta", text: "Cambiar" });
    const elegir = () => {
      if (!esISO(input.value)) return;
      this.alElegir(input.value);
      this.close();
    };
    ok.addEventListener("click", elegir);
    input.addEventListener("keydown", (e) => e.key === "Enter" && elegir());
    window.setTimeout(() => input.focus(), 0);
  }

  onClose() {
    this.contentEl.empty();
  }
}
