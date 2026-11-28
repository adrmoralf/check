---
name: Check
description: El calendario oficial de tus tareas, publicado como el tablón de exámenes de la facultad.
colors:
  rail-marino: "#1b2d5b"
  rail-marino-hover: "#24396f"
  texto-sobre-acento: "#ffffff"
  azul-enlace: "#2b4c9b"
  sello-rojo: "#b3261e"
  sello-azul: "#2b4c9b"
  ambar: "#8f5600"
  papel: "#f6f7f4"
  blanco: "#ffffff"
  tinta: "#17191c"
  tinta-2: "#4a5160"
  tinta-3: "#646b7a"
  filete: "#d9dee7"
  borde-campo: "#a9b0bd"
  papel-oscuro: "#0f141d"
  blanco-oscuro: "#161d29"
  tinta-oscuro: "#e7eaf0"
  tinta-2-oscuro: "#aab2c1"
  tinta-3-oscuro: "#8b94a5"
  filete-oscuro: "#273142"
  borde-campo-oscuro: "#3d4a60"
  acento-oscuro: "#3a57a8"
  azul-enlace-oscuro: "#8ea9f5"
  sello-rojo-oscuro: "#ff7b72"
  ambar-oscuro: "#f0b44c"
  asig-rojo: "#c0392b"
  asig-naranja: "#b45309"
  asig-amarillo: "#8a6a00"
  asig-verde: "#1f7a45"
  asig-cian: "#0b7285"
  asig-azul: "#2b5bc4"
  asig-morado: "#6d3fb5"
  asig-rosa: "#a8336d"
typography:
  display:
    fontFamily: "Public Sans, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "2.15em"
    fontWeight: 750
    lineHeight: 1.08
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Public Sans, system-ui, sans-serif"
    fontSize: "1.35em"
    fontWeight: 750
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Public Sans, system-ui, sans-serif"
    fontSize: "1.2em"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.01em"
  cifra:
    fontFamily: "Public Sans, system-ui, sans-serif"
    fontSize: "1.6em"
    fontWeight: 800
    lineHeight: 1
    fontFeature: "\"tnum\""
  body:
    fontFamily: "Public Sans, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.4
  body-fila:
    fontFamily: "Public Sans, system-ui, sans-serif"
    fontSize: "1em"
    fontWeight: 520
    lineHeight: 1.35
  fecha:
    fontFamily: "Public Sans, system-ui, sans-serif"
    fontSize: "0.9em"
    fontWeight: 650
    fontFeature: "\"tnum\""
  label:
    fontFamily: "Public Sans, system-ui, sans-serif"
    fontSize: "0.75em"
    fontWeight: 800
    letterSpacing: "0.12em"
  sello:
    fontFamily: "Public Sans, system-ui, sans-serif"
    fontSize: "0.7em"
    fontWeight: 850
    lineHeight: 1.3
    letterSpacing: "0.14em"
  etiqueta:
    fontFamily: "Public Sans, system-ui, sans-serif"
    fontSize: "0.74em"
    fontWeight: 750
    lineHeight: 1.35
    letterSpacing: "0.04em"
  nombre:
    fontFamily: "Public Sans, system-ui, sans-serif"
    fontSize: "1.25em"
    fontWeight: 650
    lineHeight: "40px"
    letterSpacing: "0"
  mono:
    fontFamily: "Cascadia Mono, Ubuntu Mono, Consolas, monospace"
    fontSize: "0.82em"
rounded:
  radio: "2px"
  sello: "3px"
spacing:
  fila-y: "8px"
  fila-x: "6px"
  columna: "12px"
  bloque: "14px"
  seccion: "18px"
  rail-x: "20px"
  hoja-arriba: "26px"
  hoja-x: "40px"
  hoja-x-estrecha: "18px"
components:
  boton:
    backgroundColor: "{colors.blanco}"
    textColor: "{colors.tinta}"
    typography: "{typography.body}"
    rounded: "{rounded.radio}"
    padding: "0 14px"
    height: "34px"
  boton-cta:
    backgroundColor: "{colors.rail-marino}"
    textColor: "{colors.texto-sobre-acento}"
    rounded: "{rounded.radio}"
    padding: "0 14px"
    height: "34px"
  boton-cta-hover:
    backgroundColor: "{colors.rail-marino-hover}"
  boton-secundario:
    backgroundColor: "transparent"
    textColor: "{colors.tinta}"
    rounded: "{rounded.radio}"
    padding: "0 14px"
    height: "44px"
  campo:
    backgroundColor: "{colors.blanco}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.radio}"
    padding: "0 10px"
    height: "36px"
  linea-anadir:
    backgroundColor: "{colors.blanco}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.radio}"
    padding: "0 12px"
    height: "44px"
  rail:
    backgroundColor: "{colors.rail-marino}"
    textColor: "{colors.texto-sobre-acento}"
    width: "232px"
  rail-pestana:
    backgroundColor: "transparent"
    padding: "10px 20px"
    rounded: "0"
  fila:
    backgroundColor: "transparent"
    textColor: "{colors.tinta}"
    typography: "{typography.body-fila}"
    padding: "8px 6px"
    height: "48px"
  etiqueta-asig:
    typography: "{typography.etiqueta}"
    rounded: "{rounded.radio}"
    padding: "1px 6px"
  sello-hecho:
    textColor: "{colors.sello-azul}"
    typography: "{typography.sello}"
    rounded: "{rounded.sello}"
    padding: "2px 7px 1px"
  sello-atrasada:
    textColor: "{colors.sello-rojo}"
    typography: "{typography.sello}"
    rounded: "{rounded.sello}"
    padding: "2px 7px 1px"
  tipo:
    backgroundColor: "transparent"
    textColor: "{colors.tinta-2}"
    rounded: "{rounded.radio}"
    padding: "1px 7px"
  tipo-examen:
    backgroundColor: "transparent"
    textColor: "{colors.tinta}"
    rounded: "{rounded.radio}"
    padding: "1px 7px"
  modal:
    backgroundColor: "{colors.papel}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.sello}"
    width: "580px"
  rapida:
    backgroundColor: "{colors.papel}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.sello}"
    padding: "16px 20px 14px"
    width: "620px"
  rapida-nombre:
    backgroundColor: "transparent"
    textColor: "{colors.tinta}"
    typography: "{typography.nombre}"
    rounded: "0"
    padding: "0"
    height: "40px"
  rapida-chip:
    backgroundColor: "transparent"
    textColor: "{colors.tinta-2}"
    rounded: "{rounded.radio}"
    padding: "0 10px"
    height: "30px"
  rapida-pop:
    backgroundColor: "{colors.blanco}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.radio}"
    padding: "6px"
    width: "284px"
---

# Design System: Check

## Overview

**Creative North Star: "Tablón oficial"**

Check se lee como el calendario de exámenes clavado en el tablón de la facultad: un raíl institucional azul marino a la izquierda y, a la derecha, una hoja de papel frío con una tabla de filetes donde cada tarea es una fila fechada. El estado no se pinta con fondos ni insignias de colores: se estampa. HECHO, ATRASADA y ANULADA son sellos de caucho girados −4°, y una tarea hecha no desaparece, queda sellada en su fila.

La densidad es la de un documento administrativo bien compuesto: filas de 48 px, una sola familia tipográfica (Public Sans variable, incluida en la app), rótulos en versalitas espaciadas, cifras tabulares en todas las fechas y plazos, esquinas casi rectas y ninguna sombra en reposo. La calma viene de la regularidad de la tabla; la urgencia, de un rojo de sello que solo aparece cuando algo está atrasado o es inminente.

El sistema es configurable por diseño: el usuario elige el color principal (que tiñe el raíl y la acción principal), el tamaño de texto (12–20 px, todo escala en `em`) y el color de cada asignatura. Por eso ningún componente depende de un tono concreto del acento ni del color de una asignatura para ser legible. Rechaza explícitamente la app de productividad oscura con tarjetas redondeadas y acento verde azulado.

**Key Characteristics:**
- Raíl institucional de 232 px en el color principal, con texto claro.
- Hoja de papel con tabla de filetes de 1 px y un filete fuerte de 2 px en tinta bajo la cabecera del documento.
- Sellos de caucho como único lenguaje de estado, con un golpe de 120 ms al marcar.
- Una familia, versalitas espaciadas para rótulos y cifras tabulares.
- Esquinas de 2–3 px, plano en reposo; la sombra solo para lo que flota (menús, ventanas, avisos).
- Tiempo proporcional: líneas de tiempo y ejes con huecos que miden días reales.

## Colors

Tinta casi negra sobre papel frío, un azul marino institucional y dos tintas de sello (rojo y azul); el resto del color lo ponen las asignaturas, elegidas por el usuario.

### Primary
- **Azul marino institucional** (`rail-marino`): el color principal. Es el fondo del raíl, el botón de acción principal, la casilla del día de hoy en el calendario y el `accent-color` de las casillas nativas. El usuario puede sustituirlo en los ajustes; el hover se deriva mezclándolo un 18 % hacia negro (claro) o blanco (oscuro) y el texto encima pasa a casi negro si el acento es muy luminoso. En oscuro el raíl no es el acento puro sino el acento al 38 % sobre casi negro, para que no deslumbre.
- **Texto del raíl** (derivado, sin valor propio): en claro es el texto sobre acento (`--rail-texto: var(--text-on-accent)`), así que sigue al acento del usuario; en oscuro es un gris azulado claro fijo. El texto atenuado del raíl es `color-mix(in srgb, var(--rail-texto) 78%, var(--rail))` (74 % en oscuro) y todos los lavados y bordes del raíl son `color-mix(in srgb, var(--rail-texto) N%, transparent)` (6 % hover, 13–14 % activo, 14 % filete del pie, 45 % borde de la asignatura activa). Nada del raíl usa blanco ni negro literales.
- **Azul de enlace** (`azul-enlace`): anillos de foco, enlaces, borde de casilla en hover y zona de soltar al arrastrar. Sigue al acento del usuario.

### Secondary
- **Rojo de sello** (`sello-rojo`): sello ATRASADA, fecha de fila atrasada, prioridad alta y máxima, cifra de días cuando una entrega es inminente, y el marcador de «hoy» en la línea del cuatrimestre y en el calendario del selector de fecha. En la ventana de añadir tiñe la opción de fecha cuando la fecha ya pasó y la de prioridad Máxima. Es la única señal de alarma del sistema.
- **Azul tinta de sello** (`sello-azul`): sello HECHO y casilla marcada. En la ventana de añadir, lo que el analizador de la frase reconoce dentro del nombre (sobre un lavado del 15 % de sí mismo), la opción de fecha con valor y la de prioridad Media.

### Tertiary
- **Ámbar de aviso** (`ambar`): plazo próximo (pronto, sin estar atrasado), sello ámbar, los periodos de exámenes en la línea del cuatrimestre y la opción de prioridad Alta en la ventana de añadir.

### Neutral
- **Papel frío** (`papel`; `papel-oscuro` en oscuro, una pizarra azulada): fondo de la hoja y de las ventanas.
- **Blanco de campo** (`blanco`; `blanco-oscuro`): campos, botones, celdas del calendario, cajas de notas. Lo que se rellena o se pulsa va sobre blanco; lo que se lee, sobre papel.
- **Tinta** (`tinta`): texto principal, el filete fuerte de 2 px, el borde de la línea de añadir, de las ventanas, del selector de fecha flotante y de la etiqueta EXAMEN.
- **Tinta segunda** (`tinta-2`): metadatos, rótulos de columna, ayudas.
- **Tinta tercera** (`tinta-3`): tareas hechas o anuladas, plazos vacíos, placeholders.
- **Filete** (`filete`): las líneas de 1 px entre filas y celdas.
- **Borde de campo** (`borde-campo`): contorno de botones y campos en reposo.

### Colores de asignatura
Ocho preajustes (`asig-rojo` … `asig-rosa`) que el usuario puede elegir o sustituir por cualquier color; en oscuro cada uno tiene su versión aclarada. En la interfaz siempre llegan como `--tarea-color` y solo se usan como borde, texto de la etiqueta, relleno de la barra de avance, marcas del eje y un lavado del 7–15 % mezclado con transparente. Nunca como fondo sólido bajo texto.

### Named Rules
**La Regla del Sello Rojo.** El rojo significa «atrasado o inminente» y nada más. No se usa para decorar, para destacar una sección ni para errores genéricos de interfaz que no sean del archivo.

**La Regla del Color Ajeno.** El acento y los colores de asignatura los elige el usuario. Ningún texto se apoya en ellos para su contraste salvo el texto sobre el acento, que se calcula por luminancia.

## Typography

**Display Font:** Public Sans (con system-ui, -apple-system, Segoe UI)
**Body Font:** Public Sans
**Label/Mono Font:** Cascadia Mono / Ubuntu Mono / Consolas, solo para rutas de archivo.

**Character:** Una sola sans de raíz institucional (la de la administración federal estadounidense), autoalojada como fuente variable 100–900 para poder usar pesos intermedios (520, 650, 750, 850). La jerarquía sale del peso y de las versalitas, no de mezclar familias.

### Hierarchy
- **Display** (750, 2.15em, 1.08): título del documento de cada pestaña, la fecha grande de Hoy. Baja a 1.7em en hoja estrecha. `text-wrap: balance`.
- **Headline** (750, 1.35em): título de las ventanas, sobre su filete de 2 px.
- **Title** (800, 1.2em, 1.1): nombre «Check» en el raíl.
- **Cifra** (800, 1.6em, 1, tabular): días que faltan en la línea de tiempo y el registro de entregas (1.5em ahí).
- **Body** (400, 15 px por defecto, 1.4): base de toda la interfaz; el usuario la ajusta entre 12 y 20 px. Ayudas y textos largos limitados a 62–70ch.
- **Body de fila** (520, 1em, 1.35): la descripción de una tarea en la tabla.
- **Nombre** (650, 1.25em, línea de 40 px): el nombre de la tarea en la ventana de añadir.
- **Fecha** (650, 0.9em, tabular): columna de fecha, plazos, números de día del calendario.
- **Label** (800, 0.72–0.75em, +0.12em, MAYÚSCULAS): cabeceras de columna, títulos de sección, rótulos de grupo y de semana, rótulo «Asignaturas» del raíl.
- **Sello** (850, 0.7em, +0.14em, MAYÚSCULAS): HECHO, ATRASADA, ANULADA.
- **Etiqueta** (750, 0.74em, +0.04em): la sigla de asignatura.

### Named Rules
**La Regla de la Cifra Tabular.** Toda fecha, hora, contador y plazo lleva cifras tabulares, para que las columnas del tablón se alineen.

**La Regla de la Versalita.** Las versalitas espaciadas rotulan estructura real (una columna, una sección, un grupo de filas). Nunca van como antetítulo decorativo encima de un título.

## Layout

Dos piezas: el raíl fijo a la izquierda (232 px) y la hoja, centrada con un máximo de 1320 px y márgenes de 40 px (26 px arriba). La hoja empieza siempre igual: cabecera de documento (título a la izquierda, datos del documento alineados a la derecha, filete de 2 px debajo), la línea de añadir a todo el ancho con la búsqueda de 210 px a su lado, y el contenido con scroll propio.

El contenido es tabular. La tabla de tareas usa la rejilla `casilla 26 · fecha 70 · asignatura 68 · tarea 1fr · plazo 132` con 12 px entre columnas, filas de 48 px mínimo y 8 × 6 px de relleno. Los grupos se separan con un rótulo en versalitas y 18 px de aire encima, no con cajas. En ventana ancha, Hoy y Calendario añaden una columna derecha (300 y 320 px) separada por un filete vertical.

El tiempo se dibuja proporcional: en la línea de tiempo de Hoy y la línea del cuatrimestre, los huecos entre hitos miden los días que pasan. En Inicio el tiempo va por semanas: la tira de semanas y el registro agrupado con las mismas semanas.

Responsive en tres escalones:
- **Hoja estrecha** (< 760 px de hoja, por clase en el contenedor): márgenes de 18 px, la cabecera se apila, desaparecen la columna de fecha y las cabeceras de tabla. La fila pasa a `casilla 24 · asignatura 50 · tarea 1fr · plazo auto` con 10 px de hueco: la pista de la asignatura se reserva aunque la fila no tenga etiqueta. El registro de Inicio pasa a `casilla 20 · días 46 · fecha auto · tipo auto · 1fr` con la descripción en su propia línea y la hora bajo la fecha. El calendario reduce las marcas a puntos de 8 px.
- **Ventana < 900 px:** el raíl se queda en iconos (64 px) con el contador como pastilla en la esquina.

## Elevation & Depth

Plano por defecto. La profundidad la dan el contraste papel/blanco y los filetes; ninguna tarjeta, fila ni panel lleva sombra en reposo. La sombra existe solo para lo que flota sobre la hoja: menú contextual, ventanas y avisos.

### Shadow Vocabulary
- **Flotante** (`box-shadow: 0 18px 40px -14px rgba(16, 26, 48, 0.42)`; en oscuro `0 18px 44px -12px rgba(0, 0, 0, 0.7)`): menús, ventanas, el selector de fecha y avisos. Siempre junto a un borde de 1 px en tinta.

### Named Rules
**La Regla del Papel Plano.** Si no flota sobre la hoja, no lleva sombra. Los estados de reposo, hover y selección se resuelven con lavados (`resalte`, 4,5 % de tinta), bordes y contornos.

## Shapes

Esquinas casi rectas: 2 px para todo lo que es un control o un recuadro (`radio`), 3 px para lo que se estampa o se superpone (sellos, ventanas, la tecla del atajo). Las pestañas del raíl y los dos campos sin caja de la ventana de añadir (nombre y descripción) son rectos (0); el resaltado de lo reconocido en el nombre lleva 2 px. Los marcadores de la línea de tiempo son cuadrados de 12–13 px con borde de 2 px en el color de la asignatura; un examen es ese cuadrado girado 45° y relleno. La trama a −45° (líneas de 1 px) marca solo periodos, nunca tareas sueltas: en franja (`--trama`, cada 6 px) los periodos de exámenes en el eje de Inicio y, más suave (10 % de tinta cada 7 px), los días no lectivos del calendario. Dos entregas el mismo día no llevan ninguna marca: comparten fecha, y en el registro la celda de fecha lo dice en su `title` («Más de una entrega o examen ese día»).

## Components

### Buttons
Sobrios y de papelería: rectos, con borde, peso 600.
- **Shape:** esquinas de 2 px; 34 px de alto, 0 × 14 px de relleno, texto a 0.9em.
- **Por defecto:** fondo blanco, borde `borde-campo`, texto en tinta. Hover: mezcla del 6 % de tinta sobre blanco.
- **Acción principal (`mod-cta`):** fondo y borde en el color principal, texto sobre acento. Hover al tono hover derivado.
- **Secundario:** 44 px, transparente con borde de tinta e icono + texto; en hoja estrecha queda solo el icono.
- **Icono:** 32 × 32, transparente y sin borde; en hover aparece el filete.
- **Enlace:** sin caja, texto en azul de enlace subrayado a 3 px.
- **Deshabilitado:** opacidad 0.45.

### Inputs / Fields
- **Style:** 36 px, fondo blanco, borde de 1 px `borde-campo`, esquinas de 2 px, 0.95em.
- **Focus:** contorno de 2 px en azul de enlace con 1 px de separación; el borde se vuelve transparente.
- **Error:** recuadro de 1 px en rojo de sello con texto rojo (errores de lectura del archivo).
- **Fila de etiqueta:** etiqueta (0.86em, 650, tinta segunda) + control en rejilla; 104 px de etiqueta por defecto, 210 px en los ajustes.

### Línea de añadir
La acción principal de la app, y mínima a propósito. Una barra de 44 px a todo el ancho, fondo blanco, borde de 1.5 px en tinta, icono «+» a la izquierda y el placeholder «Nueva tarea». A la derecha, dentro de la misma barra: la tecla con el atajo global (un `kbd` sobre papel, borde de filete con el inferior de 2 px, esquinas de 3 px, 0.76em/650 en tinta segunda), que se oculta en cuanto se escribe y en hoja estrecha; y un botón de icono de 32 × 32 (deslizadores, tinta tercera, sin borde, lavado `resalte` en hover) que abre la ventana de añadir. No hay un segundo botón fuera de la barra. Al enfocarse gana un contorno de 3 px del azul de enlace al 35 %. Debajo, lo entendido de la frase aparece como una sola línea de texto tranquilo (0.84em, tinta segunda, sin cortes, con puntos suspensivos): la descripción en 650 y tinta, y detrás, separadas por « · », asignatura, fecha, hora, prioridad y repetición («Memoria · RIS · mié 25 nov · 23:59 · alta»). Sin recuadros y sin texto de ayuda.

### Ventana de añadir
Crear y editar una tarea es un menú de añadido rápido, no un formulario de filas: se escribe una frase y lo demás son opciones pulsables.
- **Marco:** la ventana estándar a 620 px (`rapida`), con 16 × 20 px de relleno y 6 px entre piezas. No muestra título (queda solo como nombre accesible: «Nueva tarea», «Nueva subtarea» o «Editar tarea»); la ✕ de cerrar va arriba a la derecha.
- **Nombre:** un campo sin caja ni contorno de foco, 40 px de alto en Nombre (1.25em/650), que deja 34 px libres para la ✕. El texto lo dibuja una capa superpuesta: lo que el analizador de la frase reconoce (asignatura, fecha, hora, prioridad, repetición) se marca con `mark` en azul de sello sobre un lavado del 15 % de azul de sello, sin relleno y con esquinas de 2 px; el resto va en tinta. El placeholder en tinta tercera. Enter guarda.
- **Descripción:** debajo, un área sin caja que crece con el texto (26 px de partida, 0.92em, línea 1.45, tinta segunda); se guarda como notas de la tarea. Ctrl+Enter guarda.
- **Opciones (`rapida-chip`):** una fila que puede partirse, con 6 px de hueco: Fecha, Prioridad, Tipo, «Subtarea de…» y un botón solo de icono «…» de 30 × 30 (estos dos últimos, solo al crear). Cada opción mide 30 px, con 0 × 10 px de relleno, borde de 1 px en `filete`, esquinas de 2 px, fondo transparente e icono de 14 px + texto en 0.84em/600 tinta segunda; en hover, borde `borde-campo`, lavado `resalte` y texto en tinta. Con valor (`con-valor`) toma `--chip-color` para el texto, su mezcla al 45 % con el filete para el borde y un lavado del 7 %, y muestra una ✕ pequeña para quitarlo. Fecha: azul de sello, o rojo de sello si ya pasó. Prioridad: Máxima y Alta en rojo de sello (como en las filas), Media en azul de sello. Tipo (Examen, Entrega, Práctica): en tinta. El texto de la opción se corta con puntos suspensivos a 220 px.
- **Selector de fecha (`rapida-pop`):** flota fijo 6 px bajo la opción de fecha, o encima si no cabe, o pegado al borde de la ventana con scroll propio. 284 px, 6 px de relleno, fondo blanco, borde de 1 px en tinta, esquinas de 2 px, sombra flotante, 0.9em; entra como las ventanas, en 140 ms. Arriba, atajos de 32 px (Hoy, Mañana, Este fin de semana, Próxima semana, Sin fecha) con icono de 15 px en tinta segunda y la fecha a la derecha en 0.86em, tinta tercera y cifras tabulares. Después, un calendario de mes: cabecera en 750 con flechas de 28 px, iniciales de la semana en 0.72em/800 tinta tercera, días de 30 px en 550 tabular; los de otro mes en tinta tercera, los pasados además al 60 %, hoy en rojo de sello a 800 y el elegido relleno del color principal con texto sobre acento. Al pie, Hora y Repetir como filas de icono · rótulo de 64 px · control de 30 px. Los tres bloques se separan con filetes de 1 px.
- **Prioridad, tipo, asignatura y «Subtarea de…»** se eligen con el menú contextual de la app.
- **Pie (`rapida-pie`):** sobre un filete fino a todo el ancho de la ventana. A la izquierda, el selector de asignatura: un botón sin borde de 32 px (0.86em, tinta segunda, lavado `resalte` en hover) con un cuadrado de 10 px en el color de la asignatura, «SIGLA · Nombre» con puntos suspensivos y un chevron de 14 px en tinta tercera. A la derecha, «Cancelar» y el botón principal «Añadir tarea» («Guardar» al editar), con 8 px de hueco.

### Tabla oficial (fila)
- Filas de 48 px, separadas solo por el filete de 1 px; la cabecera de columnas en versalitas sobre un filete de tinta.
- **Hover:** lavado `resalte`. **Foco:** contorno de 2 px hacia dentro.
- **Casilla:** 20 × 20, borde de 1.5 px en tinta sobre blanco; marcada, se rellena de azul de sello y se encoge a 0.88 durante 90 ms.
- **Hecha / anulada:** la descripción pasa a tinta tercera (anulada, además, tachada); la fila se queda.
- **Subtarea:** sangría de 20 px con un codo de 9 px en tinta tercera.
- **Metadatos:** línea de 0.8em en tinta segunda con iconos de 13 px; prioridad alta en rojo de sello.

### Sello de caucho (firma)
Recuadro con borde de 2 px en `currentColor`, esquinas de 3 px, texto Sello en mayúsculas, girado −4° y al 92 % de opacidad. Variantes: azul (HECHO), rojo (ATRASADA), gris (ANULADA), ámbar. Al marcar una tarea, el sello cae con el golpe: 120 ms con `cubic-bezier(0.16, 1, 0.3, 1)`, desde −11° y escala 1.7 con 1.5 px de desenfoque hasta su posición. Ocupa la columna de plazo en lugar del plazo.

### Etiqueta de asignatura
La sigla de la asignatura en un recuadro de borde de 1.5 px en su color, texto en ese mismo color sobre un lavado del 7 %. En el calendario, las marcas son tiras con lavado del 15 % y texto en tinta; las importantes añaden un borde interior de 1 px en el color.

### Registro de entregas
La tabla de la pestaña Inicio, la principal: `casilla 20 · días 74 · fecha 140 · tipo 118 · asignatura 68 · descripción 1fr`, filas de 48 px, cada una cerrada por su propio filete de 1 px. Las entregas, prácticas e importantes llevan la casilla de las filas para marcarlas hechas (se marca al instante, con la descripción tachada en tinta tercera, y la fila sale al repintarse); los exámenes dejan la celda vacía, porque no se hacen: pasan. El tipo es EXAMEN, ENTREGA, PRÁCTICA o IMPORTANTE: el puesto a mano (`+examen`…) o, si no, el deducido del texto. La cifra de días va en Cifra (1.5em/800), en rojo de sello si es inminente o está atrasada. La fecha no se parte nunca; si ese día cae más de una entrega o examen, la celda de fecha solo lo indica en su `title`; la hora es una pieza aparte, en tinta segunda (600): en línea como «· 23:59» en hoja ancha y en su propia línea en hoja estrecha. Las filas van agrupadas por semanas («Atrasadas» en rojo arriba, «Esta semana», «La semana que viene», «Semana del lun 14 dic», con «· exámenes» si cae en el periodo de exámenes): rótulo en 0.78em/800 versalitas con filete de 1 px en tinta. Los AVANCES pesan menos: cifra a 1.2em/700 y descripción a 450 en tinta segunda. Las subtareas van debajo de su tarea, sangradas 40 px con un lomo de 1 px (`borde-campo`): casilla de 16 px, texto en 0.9em y, si tienen fecha, «jue 10» a la derecha (roja si se pasó); la tarea muestra «hechas/total» en un recuadro junto a la descripción. Una subtarea cuya tarea principal no sale en Inicio dice debajo de qué tarea es (icono ↳ en tinta segunda).

### Etiqueta de tipo
Recuadro de 2 px de esquina, 1 × 7 px de relleno, 0.7em/750 con +0.1em. ENTREGA va con borde de 1 px y texto en tinta segunda; EXAMEN sube a borde de 1.5 px y texto en tinta, sin relleno; AVANCE baja a borde discontinuo en tinta tercera (650). La diferencia es de peso de línea, no de bloque sólido.

### Navigation (raíl)
- Fondo en el color principal y texto del raíl derivado de él (ver Colors); marca «Check» con un logo en recuadro de 1.5 px y el nombre del archivo debajo.
- **Pestañas:** filas rectas de icono 18 px + texto + contador, 10 × 20 px de relleno, 0.95em/500 en texto atenuado del raíl. Hover: lavado del 6 % del texto del raíl. Activa: lavado del 13 % y peso 700.
- **Contador:** recuadro de 2 px con borde atenuado y cifras tabulares; el contador de atrasadas se rellena de rojo.
- **Leyenda de asignaturas:** filas de 30 px con un cuadrado de color de 10 px, nombre y número; la activa lleva borde del 45 %.
- **Pie:** estado de sincronización (dos líneas como máximo) y botones de icono de 32 × 34. Si hay una versión nueva, encima aparece «Actualizar a X»: fila a todo el ancho con icono de descarga de 15 px, 0.8em/600, lavado del 10 % (18 % en hover) y borde del 45 % del texto del raíl, como la asignatura activa.

### Ventanas, menús y avisos
- **Ventana:** hasta 580 px (620 px la ventana de añadir, que no muestra título; 680 px los ajustes), fondo papel, borde de 1 px en tinta, esquinas de 3 px, sombra flotante; entra subiendo 8 px en 160 ms. Título Headline sobre un filete de 2 px en tinta; botones alineados a la derecha sobre un filete fino.
- **Ventana de actualización:** novedades en un recuadro blanco con filete (máx. 260 px de alto, con scroll) y barra de progreso de 6 px en el color principal sobre filete; no se puede cerrar mientras instala.
- **Menú contextual:** mínimo 220 px, fondo blanco, borde de tinta, elementos de 7 × 10 px con icono de 15 px.
- **Aviso:** abajo a la derecha, invertido (fondo tinta, texto papel), máximo 420 px, con botón Deshacer de borde en `currentColor`.

### Tira de semanas (Inicio)
Recuadro blanco con borde de 1 px en tinta y una columna por semana (mínimo 58 px; si no caben, se desplaza en horizontal), de esta semana al fin de exámenes, separadas por filetes. Cabecera: día del lunes (750) y mes en versalitas; la semana actual, sobre el color principal. Debajo, una marca de 22 px por cada cosa de la semana, con el tipo abreviado (Ex, En, Pr, Av) y la asignatura: borde de 1.5 px en el color de la asignatura y lavado del 9 %; el examen, relleno en su color con texto blanco; el avance, borde discontinuo de 1 px sin fondo. Las semanas de exámenes llevan una trama fina del 7 %. Pulsar la cabecera baja a esa semana en el registro; pulsar una marca abre la tarea. Leyenda debajo en 0.75em (se oculta en hoja estrecha).

### Línea de tiempo
Un eje vertical de 2 px en tinta. Cada hito lleva una muesca horizontal de 10 px, la cifra de días alineada a la derecha en 54 px y, al lado, la tarea y su pie. En la línea del cuatrimestre los marcadores son cuadrados en el color de la asignatura (rellenos si es importante, punteados si es no lectivo, rojos si es hoy).

## Do's and Don'ts

### Do:
- **Do** marcar el estado con un sello (HECHO, ATRASADA, ANULADA) en la columna de plazo y dejar la fila en su sitio.
- **Do** separar filas y grupos con filetes de 1 px (`filete`) y rótulos en versalitas; reservar el filete de 2 px en tinta para cerrar la cabecera de un documento o de una ventana.
- **Do** poner cifras tabulares en toda fecha, hora, contador y plazo.
- **Do** expresar los tamaños en `em` para que el tamaño de texto del usuario (12–20 px) escale toda la interfaz.
- **Do** pasar el color de asignatura como `--tarea-color` y usarlo solo en bordes, texto de etiqueta, marcas y lavados del 7–15 %.
- **Do** dibujar el tiempo proporcional a los días, con el intervalo rotulado.
- **Do** derivar el texto, los atenuados y los lavados del raíl de `--rail-texto` con `color-mix`, para que sigan al color principal del usuario.
- **Do** mantener las esquinas en 2 px (3 px para sellos y ventanas).

### Don't:
- **Don't** usar tarjetas redondeadas con sombra, ni un acento verde azulado sobre fondo oscuro: es la app de productividad que este sistema rechaza.
- **Don't** poner sombra a nada que no flote sobre la hoja.
- **Don't** usar el rojo de sello para algo que no esté atrasado o sea inminente.
- **Don't** hacer desaparecer una tarea al marcarla; se sella.
- **Don't** apoyar el contraste de un texto en el color de una asignatura o en el acento elegido por el usuario.
- **Don't** añadir una segunda familia tipográfica ni descargar fuentes en tiempo de ejecución; la monoespaciada del sistema solo para rutas de archivo.
- **Don't** poner las versalitas como antetítulo decorativo sobre un título.
- **Don't** marcar con tramas ni símbolos que dos entregas caen el mismo día: basta con que compartan fecha. La trama queda para periodos (exámenes, días no lectivos).
- **Don't** llenar la línea de añadir ni la ventana de añadir de textos de ayuda ni atajos visibles: lo entendido se dice en una línea de texto (línea) o resaltado dentro del propio nombre (ventana), y hay un único botón principal.
- **Don't** usar bloques sólidos de tinta para distinguir tipos o categorías; se distinguen por el grosor del borde.
