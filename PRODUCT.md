# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Estudiantes (de cualquier titulación, no solo un máster concreto) que llevan varias asignaturas a la vez y trabajan en más de un ordenador (Windows y Ubuntu). Abren Check varias veces al día, a menudo con prisa, para saber qué toca hoy y qué viene, y para apuntar una tarea en segundos sin perder el hilo de lo que estaban haciendo. En época de entregas y exámenes la usan para no llegar tarde a nada.

## Product Purpose

Check es una lista de tareas de escritorio para estudiantes en la que todo vive en un único archivo Markdown, normalmente dentro de Google Drive. Sirve para ver de un vistazo lo de hoy, lo atrasado y las entregas y exámenes que se acercan, y para capturar tareas al vuelo. Tiene éxito cuando el estudiante no se olvida de ninguna entrega y confía en la app lo bastante como para no tener otra lista paralela.

## Positioning

Los datos no están en un servidor ni en una base de datos: son un `.md` legible que el propio estudiante posee, sincroniza con su Drive y puede editar a mano, desde Obsidian o con una IA. La app entiende el curso (asignaturas, cuatrimestres, días no lectivos y horario de clases) y lo usa para organizar las tareas.

## Operating Context

- Ventana de escritorio (Tauri) de 1180×800 por defecto, que se puede estrechar hasta unos 360 px; vive en la bandeja del sistema.
- Uso breve y frecuente: abrir, mirar, marcar, apuntar y cerrar. Atajo global para añadir desde cualquier programa.
- El archivo se edita también fuera de la app (Drive, Obsidian, IA); la app recarga sola los cambios.
- Calendario de entregas y exámenes por cuatrimestre; avisos del sistema.

## Capabilities and Constraints

- Pestañas: Inicio (la principal: exámenes, entregas y prácticas), Hoy, Asignaturas, Calendario, Cuatrimestre.
- Tareas con asignatura (`#ETIQUETA`), fecha y hora, prioridad (`!max`/`!alta`/`!media`/`!baja`), tipo (`+examen`/`+entrega`/`+practica`), repetición (`↻`), subtareas y notas.
- Añadir escribiendo en lenguaje natural en español; formulario completo para editar.
- Cada asignatura tiene un color configurable en el propio archivo; la app debe poder representar cualquier color que el usuario elija.
- Tema claro y oscuro (y "como el sistema"); color principal y tamaño de texto elegibles por el usuario.
- Interfaz en español. Sin conexión: solo publica el calendario `.ics` en un Gist si se configura.
- Debe pesar poco: sin fuentes ni recursos pesados descargados de internet en tiempo de ejecución.

## Brand Commitments

Nombre: **Check**. Voz en español, directa y cercana, de tú.

## Evidence on Hand

No hay testimonios, usuarios externos ni métricas. No inventarlos.

## Product Principles

1. Lo urgente se ve sin buscar: hoy, atrasado y lo próximo importante primero.
2. Apuntar es más rápido que olvidarlo: capturar una tarea no debe costar más de una frase.
3. El archivo es del estudiante: nada que no se pueda leer y editar a mano.
4. Calma en los días tranquilos, claridad en semana de exámenes.
