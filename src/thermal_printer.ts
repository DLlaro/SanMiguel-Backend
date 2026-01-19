import { writeFileSync } from "fs";
import { Socket } from "net";
import path from "path";

export function imprimirComandaRAW(
  comanda: {
    idPedido: number;
    mesa: string;
    fechaHora: string;
    items: {
      cantidad: number;
      nombre: string;
      observaciones?: string[] | string;
    }[];
  }
): Promise<void> {
  const printerIP: string = "192.168.0.90"; // thermal printer IP
  const printerPort: number = 9100; // Standard ESC/POS port
  return new Promise((resolve, reject) => {
    const bytes: number[] = [];

    // INIT
    bytes.push(0x1b, 0x40); // ESC @ - Inicializar
    bytes.push(0x1b, 0x74, 0x02); // CP850

    // ENCABEZADO - Centrado y grande
    bytes.push(0x1b, 0x61, 0x02); // Centrar
    bytes.push(0x1d, 0x21, 0x22); // Doble tamaño
    pushText(bytes, `MESA: ${comanda.mesa}\n`);
    
    bytes.push(0x1d, 0x21, 0x00); // Tamaño normal
    bytes.push(0x1b, 0x61, 0x00); // Alinear izquierda

    pushText(bytes, "=========================================\n");

    // INFORMACIÓN DE MESA
    bytes.push(0x1d, 0x21, 0x11); // Doble tamaño
    pushText(bytes, `ID: ${comanda.idPedido}\n`);
    bytes.push(0x1d, 0x21, 0x00); // Tamaño normal
    pushText(bytes, `HORA: ${comanda.fechaHora}\n`);
    pushText(bytes, "=========================================\n");

    // ITEMS
    for (const item of comanda.items) {
      bytes.push(0x1d, 0x21, 0x11); // Doble tamaño
      pushText(bytes, `${item.cantidad}x ${item.nombre}`);
      bytes.push(0x1d, 0x21, 0x00); // Tamaño normal

      // Observaciones
      if (item.observaciones) {
        const obsList = Array.isArray(item.observaciones)
          ? item.observaciones
          : item.observaciones.split(",").map((o) => o.trim());

        if (obsList.length > 0 && obsList[0] !== "") {
          pushText(bytes, "\n  Obs:\n");
          for (const obs of obsList) {
            pushText(bytes, `  - ${obs}\n`);
          }
        }
      }
      pushText(bytes, "\n");
    }

    // FOOTER
    pushText(bytes, "=========================================\n");

    // CORTE
    pushText(bytes, "\n\n\n");
    bytes.push(0x1d, 0x56, 0x00); // Corte total

    // Crear buffer
    const buffer = Buffer.from(bytes);

    // Guardar archivo (opcional, para debug)
    //const filePath = path.join(process.cwd(), "comanda.raw");
    //writeFileSync(filePath, buffer);

    // ENVIAR POR RED
    const client = new Socket();

    client.connect(printerPort, printerIP, () => {
      console.log(`Conectado a impresora: ${printerIP}:${printerPort}`);
      client.write(buffer);
    });

    client.on("data", (data) => {
      console.log("Respuesta de impresora:", data.toString());
    });

    client.on("close", () => {
      console.log("Comanda impresa correctamente");
      resolve();
    });

    client.on("error", (err) => {
      console.error("Error de impresión:", err);
      reject(err);
    });

    // Timeout de seguridad (5 segundos)
    setTimeout(() => {
      client.end();
    }, 5000);
  });
}

// Función de mapeo (sin cambios)
function pushText(bytes: number[], text: string) {
  const CP850_MAP: { [key: string]: number } = {
    á: 160, é: 130, í: 161, ó: 162, ú: 163,
    Á: 181, É: 144, Í: 214, Ó: 224, Ú: 233,
    ñ: 164, Ñ: 165,
    ü: 129, Ü: 154,
    "¿": 168, "¡": 173, "°": 248,
  };

  for (const char of text) {
    if (CP850_MAP[char] !== undefined) {
      bytes.push(CP850_MAP[char]);
    } else {
      const code = char.charCodeAt(0);
      bytes.push(code <= 127 ? code : 63);
    }
  }
}