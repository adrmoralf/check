// Convierte una nota con tareas en sintaxis de Tasks (Obsidian) al formato propio de la app.
// Uso: npx tsx scripts/migrar.ts <entrada.md> <salida.md>
import { readFileSync, writeFileSync } from "node:fs";
import { CURSO_INICIAL } from "../src/ajustes";
import { tareasDelDocumento } from "../src/core/documento";
import { migrarDesdeTasks } from "../src/core/plantilla";

const [entrada, salida] = process.argv.slice(2);
if (!entrada || !salida) {
  console.error("Uso: npx tsx scripts/migrar.ts <entrada.md> <salida.md>");
  process.exit(1);
}
const viejo = readFileSync(entrada, "utf8");
const nuevo = migrarDesdeTasks(viejo, CURSO_INICIAL);
const antes = tareasDelDocumento(entrada, viejo).length;
const despues = tareasDelDocumento(salida, nuevo).length;
if (antes !== despues) {
  console.error(`Se perderían tareas: ${antes} antes y ${despues} después. No se escribe nada.`);
  process.exit(2);
}
writeFileSync(salida, nuevo.replace(/\r?\n/g, "\n"), "utf8");
console.log(`Migradas ${despues} tareas → ${salida}`);
