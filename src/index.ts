import express from "express";
import dotenv from "dotenv";
import { google } from "googleapis";
import { imprimirComandaRAW } from "./thermal_printer.js";

dotenv.config();
const app = express();
app.use(express.json());

//helper validate variable exists
function env(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Falta la variable de entorno ${key}`);
  }
  return value;
}

const spreadsheetId = env("SPREADSHEET_ID");
const credentials = env("GOOGLE_APPLICATION_CREDENTIALS");

const auth = new google.auth.GoogleAuth({
  keyFile: credentials,
  scopes: "https://www.googleapis.com/auth/spreadsheets",
});

const googlesheets = google.sheets({
  version: "v4",
  auth,
});

app.get("/menu_dia", async (_req, res) => {
  try {
    const result = await googlesheets.spreadsheets.values.get({
      spreadsheetId,
      range: "MenuDia!A:Z",
    });

    res.json(result.data.values ?? []);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error leyendo el menú del día" });
  }
});



app.get("/lastid", async (_req, res) => {
  try {
    const result = await googlesheets.spreadsheets.values.get({
      spreadsheetId,
      range: "LastId!A2",
    });

    res.json(result.data.values ?? []);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error leyendo el ultimo id" });
  }
});

interface plato_menu {
  IdPedido: number
  ID: string;
  Nombre: string;
  Tipo: string,
  Cantidad: number;
  Observaciones?: string;
}

/*app.get("/verificar") verificarDisponibilidad(plato: plato_menu ): boolean {
  try{
    const result = await googlesheets.spreadsheets.values.get({
      spreadsheetId,
      range: "LastId!A2",
    });

    res.json(result.data.values ?? []);
  }catch(error){

  }
  return false;
}*/

interface plato_dia {
  id: string;
  nombre: string;
  tipo:string,
  cantidad: number;
}

app.post("/actualizar_cantidades", async(req,res)=>{
  try {
    const platos = req.body
    const now = new Date();
    const fecha = now.toLocaleDateString("es-PE", { timeZone: "America/Lima"});//para el registro en el sheet

    // Mapear los platos al formato de filas para Google Sheets
    const filas = platos.map((plato:plato_dia) => [
      fecha,         // Columna A
      plato.id,      // Columna B
      plato.nombre,  // Columna C
      plato.tipo,// Columna D
      plato.cantidad // Columna E
    ]);
    console.log(filas)
    // Actualizar Google Sheets (usa UPDATE en vez de APPEND)
    await googlesheets.spreadsheets.values.update({
      spreadsheetId,
      range: "MenuDia!A:E", // Empieza en B2 para no sobrescribir headers
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: filas,
      },
    });
    
    res.status(200).json({ 
      success: true, 
      mensaje: "Cantidades actualizadas correctamente",
      platosActualizados: platos.length
    });
    
  } catch (error) {
    console.error("Error actualizando cantidades:", error);
    const errorMessage = error instanceof Error ? error.message : "Error desconocido";
    res.status(500).json({ 
      error: "Error al actualizar cantidades",
      detalle: errorMessage 
    });
  }
});

app.post("/registrar_menu", async (req, res) => {
  try {
    const { idPedido, mesa, items } = req.body as{
      idPedido: number;
      mesa : string;
      items: plato_menu[]; 

    };
    console.log(req.body)
    if (!mesa || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Datos inválidos" });
    }
    
    const now = new Date();
    const fecha = now.toLocaleDateString("es-PE", { timeZone: "America/Lima"});//para el registro en el sheet
    console.log(fecha)
    const fechaHora =  now.toLocaleString("es-PE", { timeZone: "America/Lima"});//para la comanda
    // Convertimos objetos a arrays para Google Sheets
    const filas = items.map((item: plato_menu) => [
      idPedido,
      fecha,
      mesa,
      item.ID,
      item.Nombre,
      //item.Tipo,
      item.Cantidad,
      item.Observaciones?? ""
    ]);



    await googlesheets.spreadsheets.values.append({
      spreadsheetId,
      range: "Ventas!A:G",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: filas,
      },
    });

    // AUMENTAR EN UNO EL LASTID
    await googlesheets.spreadsheets.values.update({
      spreadsheetId,
      range: "LastId!A2",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[idPedido]],
      },
    });

    // CONVERSIÓN PARA LA IMPRESORA
    const itemsComanda = items.map((item) => {
      const obj = {
        cantidad: item.Cantidad,
        nombre: item.Nombre,
        tipo: item.Tipo,
      } as {
        cantidad: number;
        nombre: string;
        tipo: string;
        observaciones?: string;
      };

      if (item.Observaciones) {
        obj.observaciones = item.Observaciones;
      }

      return obj;
    });
    console.log(itemsComanda)

    imprimirComandaRAW({
      idPedido,
      mesa,
      fechaHora,
      items: itemsComanda,
    });

    res.json({ success: true, total: filas.length });
  }catch (error: unknown) {
    console.error("Google Sheets error:", error);
    const errorMessage = error instanceof Error ? error.message : "Error desconocido";
    console.error("Mensaje:", errorMessage);
    res.status(500).json({ error: "Error registrando el menú" });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server listening on port: ${PORT}`);
});
