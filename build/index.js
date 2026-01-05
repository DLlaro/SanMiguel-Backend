var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import express from "express";
import dotenv from "dotenv";
import { google } from "googleapis";
dotenv.config();
const app = express();
app.use(express.json());
//helper validate variable exists
function env(key) {
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
    scopes: "https://googleapis.com/auth/spreadsheets",
});
const googlesheets = google.sheets({
    version: "v4",
    auth,
});
app.get("/menu_dia", (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const result = yield googlesheets.spreadsheets.values.get({
            spreadsheetId,
            range: "MenuDia!A:Z",
        });
        res.json((_a = result.data.values) !== null && _a !== void 0 ? _a : []);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error leyendo el menú del día" });
    }
}));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server listening on port: ${PORT}`);
});
//# sourceMappingURL=index.js.map