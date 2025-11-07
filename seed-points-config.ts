import { db } from "./server/db";
import { pointsConfig } from "./shared/schema";

async function seedPointsConfig() {
  console.log("🔧 Creando configuraciones de puntos por región...\n");
  
  const regions = ["NOLA", "SOLA", "BRASIL", "MEXICO"];
  
  try {
    for (const region of regions) {
      await db.insert(pointsConfig).values({
        region: region as any,
        softwareRate: 1000,
        hardwareRate: 5000,
        equipmentRate: 10000,
        grandPrizeThreshold: 50000,
        defaultNewCustomerGoalRate: 1000,
        defaultRenewalGoalRate: 2000,
        redemptionStartDate: null,
        redemptionEndDate: null,
        updatedBy: null,
      });
      
      console.log(`✅ Configuración creada para región: ${region}`);
    }
    
    console.log("\n🎉 ¡Todas las configuraciones regionales creadas exitosamente!");
    console.log("📝 Cada región ahora tiene su propia configuración independiente:");
    console.log("   - NOLA: Configuración independiente");
    console.log("   - SOLA: Configuración independiente");
    console.log("   - BRASIL: Configuración independiente");
    console.log("   - MEXICO: Configuración independiente");
    
  } catch (error: any) {
    console.error("\n❌ Error:", error.message);
    if (error.message.includes("unique")) {
      console.log("💡 Las configuraciones ya existen.");
    }
  }
  
  process.exit(0);
}

seedPointsConfig();