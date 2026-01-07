import { ThermalPrinter, PrinterTypes, CharacterSet } from "node-thermal-printer";

export async function imprimirComanda(comanda: any) {
  const printer = new ThermalPrinter({
    type: PrinterTypes.EPSON,
    interface: "usb", // o "tcp://192.168.1.100"
    characterSet: CharacterSet.PC850_MULTILINGUAL
  });

  printer.alignCenter();
  printer.bold(true);
  printer.println("COCINA");
  printer.bold(false);
  printer.println("----------------");

  printer.println(`Mesa: ${comanda.mesa}`);
  printer.println(`Mozo: ${comanda.mozo}`);
  printer.println("");

  comanda.items.forEach((item: any) => {
    printer.println(`${item.cantidad} x ${item.nombre}`);
  });

  printer.println("");
  printer.cut();

  await printer.execute();
}
