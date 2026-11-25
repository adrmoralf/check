---
version: 1
slug: "index-html"
primary_target: "index.html"
related_targets: ["src/main.ts","src/panel.css","src/app.css"]
---

## Scope

Toda la app de escritorio Check (Tauri): barra/raíl, pestañas Hoy, Entregas, Asignaturas, Calendario y Cuatrimestre, formularios, ajustes, avisos, modo compacto. Modo: Operate.

## Audience and task

Cualquier estudiante con varias asignaturas que abre Check muchas veces al día: ver qué toca hoy, qué está atrasado, qué entregas y exámenes se acercan, y apuntar una tarea en segundos. Constraints: tema claro y oscuro, color por asignatura elegido por el usuario, color principal y tamaño de texto configurables, ventana de 380 px (compacto) a pantalla completa, sin recursos descargados.

## Direction contract

THESIS: Check es el calendario oficial de tus tareas, publicado como los calendarios de exámenes del tablón de la facultad: filas fechadas en una tabla de filetes y un sello de caucho como estado. Rechaza la app de productividad oscura con tarjetas redondeadas y un acento verde azulado.

OWN-WORLD: raíl institucional azul marino (#1B2D5B) con texto claro; hoja de trabajo blanca fría (#F6F7F4 en claro, pizarra #10151F en oscuro); tinta casi negra; filetes de 1 px (#D9DEE7) y un filete fuerte de 2 px bajo la cabecera; esquinas de 2-4 px, sin sombras de tarjeta; sello rojo (#C42F2F) para atrasado/urgente y sello azul tinta (#2B4C9B) para HECHO; etiquetas de asignatura como recuadros de borde en su color. Una sola familia (UI del sistema), versalitas espaciadas para rótulos, cifras tabulares.

STORY: el estudiante abre Check y lee, como en el tablón, la hoja de hoy: atrasadas con sello rojo, lo de hoy y mañana con su plazo, y a la derecha las próximas entregas en una línea de tiempo con huecos proporcionales a los días. Marca una tarea y queda sellada HECHO (no desaparece); escribe una frase en la línea de añadir y aparece en su fila.

FIRST VIEWPORT: raíl izquierdo de 232 px (marca Check + curso, pestañas con contador, leyenda de asignaturas abajo); cabecera de documento con rótulo «CALENDARIO DE TAREAS · CUATRIMESTRE · SEMANA n DE m», fecha grande y clases del día a la derecha, filete de 2 px; línea de añadir a todo el ancho; columna principal con la tabla Fecha · Asig. · Tarea · Plazo; columna derecha de 360 px con la línea de tiempo de próximas entregas. Acción principal: la línea de añadir.

FORM: dirección 7 de mi lista ordenada (Tablón oficial). seed:f680d1766e354ef4. Signature move: el sello de estado (HECHO / ATRASADA / ANULADA) estampado con un golpe de 120 ms al marcar; raises: nada desaparece (billete), tiempo proporcional (danza), choques con trama cruzada (cuarto oscuro), una familia y filetes de 1 px (anuario).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
