import { writeFileSync } from "fs";
import path from "path";

// Ruta del archivo RAW de prueba
const filePath = path.join(process.cwd(), "test_comanda.raw");

// Crear bytes ESC/POS
const bytes: number[] = [];

// INIT impresora
bytes.push(0x1B, 0x40);        // ESC @ → Reset
bytes.push(0x1B, 0x74, 0x02);  // Code page CP850 (acentos/ñ)

// HEADER
bytes.push(0x1B, 0x61, 0x01);  // Center
bytes.push(0x1B, 0x45, 0x01);  // Bold ON
pushText(bytes, "TEST IMPRESORA\n");
bytes.push(0x1B, 0x45, 0x00);  // Bold OFF
pushText(bytes, "----------------\n\n");

// INFO
bytes.push(0x1B, 0x61, 0x00);  // Align left
pushText(bytes, "Mesa: 5\n");
pushText(bytes, `Hora: ${new Date().toLocaleTimeString()}\n`);
pushText(bytes, "----------------\n\n");

// ITEMS DE PRUEBA
pushText(bytes, "1x Pizza Margarita\n");
pushText(bytes, "2x Coca Cola 500ml\n");
pushText(bytes, "  -> Sin cebolla\n\n");

// CORTE al final
bytes.push(0x1B, 0x61, 0x01); // Center antes del corte opcional
pushText(bytes, "\n\n");      // Papel extra
// CORTE
bytes.push(0x1D, 0x56, 0x00); // Corte total

// Guardar archivo RAW
writeFileSync(filePath, Buffer.from(bytes));
console.log("✅ Archivo test_comanda.raw creado correctamente");

// Helper para texto ASCII
function pushText(bytes: number[], text: string) {
  const buf = Buffer.from(text, "ascii");
  for (const b of buf) bytes.push(b);
}
