// Sustituto mínimo del módulo «obsidian» para la interfaz del panel: iconos, menú contextual,
// ventanas modales y avisos.

import {
  BarChart3, Calendar, CalendarDays, CalendarPlus, CalendarSearch, CalendarX, Check, ChevronLeft, ChevronRight,
  ChevronsRight, CloudUpload, FileText, FolderOpen, GraduationCap, ListChecks, ListPlus, Milestone, Pencil, Plus,
  RefreshCw, RotateCcw, Search, Settings, Sun, Sunrise, Trash2, X, createElement, type IconNode,
  Pin, PinOff, Archive, ChevronsUp, ChevronUp, SlidersHorizontal, Sofa, CircleSlash, Clock, ChevronDown, Ellipsis, CornerDownRight, TriangleAlert, Bell, Repeat, StickyNote, Flag, Zap, Minimize2, GitMerge, ExternalLink, House, Shapes,
} from "lucide";

const ICONOS: Record<string, IconNode> = {
  "bar-chart-3": BarChart3, calendar: Calendar, "calendar-days": CalendarDays, "calendar-plus": CalendarPlus,
  "calendar-search": CalendarSearch, "calendar-x": CalendarX, check: Check, "chevron-left": ChevronLeft,
  "chevron-right": ChevronRight, "chevrons-right": ChevronsRight, "cloud-upload": CloudUpload, "file-text": FileText,
  "folder-open": FolderOpen, "graduation-cap": GraduationCap, "list-checks": ListChecks, "list-plus": ListPlus,
  milestone: Milestone, pencil: Pencil, plus: Plus, "refresh-cw": RefreshCw, "rotate-ccw": RotateCcw, search: Search,
  settings: Settings, sun: Sun, sunrise: Sunrise, "trash-2": Trash2, x: X,
  pin: Pin, "pin-off": PinOff, archive: Archive, "alert-triangle": TriangleAlert, bell: Bell, repeat: Repeat,
  "sticky-note": StickyNote, flag: Flag, zap: Zap, "minimize-2": Minimize2, "git-merge": GitMerge,
  "external-link": ExternalLink, "chevrons-up": ChevronsUp, "chevron-up": ChevronUp, "sliders-horizontal": SlidersHorizontal, sofa: Sofa, "circle-slash": CircleSlash, clock: Clock, "chevron-down": ChevronDown, ellipsis: Ellipsis, "corner-down-right": CornerDownRight,
  house: House, shapes: Shapes,
};

export function setIcon(el: HTMLElement, nombre: string) {
  el.empty();
  const icono = ICONOS[nombre];
  if (!icono) return;
  const svg = createElement(icono);
  svg.setAttribute("width", "16");
  svg.setAttribute("height", "16");
  svg.classList.add("svg-icon");
  el.appendChild(svg);
}

export type App = unknown;

// ---------------------------------------------------------------- menú contextual

interface ItemMenu {
  setTitle(t: string): ItemMenu;
  setIcon(i: string): ItemMenu;
  setChecked(v: boolean): ItemMenu;
  onClick(fn: () => unknown): ItemMenu;
}

export class Menu {
  private items: ({ titulo: string; icono?: string; marcado?: boolean; fn?: () => unknown } | null)[] = [];

  addItem(cb: (i: ItemMenu) => unknown): this {
    const it: { titulo: string; icono?: string; marcado?: boolean; fn?: () => unknown } = { titulo: "" };
    const api: ItemMenu = {
      setTitle: (t) => ((it.titulo = t), api),
      setIcon: (i) => ((it.icono = i), api),
      setChecked: (v) => ((it.marcado = v), api),
      onClick: (fn) => ((it.fn = fn), api),
    };
    cb(api);
    this.items.push(it);
    return this;
  }

  addSeparator(): this {
    this.items.push(null);
    return this;
  }

  showAtMouseEvent(e: MouseEvent) {
    Menu.cerrarAbierto?.();
    const menu = document.body.createDiv({ cls: "menu" });
    for (const it of this.items) {
      if (!it) {
        menu.createDiv({ cls: "menu-separator" });
        continue;
      }
      const fila = menu.createDiv({ cls: "menu-item" });
      const ic = fila.createSpan({ cls: "menu-item-icon" });
      if (it.marcado) setIcon(ic, "check");
      else if (it.icono) setIcon(ic, it.icono);
      fila.createSpan({ cls: "menu-item-title", text: it.titulo });
      fila.addEventListener("click", () => {
        cerrar();
        void it.fn?.();
      });
    }
    // Que no se salga de la ventana
    const { innerWidth: W, innerHeight: H } = window;
    const r = menu.getBoundingClientRect();
    menu.style.left = `${Math.min(e.clientX, W - r.width - 8)}px`;
    menu.style.top = `${Math.min(e.clientY, H - r.height - 8)}px`;
    const fuera = (ev: Event) => {
      if (!menu.contains(ev.target as Node)) cerrar();
    };
    const tecla = (ev: KeyboardEvent) => ev.key === "Escape" && cerrar();
    const cerrar = () => {
      menu.remove();
      document.removeEventListener("mousedown", fuera, true);
      document.removeEventListener("keydown", tecla, true);
      Menu.cerrarAbierto = null;
    };
    setTimeout(() => {
      document.addEventListener("mousedown", fuera, true);
      document.addEventListener("keydown", tecla, true);
    });
    Menu.cerrarAbierto = cerrar;
  }

  static cerrarAbierto: (() => void) | null = null;
}

// ---------------------------------------------------------------- modales

export class Modal {
  containerEl: HTMLElement;
  modalEl: HTMLElement;
  titleEl: HTMLElement;
  contentEl: HTMLElement;

  constructor(public app?: App) {
    this.containerEl = document.createElement("div");
    this.containerEl.className = "modal-container";
    this.containerEl.createDiv({ cls: "modal-bg" }).addEventListener("click", () => this.close());
    this.modalEl = this.containerEl.createDiv({ cls: "modal" });
    const cerrar = this.modalEl.createDiv({ cls: "modal-close-button", attr: { "aria-label": "Cerrar" } });
    setIcon(cerrar, "x");
    cerrar.addEventListener("click", () => this.close());
    this.titleEl = this.modalEl.createDiv({ cls: "modal-title" });
    this.contentEl = this.modalEl.createDiv({ cls: "modal-content" });
    this.containerEl.addEventListener("keydown", (e) => {
      if (e.key === "Escape") this.close();
    });
  }

  onOpen(): void {}
  onClose(): void {}

  open() {
    document.body.appendChild(this.containerEl);
    this.onOpen();
  }

  close() {
    if (!this.containerEl.isConnected) return;
    this.onClose();
    this.containerEl.remove();
  }
}

// ---------------------------------------------------------------- avisos

export class Notice {
  private el: HTMLElement;

  constructor(mensaje: string | DocumentFragment, duracion = 5000) {
    const zona = document.querySelector<HTMLElement>(".notice-container") ?? document.body.createDiv({ cls: "notice-container" });
    this.el = zona.createDiv({ cls: "notice" });
    if (typeof mensaje === "string") this.el.setText(mensaje);
    else this.el.appendChild(mensaje);
    this.el.addEventListener("click", () => this.hide());
    if (duracion > 0) setTimeout(() => this.hide(), duracion);
  }

  hide() {
    this.el.remove();
  }
}

export function debounce<T extends (...a: never[]) => unknown>(fn: T, ms: number): T {
  let t: ReturnType<typeof setTimeout> | undefined;
  return ((...a: Parameters<T>) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  }) as T;
}
