# Check

Aplicación de escritorio ligera (Tauri, unos pocos MB) para la lista de tareas del máster.
Todo vive en **un único archivo Markdown** que se guarda en Google Drive, así que está
sincronizado en todos los PC (Windows y Ubuntu) y se puede editar a mano, desde Obsidian o con IA.

Parte del Panel de tareas de Obsidian: reutiliza su
lógica (fechas, cuatrimestres, horario, consultas) y su interfaz (cinco pestañas: Inicio, Hoy,
Asignaturas, Calendario y Cuatrimestre).

## El archivo

Una tarea por línea:

```markdown
- [ ] Entregar la memoria de prácticas #RIS @2027-01-20 23:59 !alta
	- [ ] Subtarea con sangría #RIS
- [x] Repasar el tema 2 #CI @2026-11-20 ✓2026-11-19
- [ ] Repasar apuntes #CI @2026-11-30 ↻lunes
  https://enlace-a-los-apuntes  ← nota (sangría, sin casilla)
```

| Marca | Significado |
|---|---|
| `#RIS` | Asignatura (etiqueta de la tabla *Asignaturas*) |
| `@AAAA-MM-DD` | Fecha límite; `HH:MM` detrás es opcional |
| `!max` `!alta` `!media` `!baja` | Prioridad (sin nada, normal) |
| `+examen` `+entrega` `+practica` | Tipo (sin nada, Inicio lo deduce del texto: «examen», «memoria», «práctica»…) |
| `- [x]` · `✓AAAA-MM-DD` | Hecha y día en que se hizo (lo pone la app) |
| `- [-]` | Cancelada |
| `↻semanal` | Se repite: `diaria`, `laborables`, `semanal`, `quincenal`, `mensual`, `anual`, un día (`↻lunes`) o cada N días/semanas/meses (`↻3d`, `↻2s`, `↻1m`) |
| línea con sangría sin casilla | Nota de la tarea (enlaces, apuntes) |

Las tareas van en la sección `### Nombre de la asignatura`; las que no tienen asignatura, en
`## Otras tareas`. Al final, `## Configuración` guarda en tablas y listas las asignaturas (con su
color), las fechas de los cuatrimestres, los días no lectivos y el horario de clases. También se
entiende la sintaxis antigua del plugin Tasks (📅 ⏫ ✅).

## Qué hace la app

- Lee el archivo y lo **vuelve a cargar solo** si cambia fuera (Drive, Obsidian, IA): lo comprueba cada 2 s.
- Antes de cada cambio relee el archivo y comprueba que la línea no ha cambiado; cada cambio se puede **deshacer**.
- Guarda una **copia local** de la versión anterior antes de escribir (las 30 últimas, fuera de Drive).
- Publica las tareas con fecha como **.ics en un Gist** al que está suscrito Google Calendar
  (sustituye al plugin iCal de Obsidian). El token se guarda solo en ese PC.
- **Añadir escribiendo**: «memoria RIS mañana 23:59 alta» o «repasar CI cada lunes» se convierten en la tarea con asignatura, fecha, hora, prioridad y repetición; `+examen`, `+entrega` o `+practica` ponen el tipo (también se elige en la ventana de añadir).
- **Tareas que se repiten**: al marcarlas hechas aparece encima la siguiente con su nueva fecha.
- **Notas** en cada tarea (con enlaces que se abren en el navegador).
- Pestaña **Inicio** (la principal): exámenes, entregas y prácticas hasta el fin del cuatrimestre, en una línea de tiempo y con los días que faltan. Las entregas y prácticas se marcan como hechas desde ahí; los exámenes no.
- **Avisos** del sistema: resumen del día a la hora elegida y aviso unas horas antes de las tareas con hora.
- **Bandeja del sistema**: al cerrar, Check se queda junto al reloj con el número de tareas para hoy; puede arrancar con el PC.
- **Atajo global** (por defecto `Ctrl+Alt+N`) para añadir una tarea desde cualquier programa.
- **Archivar** las terminadas hace tiempo en `Tareas-archivo.md` (a mano o al abrir).
- **Conflictos de Drive**: si Drive crea «Tareas (1).md» por editar en dos PC a la vez, Check avisa y la junta con el archivo.
- **Color principal y tamaño del texto** a elección en los ajustes.
- **Actualizaciones**: al abrir y cada 6 horas mira si hay una versión nueva; si la hay, avisa (aviso del sistema y botón «Actualizar a X» en el raíl) y con un clic la descarga, la instala y vuelve a abrir Check. En *Ajustes → Actualizaciones* se ve la versión instalada, se busca a mano o se desactiva.
- `Ctrl+N` nueva tarea · clic en una tarea para editarla · clic derecho para fechas, prioridad, subtarea o eliminar · arrastrar a otro día.

## Desarrollo

```powershell
npm install
npm test               # tests de la lógica y del formato
npm run dev            # interfaz en el navegador con un archivo de prueba
npm run tauri dev      # la app de escritorio en modo desarrollo
npm run tauri build    # instalador (Windows: NSIS; Ubuntu: .deb y .AppImage)
npx tsx scripts/migrar.ts viejo.md nuevo.md   # convertir una nota de Tasks al formato propio
```

Para Ubuntu, GitHub Actions compila el `.deb` y el `.AppImage` en cada `push` (ver
`.github/workflows/compilar.yml`). En Ubuntu, Google Drive se monta con rclone o con
*Cuentas en línea* de GNOME; en la app basta con elegir la ruta del archivo en esa carpeta.

## Publicar una versión

El actualizador lee `latest.json` de la última release de GitHub; los instaladores van firmados y la
app solo acepta los firmados con su clave (la pública está en `tauri.conf.json`, la privada en el
secreto `TAURI_SIGNING_PRIVATE_KEY` del repositorio y en `~/.tauri/check.key` del PC donde se creó:
si se pierde, las versiones instaladas no podrán actualizarse solas).

1. Subir la versión en `package.json`, `src-tauri/tauri.conf.json` y `src-tauri/Cargo.toml`.
2. Etiqueta anotada con las novedades (es lo que enseña la app al avisar) y subirla:

   ```powershell
   git tag -a v1.3.0 -m "- Novedad uno`n- Novedad dos"
   git push origin v1.3.0
   ```

3. Actions compila Windows y Ubuntu, sube los instaladores firmados y `latest.json` a la release y
   la publica cuando están las dos plataformas. A partir de ahí, las apps abiertas lo detectan.

En Ubuntu se actualiza el formato instalado: el `.AppImage` se sustituye solo; el `.deb` pide la
contraseña de administrador para instalarse.
