// Los añadidos al DOM que Obsidian pone en HTMLElement (createDiv, setText…), para reutilizar
// la interfaz del Panel de tareas tal cual.

type Opciones = { cls?: string | string[]; text?: string; attr?: Record<string, string | number | boolean>; value?: string; type?: string };

function aplicar<T extends HTMLElement>(el: T, o?: Opciones | string): T {
  if (typeof o === "string") {
    el.className = o;
    return el;
  }
  if (!o) return el;
  if (o.cls) el.className = Array.isArray(o.cls) ? o.cls.join(" ") : o.cls;
  if (o.text !== undefined) el.textContent = o.text;
  if (o.attr) for (const [k, v] of Object.entries(o.attr)) el.setAttribute(k, String(v));
  if (o.value !== undefined) (el as unknown as HTMLInputElement).value = o.value;
  if (o.type) el.setAttribute("type", o.type);
  return el;
}

export function instalarDom() {
  const P = HTMLElement.prototype as unknown as Record<string, unknown>;
  const F = DocumentFragment.prototype as unknown as Record<string, unknown>;
  function createEl(this: Node, tag: string, o?: Opciones | string) {
    return this.appendChild(aplicar(document.createElement(tag), o));
  }
  for (const proto of [P, F]) {
    proto.createEl = createEl;
    proto.createDiv = function (this: Node, o?: Opciones | string) { return createEl.call(this, "div", o); };
    proto.createSpan = function (this: Node, o?: Opciones | string) { return createEl.call(this, "span", o); };
  }
  P.empty = function (this: HTMLElement) { this.replaceChildren(); };
  P.setText = function (this: HTMLElement, t: string) { this.textContent = t; };
  P.addClass = function (this: HTMLElement, ...c: string[]) { this.classList.add(...c); };
  P.removeClass = function (this: HTMLElement, ...c: string[]) { this.classList.remove(...c); };
  P.toggleClass = function (this: HTMLElement, c: string, v: boolean) { this.classList.toggle(c, v); };
  P.setAttr = function (this: HTMLElement, k: string, v: string | number | boolean | null) {
    if (v === null) this.removeAttribute(k);
    else this.setAttribute(k, String(v));
  };
  P.toggle = function (this: HTMLElement, v: boolean) { this.style.display = v ? "" : "none"; };
  (globalThis as unknown as Record<string, unknown>).createFragment = (fn?: (f: DocumentFragment) => void) => {
    const f = document.createDocumentFragment();
    fn?.(f);
    return f;
  };
}
