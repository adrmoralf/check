// Tipos de los añadidos al DOM de shim/dom.ts (los mismos nombres que en Obsidian).
interface OpcionesEl {
  cls?: string | string[];
  text?: string;
  attr?: Record<string, string | number | boolean>;
  value?: string;
  type?: string;
}

interface Node {
  createEl<K extends keyof HTMLElementTagNameMap>(tag: K, o?: OpcionesEl | string): HTMLElementTagNameMap[K];
  createDiv(o?: OpcionesEl | string): HTMLDivElement;
  createSpan(o?: OpcionesEl | string): HTMLSpanElement;
}

interface HTMLElement {
  empty(): void;
  setText(t: string): void;
  addClass(...c: string[]): void;
  removeClass(...c: string[]): void;
  toggleClass(c: string, v: boolean): void;
  setAttr(k: string, v: string | number | boolean | null): void;
  toggle(v: boolean): void;
}

declare function createFragment(fn?: (f: DocumentFragment) => void): DocumentFragment;
