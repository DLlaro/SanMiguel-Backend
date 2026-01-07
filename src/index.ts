import express from "express";
import dotenv from "dotenv";
import { google } from "googleapis";
import { imprimirComanda } from "./thermal_printer.js";

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

interface plato_menu {
  Fecha: Date;
  ID: string;
  Nombre: string;
  Cantidad: number;
  Observaciones?: string;
}

app.post("/registrar_menu", async (req, res) => {
  try {
    const { mesa, items } = req.body as{
      mesa : string | number;
      items: plato_menu[]; 

    };
    if (!mesa || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Datos inválidos" });
    }

    const fecha = new Date().toISOString().split("T")[0];

    // Convertimos objetos a arrays para Google Sheets
    const filas = items.map((item: plato_menu) => [
      fecha,
      mesa,
      item.ID,
      item.Nombre,
      item.Cantidad,
      item.Observaciones?? ""
    ]);

    await googlesheets.spreadsheets.values.append({
      spreadsheetId,
      range: "Ventas!A:F",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: filas,
      },
    });
    await imprimirComanda({ mesa, items });

    res.json({ success: true, total: filas.length });
  }catch (error: any) {
      console.error("Google Sheets error:", error.message);
      res.status(500).json({ error: "Error registrando el menú" });
    }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server listening on port: ${PORT}`);
});
