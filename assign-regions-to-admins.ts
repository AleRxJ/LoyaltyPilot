import { db } from "./server/db";
import { users, regionConfigs } from "./shared/schema";
import { eq } from "drizzle-orm";

/**
 * Script para asignar adminRegionId a los usuarios regional-admin
 * Este script:
 * 1. Busca los regionConfigs existentes para cada región
 * 2. Asigna el adminRegionId correcto a cada regional-admin según su email
 */

const REGION_MAPPING = {
  "admin@nola.com": "NOLA",
  "admin@sola.com": "SOLA",
  "admin@brasil.com": "BRASIL",
  "admin@mexico.com": "MEXICO"
};

async function assignRegionsToAdmins() {
  console.log("🔧 Iniciando asignación de regiones a admins regionales...\n");

  try {
    // 1. Obtener todos los regionConfigs
    console.log("📍 Buscando configuraciones de regiones...");
    const regions = await db.select().from(regionConfigs);
    
    if (regions.length === 0) {
      console.log("❌ No hay regionConfigs en la base de datos.");
      console.log("💡 Primero debes crear los regionConfigs desde el panel de admin.");
      console.log("   Ve a Admin Panel > Regions y crea las 4 regiones: NOLA, SOLA, BRASIL, MEXICO");
      return;
    }

    console.log(`✅ Encontradas ${regions.length} configuraciones de región:\n`);
    regions.forEach(r => {
      console.log(`   - ${r.name} (${r.region}/${r.category}/${r.subcategory || 'N/A'})`);
    });
    console.log();

    // 2. Crear un mapa de región -> regionConfig.id
    const regionMap = new Map<string, string>();
    regions.forEach(r => {
      regionMap.set(r.region, r.id);
    });

    // 3. Actualizar cada regional-admin
    console.log("👥 Asignando regiones a admins...\n");
    
    for (const [email, regionName] of Object.entries(REGION_MAPPING)) {
      const regionId = regionMap.get(regionName);
      
      if (!regionId) {
        console.log(`⚠️  ${email} -> ❌ No se encontró regionConfig para '${regionName}'`);
        continue;
      }

      // Buscar el usuario
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.username, email))
        .limit(1);

      if (!user) {
        console.log(`⚠️  ${email} -> ❌ Usuario no encontrado`);
        continue;
      }

      // Actualizar adminRegionId
      await db
        .update(users)
        .set({ adminRegionId: regionId })
        .where(eq(users.id, user.id));

      console.log(`✅ ${email} -> 📍 Asignado a región '${regionName}' (ID: ${regionId})`);
    }

    console.log("\n🎉 ¡Asignación completada!");
    console.log("\n📋 Próximos pasos:");
    console.log("1. Reinicia el servidor (npm run dev)");
    console.log("2. Cierra sesión y vuelve a entrar como regional-admin");
    console.log("3. Ahora solo verás datos de tu región asignada");

  } catch (error) {
    console.error("❌ Error asignando regiones:", error);
    throw error;
  } finally {
    process.exit(0);
  }
}

assignRegionsToAdmins();
