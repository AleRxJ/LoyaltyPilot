import { db } from "./db";
import { regionConfigs, monthlyRegionPrizes } from "@shared/schema";

async function seedRegions() {
  console.log("🌱 Seeding regions...");

  // NOLA Regions
  const nolaConfigs = [
    {
      region: "NOLA" as const,
      category: "ENTERPRISE" as const,
      subcategory: "COLOMBIA",
      name: "NOLA ENTERPRISE COLOMBIA",
      newCustomerGoalRate: 1000,
      renewalGoalRate: 2000,
      monthlyGoalTarget: 10, // Meta ejemplo, ajustar según necesidad
      isActive: true,
    },
    {
      region: "NOLA" as const,
      category: "ENTERPRISE" as const,
      subcategory: "CENTRO AMÉRICA",
      name: "NOLA ENTERPRISE CENTRO AMÉRICA",
      newCustomerGoalRate: 1000,
      renewalGoalRate: 2000,
      monthlyGoalTarget: 10,
      isActive: true,
    },
    {
      region: "NOLA" as const,
      category: "SMB" as const,
      subcategory: "COLOMBIA",
      name: "NOLA SMB COLOMBIA",
      newCustomerGoalRate: 1000,
      renewalGoalRate: 2000,
      monthlyGoalTarget: 8,
      isActive: true,
    },
    {
      region: "NOLA" as const,
      category: "SMB" as const,
      subcategory: "CENTRO AMÉRICA",
      name: "NOLA SMB CENTRO AMÉRICA",
      newCustomerGoalRate: 1000,
      renewalGoalRate: 2000,
      monthlyGoalTarget: 8,
      isActive: true,
    },
    {
      region: "NOLA" as const,
      category: "MSSP" as const,
      subcategory: null,
      name: "NOLA MSSP",
      newCustomerGoalRate: 1000,
      renewalGoalRate: 2000,
      monthlyGoalTarget: 5,
      isActive: true,
    },
  ];

  // SOLA Regions
  const solaConfigs = [
    {
      region: "SOLA" as const,
      category: "ENTERPRISE" as const,
      subcategory: null,
      name: "SOLA ENTERPRISE",
      newCustomerGoalRate: 1000,
      renewalGoalRate: 2000,
      monthlyGoalTarget: 12,
      isActive: true,
    },
    {
      region: "SOLA" as const,
      category: "SMB" as const,
      subcategory: null,
      name: "SOLA SMB",
      newCustomerGoalRate: 1000,
      renewalGoalRate: 2000,
      monthlyGoalTarget: 10,
      isActive: true,
    },
  ];

  // BRASIL Regions
  const brasilConfigs = [
    {
      region: "BRASIL" as const,
      category: "ENTERPRISE" as const,
      subcategory: null,
      name: "BRASIL ENTERPRISE",
      newCustomerGoalRate: 1000,
      renewalGoalRate: 2000,
      monthlyGoalTarget: 15,
      isActive: true,
    },
    {
      region: "BRASIL" as const,
      category: "SMB" as const,
      subcategory: null,
      name: "BRASIL SMB",
      newCustomerGoalRate: 1000,
      renewalGoalRate: 2000,
      monthlyGoalTarget: 12,
      isActive: true,
    },
  ];

  // MÉXICO Regions
  const mexicoConfigs = [
    {
      region: "MEXICO" as const,
      category: "ENTERPRISE" as const,
      subcategory: "PLATINUM",
      name: "MÉXICO ENTERPRISE PLATINUM",
      newCustomerGoalRate: 1000,
      renewalGoalRate: 2000,
      monthlyGoalTarget: 20,
      isActive: true,
    },
    {
      region: "MEXICO" as const,
      category: "ENTERPRISE" as const,
      subcategory: "GOLD",
      name: "MÉXICO ENTERPRISE GOLD",
      newCustomerGoalRate: 1000,
      renewalGoalRate: 2000,
      monthlyGoalTarget: 15,
      isActive: true,
    },
    {
      region: "MEXICO" as const,
      category: "SMB" as const,
      subcategory: "PLATINUM",
      name: "MÉXICO SMB PLATINUM",
      newCustomerGoalRate: 1000,
      renewalGoalRate: 2000,
      monthlyGoalTarget: 12,
      isActive: true,
    },
    {
      region: "MEXICO" as const,
      category: "SMB" as const,
      subcategory: "GOLD",
      name: "MÉXICO SMB GOLD",
      newCustomerGoalRate: 1000,
      renewalGoalRate: 2000,
      monthlyGoalTarget: 10,
      isActive: true,
    },
    {
      region: "MEXICO" as const,
      category: "SMB" as const,
      subcategory: "SILVER & REGISTERED",
      name: "MÉXICO SMB SILVER & REGISTERED",
      newCustomerGoalRate: 1000,
      renewalGoalRate: 2000,
      monthlyGoalTarget: 8,
      isActive: true,
    },
  ];

  // Insertar todas las configuraciones
  const allConfigs = [...nolaConfigs, ...solaConfigs, ...brasilConfigs, ...mexicoConfigs];
  
  try {
    const insertedConfigs = await db.insert(regionConfigs).values(allConfigs).returning();
    console.log(`✅ ${insertedConfigs.length} region configs created`);

    // Premios mensuales según el calendario proporcionado
    const monthlyPrizes = [
      { month: 11, monthName: "NOVEMBER", prizeName: "RAPPI BONUS" },
      { month: 12, monthName: "DECEMBER", prizeName: "WORLD CUP HAT EMBLEM" },
      { month: 1, monthName: "JANUARY", prizeName: "WORLD CUP SOCCER BALL" },
      { month: 2, monthName: "FEBRUARY", prizeName: "WORLD CUP T-SHIRT" },
      { month: 3, monthName: "MARCH", prizeName: "EARBUDS BOSE" },
      { month: 4, monthName: "APRIL", prizeName: "SPEAKER" },
    ];

    const currentYear = 2025;
    const regionPrizes = [];

    // Crear premios para cada región y cada mes
    for (const config of insertedConfigs) {
      for (const prize of monthlyPrizes) {
        regionPrizes.push({
          regionConfigId: config.id,
          month: prize.month,
          year: currentYear,
          prizeName: prize.prizeName,
          prizeDescription: `Sorteo mensual de ${prize.monthName} para ${config.name}`,
          goalTarget: config.monthlyGoalTarget || 10,
          isActive: true,
        });
      }
    }

    const insertedPrizes = await db.insert(monthlyRegionPrizes).values(regionPrizes).returning();
    console.log(`✅ ${insertedPrizes.length} monthly prizes created`);
    
    console.log("🎉 Seeding completed successfully!");
  } catch (error) {
    console.error("❌ Error seeding regions:", error);
    throw error;
  }
}

// Ejecutar si se llama directamente
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  seedRegions()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { seedRegions };
