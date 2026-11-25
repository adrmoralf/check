// Ajustes de este equipo. La configuración del curso (asignaturas, cuatrimestres, días no lectivos
// y horario) se edita en el propio archivo, en la sección «Configuración».

import { Modal, Notice, setIcon } from "obsidian";
import type TareasApp from "../main";
import { AjustesEquipo, Modo, PESTANAS, Pestana, Tema } from "../ajustes";
import * as backend from "../backend";

class AjustesModal extends Modal {
  private datos: AjustesEquipo;

  constructor(private a: TareasApp) {
    super();
    this.datos = { ...a.equipo };
  }

  onOpen() {
    this.modalEl.addClass("pt-modal", "ajustes-modal");
    this.titleEl.setText("Ajustes");
    const c = this.contentEl;

    // Archivo
    this.titulo(c, "Archivo de tareas");
    const fila = c.createDiv({ cls: "aj-archivo" });
    fila.createDiv({ cls: "aj-ruta", text: this.datos.ruta || "(ninguno)" });
    const cambiar = fila.createEl("button", { text: "Cambiar…" });
    cambiar.addEventListener("click", async () => {
      const r = await backend.elegirArchivo();
      if (r) {
        this.close();
        await this.a.cambiarEquipo({ ruta: r });
      }
    });
    c.createDiv({
      cls: "aj-ayuda",
      text: "Asignaturas, cuatrimestres, días no lectivos y horario se configuran en el propio archivo (sección «Configuración», al final). Así se sincronizan con Drive y se pueden cambiar con IA.",
    });
    const abrir = c.createEl("button", { cls: "aj-enlace", text: "Abrir el archivo en el editor" });
    abrir.addEventListener("click", () => void backend.abrirConSistema(this.datos.ruta));
    if (this.a.erroresConfig.length || this.a.curso.erroresHorario.length || this.a.curso.erroresNoLectivos.length) {
      const e = c.createDiv({ cls: "aj-errores" });
      for (const t of [...this.a.erroresConfig, ...this.a.curso.erroresHorario, ...this.a.curso.erroresNoLectivos]) e.createDiv({ text: t });
    }

    // Vista
    this.titulo(c, "Vista");
    this.select(c, "Pestaña al abrir", PESTANAS.map((p) => [p.id, p.nombre]), this.datos.pestanaInicial, (v) => (this.datos.pestanaInicial = v as Pestana));
    this.select(c, "Tamaño", [["auto", "Automático"], ["compacto", "Siempre estrecho"], ["amplio", "Siempre amplio"]], this.datos.modo, (v) => (this.datos.modo = v as Modo));
    this.select(c, "Tema", [["auto", "Como el sistema"], ["claro", "Claro"], ["oscuro", "Oscuro"]], this.datos.tema, (v) => (this.datos.tema = v as Tema));
    this.select(c, "Qué cuenta como importante", [["4", "Alta o más"], ["5", "Solo máxima"], ["3", "Media o más"]], String(this.datos.prioridadImportante), (v) => (this.datos.prioridadImportante = Number(v)));
    this.check(c, "Clases de hoy en la cabecera", this.datos.mostrarClases, (v) => (this.datos.mostrarClases = v));
    this.check(c, "Cuenta atrás de lo importante", this.datos.mostrarCuentaAtras, (v) => (this.datos.mostrarCuentaAtras = v));
    this.colores(c);
    this.select(c, "Tamaño del texto", [13, 14, 15, 16, 17, 18, 20].map((n) => [String(n), n === 15 ? "15 (normal)" : String(n)]), String(this.datos.tamTexto), (v) => {
      this.datos.tamTexto = Number(v);
      this.vistaPrevia();
    });

    // Avisos
    this.titulo(c, "Avisos");
    this.check(c, "Avisos del sistema (mientras Check esté abierto o en la bandeja)", this.datos.avisos, (v) => (this.datos.avisos = v));
    const hora = this.fila(c, "Resumen del día a las").createEl("input", { attr: { type: "time" } });
    hora.value = this.datos.avisoHora;
    hora.addEventListener("change", () => {
      if (/^\d{2}:\d{2}$/.test(hora.value)) this.datos.avisoHora = hora.value;
    });
    this.select(c, "Tareas con hora: avisar", [["1", "1 hora antes"], ["2", "2 horas antes"], ["3", "3 horas antes"], ["6", "6 horas antes"], ["0", "No avisar"]], String(this.datos.avisoHorasAntes), (v) => (this.datos.avisoHorasAntes = Number(v)));
    const probar = c.createEl("button", { cls: "aj-enlace", text: "Probar un aviso" });
    probar.addEventListener("click", async () => {
      const ok = await this.a.avisos.probar();
      if (!ok) new Notice("El sistema no deja enviar avisos a Check. Actívalos en la configuración de notificaciones del sistema.");
    });

    // Sistema
    this.titulo(c, "Sistema");
    this.check(c, "Al cerrar la ventana, dejar Check en la bandeja (junto al reloj)", this.datos.bandeja, (v) => (this.datos.bandeja = v));
    const arranque = this.check(c, "Abrir Check al encender el PC (en la bandeja)", false, (v) => {
      void backend.cambiarArranque(v).catch((e) => new Notice(`No se pudo cambiar: ${e}`));
    });
    void backend.arranqueConSistema().then((v) => (arranque.checked = v)).catch(() => {});
    this.texto(c, "Atajo para nueva tarea", this.datos.atajo, (v) => (this.datos.atajo = v.trim()));
    c.createDiv({
      cls: "aj-ayuda",
      text: "Funciona desde cualquier programa: abre Check con el cursor en «Añadir». Ejemplos: CommandOrControl+Alt+N, CommandOrControl+Shift+Space, Alt+F9. Déjalo vacío para no usar atajo.",
    });

    // Calendario
    this.titulo(c, "Calendario (Google Calendar)");
    c.createDiv({
      cls: "aj-ayuda",
      text: "Las tareas con fecha se publican como .ics en un Gist de GitHub al que está suscrito Google Calendar. El token (permiso solo «gist») se guarda solo en este PC.",
    });
    this.texto(c, "Token de GitHub", this.datos.gistToken, (v) => (this.datos.gistToken = v.trim()), true);
    this.texto(c, "Id del Gist", this.datos.gistId, (v) => (this.datos.gistId = v.trim()));
    this.texto(c, "Archivo del Gist", this.datos.gistArchivo, (v) => (this.datos.gistArchivo = v.trim()));
    this.check(c, "Publicar automáticamente al cambiar algo", this.datos.publicarSolo, (v) => (this.datos.publicarSolo = v));

    // Archivar
    this.titulo(c, "Archivar las terminadas");
    c.createDiv({
      cls: "aj-ayuda",
      text: `Mueve las tareas hechas hace tiempo y las canceladas (con sus subtareas y notas) a ${this.a.acciones.rutaArchivo().split(/[\\/]/).pop()}, junto al archivo. Así el archivo principal se queda corto y una IA lo lee mejor.`,
    });
    this.select(c, "Terminadas hace más de", [["7", "1 semana"], ["14", "2 semanas"], ["30", "1 mes"], ["60", "2 meses"], ["90", "3 meses"]], String(this.datos.archivarDias), (v) => (this.datos.archivarDias = Number(v)));
    this.check(c, "Archivar automáticamente al abrir Check", this.datos.archivarSolo, (v) => (this.datos.archivarSolo = v));
    const archivarYa = c.createEl("button", { cls: "aj-enlace", text: "Archivar ahora" });
    archivarYa.addEventListener("click", async () => {
      archivarYa.disabled = true;
      try {
        await this.a.acciones.archivar(this.datos.archivarDias);
      } catch (e) {
        new Notice(`No se pudo archivar: ${e}`);
      } finally {
        archivarYa.disabled = false;
      }
    });

    // Actualizaciones
    this.titulo(c, "Actualizaciones");
    const version = c.createDiv({ cls: "aj-ayuda" });
    const pintarVersion = () => {
      const v = this.a.actualizador.version;
      const u = this.a.actualizador.pendiente;
      version.setText(!backend.enTauri ? "Solo en la app de escritorio." : u ? `Tienes la versión ${v}; la ${u.version} está lista para instalar.` : `Versión instalada: ${v}.`);
    };
    pintarVersion();
    this.check(c, "Buscar versiones nuevas al abrir Check y cada 6 horas", this.datos.buscarActualizaciones, (v) => (this.datos.buscarActualizaciones = v));
    const buscar = c.createEl("button", { cls: "aj-enlace", text: "Buscar ahora" });
    buscar.addEventListener("click", async () => {
      buscar.disabled = true;
      buscar.setText("Buscando…");
      const u = await this.a.actualizador.buscar(true);
      buscar.disabled = false;
      buscar.setText("Buscar ahora");
      pintarVersion();
      if (u) {
        this.close();
        this.a.actualizador.abrir();
      }
    });

    // Copias
    this.titulo(c, "Copias de seguridad");
    const copias = c.createDiv({ cls: "aj-ayuda" });
    void backend.carpetaCopias().then((d) => copias.setText(`Antes de cada cambio se guarda la versión anterior (las 30 últimas) en ${d}`));

    const botones = c.createDiv({ cls: "modal-button-container" });
    const ok = botones.createEl("button", { cls: "mod-cta", text: "Guardar" });
    ok.addEventListener("click", async () => {
      this.close();
      await this.a.cambiarEquipo(this.datos);
    });
    botones.createEl("button", { text: "Cancelar" }).addEventListener("click", () => this.close());
  }

  private titulo(c: HTMLElement, t: string) {
    c.createDiv({ cls: "aj-titulo", text: t });
  }

  private fila(c: HTMLElement, etiqueta: string): HTMLElement {
    const f = c.createDiv({ cls: "pt-campo" });
    f.createEl("label", { text: etiqueta });
    return f.createDiv({ cls: "pt-campo-control" });
  }

  private select(c: HTMLElement, et: string, ops: [string, string][], valor: string, fn: (v: string) => void) {
    const s = this.fila(c, et).createEl("select", { cls: "dropdown" });
    for (const [v, t] of ops) s.createEl("option", { value: v, text: t });
    s.value = valor;
    s.addEventListener("change", () => fn(s.value));
  }

  private check(c: HTMLElement, et: string, valor: boolean, fn: (v: boolean) => void): HTMLInputElement {
    const l = c.createEl("label", { cls: "aj-check" });
    const i = l.createEl("input", { attr: { type: "checkbox" } });
    i.checked = valor;
    i.addEventListener("change", () => fn(i.checked));
    l.createSpan({ text: et });
    return i;
  }

  /** Color principal: muestras rápidas, selector libre y «por defecto». Se ve al momento. */
  private colores(c: HTMLElement) {
    const ctrl = this.fila(c, "Color principal");
    ctrl.addClass("aj-colores");
    const muestras = ["", "#087d73", "#3b73d1", "#8250c8", "#cf4f8f", "#d64545", "#d9822b", "#2e9e5b", "#475569"];
    const botones: HTMLElement[] = [];
    const libre = ctrl.createEl("input", { attr: { type: "color", "aria-label": "Otro color" } });
    const marcar = () => {
      for (const b of botones) b.toggleClass("is-active", b.dataset.color === this.datos.acento);
      libre.value = this.datos.acento || "#087d73";
    };
    for (const m of muestras) {
      const b = ctrl.createEl("button", { cls: "aj-muestra", attr: { "aria-label": m ? m : "Por defecto", title: m ? m : "Por defecto" } });
      b.dataset.color = m;
      b.style.background = m || "var(--background-secondary)";
      if (!m) setIcon(b, "rotate-ccw");
      b.addEventListener("click", () => {
        this.datos.acento = m;
        marcar();
        this.vistaPrevia();
      });
      ctrl.insertBefore(b, libre);
      botones.push(b);
    }
    libre.addEventListener("input", () => {
      this.datos.acento = libre.value;
      marcar();
      this.vistaPrevia();
    });
    marcar();
  }

  /** Aplica color y tamaño mientras se eligen (si se cancela, se vuelve a lo guardado). */
  private vistaPrevia() {
    const guardado = { ...this.a.equipo };
    Object.assign(this.a.equipo, { acento: this.datos.acento, tamTexto: this.datos.tamTexto });
    this.a.aplicarTema();
    Object.assign(this.a.equipo, { acento: guardado.acento, tamTexto: guardado.tamTexto });
    this.cambiado = true;
  }

  private cambiado = false;

  private texto(c: HTMLElement, et: string, valor: string, fn: (v: string) => void, secreto = false) {
    const ctrl = this.fila(c, et);
    const i = ctrl.createEl("input", { attr: { type: secreto ? "password" : "text", spellcheck: "false" } });
    i.value = valor;
    i.addEventListener("input", () => fn(i.value));
    if (secreto) {
      const ver = ctrl.createEl("button", { cls: "pt-icono-boton", attr: { "aria-label": "Mostrar" } });
      setIcon(ver, "search");
      ver.addEventListener("click", () => (i.type = i.type === "password" ? "text" : "password"));
    }
  }

  onClose() {
    this.contentEl.empty();
    // Si se cerró sin guardar, se deshace la vista previa del color y el tamaño
    if (this.cambiado) this.a.aplicarTema();
  }
}

export function abrirAjustes(a: TareasApp) {
  new AjustesModal(a).open();
}
