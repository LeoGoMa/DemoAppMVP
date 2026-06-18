import { PrismaClient } from "../generated/prisma";

const prisma = new PrismaClient();

const DEMO_USER_ID = "demo-user-carlos";

const transactions = [
  // Semana 1 (1–7 Jun 2026)
  { type: "ingreso", description: "Venta de frutas",       amount: 2500, category: "Venta directa",       date: new Date("2026-06-02T12:00:00") },
  { type: "gasto",   description: "Insumos del mercado",   amount: 900,  category: "Insumos / Mercancía",  date: new Date("2026-06-03T12:00:00") },
  { type: "ingreso", description: "Venta de verduras",     amount: 1800, category: "Venta directa",       date: new Date("2026-06-04T12:00:00") },
  { type: "gasto",   description: "Flete de transporte",   amount: 200,  category: "Transporte",           date: new Date("2026-06-05T12:00:00") },
  // Semana 2 (8–14 Jun 2026)
  { type: "ingreso", description: "Venta de frutas",       amount: 3100, category: "Venta directa",       date: new Date("2026-06-09T12:00:00") },
  { type: "gasto",   description: "Insumos del mercado",   amount: 1200, category: "Insumos / Mercancía",  date: new Date("2026-06-10T12:00:00") },
  { type: "ingreso", description: "Servicio de entrega",   amount: 500,  category: "Servicio de entrega",  date: new Date("2026-06-11T12:00:00") },
  { type: "gasto",   description: "Recibo de luz",         amount: 350,  category: "Servicios (luz/agua)", date: new Date("2026-06-13T12:00:00") },
  // Semana 3 (15–21 Jun 2026)
  { type: "gasto",   description: "Insumos del mercado",   amount: 800,  category: "Insumos / Mercancía",  date: new Date("2026-06-15T12:00:00") },
  { type: "ingreso", description: "Venta de frutas",       amount: 2800, category: "Venta directa",       date: new Date("2026-06-16T12:00:00") },
  { type: "ingreso", description: "Venta especial semana", amount: 1500, category: "Venta directa",       date: new Date("2026-06-17T12:00:00") },
  { type: "gasto",   description: "Flete de transporte",   amount: 180,  category: "Transporte",           date: new Date("2026-06-18T12:00:00") },
];

async function main() {
  console.log("🌱 Iniciando seed de FinanzasFácil...");

  await prisma.transaction.deleteMany({ where: { userId: DEMO_USER_ID } });

  await prisma.transaction.createMany({
    data: transactions.map(t => ({ ...t, userId: DEMO_USER_ID })),
  });

  console.log(`✅ Creadas ${transactions.length} transacciones para el usuario demo`);
  console.log("   Ingresos: $12,200.00 MXN");
  console.log("   Gastos:    $3,630.00 MXN");
  console.log("   Balance:   $8,570.00 MXN");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    void prisma.$disconnect();
    process.exit(1);
  });
