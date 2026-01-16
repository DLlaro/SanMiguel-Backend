import { writeFileSync } from "fs";
import { execSync } from "child_process";
import path from "path";

export function imprimirComandaRAW(
  comanda: {
    idPedido: number,
    mesa: string;
    fechaHora: string;
    items: { 
      cantidad: number; 
      nombre: string; 
      observaciones?: string[] | string;
    }[];
  }
): void {
  const filePath = path.join(process.cwd(), "comanda.raw");

  const bytes: number[] = [];

  // INIT
  bytes.push(0x1B, 0x40);       // ESC @ - Inicializar
  bytes.push(0x1B, 0x74, 0x02); // CP850
  
  // ENCABEZADO - Centrado y grande
  bytes.push(0x1B, 0x61, 0x01); // Centrar
  bytes.push(0x1D, 0x21, 0x11); // Doble tamaño (ancho y alto)
  pushText(bytes, `ID PEDIDO: ${comanda.idPedido}\n`);
  bytes.push(0x1D, 0x21, 0x00); // Tamaño normal
  bytes.push(0x1B, 0x61, 0x00); // Alinear izquierda

  pushText(bytes, "================================\n");

  // INFORMACIÓN DE MESA
  bytes.push(0x1D, 0x21, 0x11); // Doble tamaño (ancho y alto)
  pushText(bytes, `MESA: ${comanda.mesa}\n`);
  bytes.push(0x1D, 0x21, 0x00); // Tamaño normal
  pushText(bytes, `Hora: ${comanda.fechaHora}\n`);
  pushText(bytes, "================================\n");

  // ITEMS
  for (const item of comanda.items) {
    // Cantidad y nombre en negrita
    bytes.push(0x1D, 0x21, 0x11); // Doble tamaño
    pushText(bytes, `${item.cantidad}x ${item.nombre}`);
    bytes.push(0x1D, 0x21, 0x00); // Tamaño normal

    // Observaciones
    if (item.observaciones) {
      const obsList = Array.isArray(item.observaciones) 
        ? item.observaciones 
        : item.observaciones.split(",").map(o => o.trim());
      
      if (obsList.length > 0 && obsList[0] !== "") {
        pushText(bytes, "\n  Obs:\n");
        for (const obs of obsList) {
          pushText(bytes, `  - ${obs}\n`);
        }
      }
    }
    pushText(bytes, "\n"); // Espacio entre platos
  }

  // FOOTER
  pushText(bytes, "================================\n");
  
  // CORTE (con espaciado antes del corte)
  pushText(bytes, "\n\n\n");
  bytes.push(0x1D, 0x56, 0x00); // Corte total

  // Guardar archivo RAW
  writeFileSync(filePath, Buffer.from(bytes));

  // Imprimir
  const cmd = `cmd /c print /D:"\\\\localhost\\TP-300" "${filePath}"`;

  try {
    execSync(cmd, { stdio: "inherit" });
    console.log("Comanda impresa correctamente");
  } catch (err) {
    console.error("Error impresión:", err);
    throw err;
  }
}

// ============================================
// FUNCIÓN CORREGIDA CON SOPORTE CP850
// ============================================
function pushText(bytes: number[], text: string) {
  // Tabla de mapeo CP850 para caracteres especiales españoles
  const CP850_MAP: { [key: string]: number } = {
    // Vocales con tilde minúsculas
    'á': 160, 'é': 130, 'í': 161, 'ó': 162, 'ú': 163,
    // Vocales con tilde mayúsculas
    'Á': 181, 'É': 144, 'Í': 214, 'Ó': 224, 'Ú': 233,
    // Eñes
    'ñ': 164, 'Ñ': 165,
    // Diéresis
    'ü': 129, 'Ü': 154,
    // Símbolos
    '¿': 168, '¡': 173, '°': 248,
  };

  for (const char of text) {
    // Si tiene mapeo especial CP850, usar ese código
    if (CP850_MAP[char] !== undefined) {
      bytes.push(CP850_MAP[char]);
    } else {
      // Para ASCII normal (0-127)
      const code = char.charCodeAt(0);
      bytes.push(code <= 127 ? code : 63); // 63 = '?'
    }
  }
}