import { db } from "./server/db";
import { users } from "./shared/schema";
import bcrypt from "bcryptjs";

// Las 4 regiones del sistema
const REGIONS = ["NOLA", "SOLA", "BRASIL", "MEXICO"] as const;

async function createTestUsers() {
  console.log("🔐 Creando usuarios de prueba para sistema multi-región...\n");
  console.log("📍 Sistema configurado SOLO por REGIÓN: NOLA, SOLA, BRASIL, MEXICO\n");
  
  const hashedPassword = await bcrypt.hash("password123", 10);
  
  try {
    // 1. Super Admin - ve TODAS las regiones
    await db.insert(users).values({
      username: "superadmin",
      email: "superadmin@test.com",
      password: hashedPassword,
      firstName: "Super",
      lastName: "Admin",
      country: "Global",
      role: "super-admin",
      adminRegionId: null, // null = ve todas las regiones
      region: "NOLA",
      regionCategory: "ENTERPRISE",
      isActive: true,
      isApproved: true,
    });
    
    console.log("✅ Super Admin: superadmin@test.com");
    console.log("   → 🌍 Ve TODAS las regiones (NOLA, SOLA, BRASIL, MEXICO)\n");
    
    // 2. Regional Admins - uno por cada región
    const adminConfigs = [
      { region: "NOLA", email: "admin@nola.com", username: "admin_nola" },
      { region: "SOLA", email: "admin@sola.com", username: "admin_sola" },
      { region: "BRASIL", email: "admin@brasil.com", username: "admin_brasil" },
      { region: "MEXICO", email: "admin@mexico.com", username: "admin_mexico" },
    ];
    
    for (const config of adminConfigs) {
      await db.insert(users).values({
        username: config.username,
        email: config.email,
        password: hashedPassword,
        firstName: "Admin",
        lastName: config.region,
        country: config.region,
        role: "regional-admin",
        adminRegionId: null, // ⚠️ Debes asignarlo desde UI después de crear regionConfig
        region: config.region as any,
        regionCategory: "ENTERPRISE",
        isActive: true,
        isApproved: true,
      });
      
      console.log(`✅ Regional Admin ${config.region}: ${config.email}`);
      console.log(`   → 📍 Solo verá usuarios de: ${config.region}`);
    }
    
    console.log("\n");
    
    // 3. Usuarios de prueba - 2 por cada región
    for (const region of REGIONS) {
      for (let i = 0; i < 2; i++) {
        const username = `user_${region.toLowerCase()}_${i + 1}`;
        
        await db.insert(users).values({
          username,
          email: `${username}@test.com`,
          password: hashedPassword,
          firstName: "Usuario",
          lastName: `${region} ${i + 1}`,
          country: region,
          role: "user",
          region: region as any,
          regionCategory: "ENTERPRISE",
          isActive: true,
          isApproved: true,
        });
        
        console.log(`✅ ${username} → Región: ${region}`);
      }
    }
    
    console.log("\n" + "=".repeat(70));
    console.log("🎉 ¡USUARIOS CREADOS! Password para todos: password123");
    console.log("=".repeat(70));
    console.log("\n📝 PASOS SIGUIENTES:\n");
    console.log("1. Ingresa como tu admin actual");
    console.log("2. Ve a Admin → Regions Management");
    console.log("3. Crea UNA región config para cada región: NOLA, SOLA, BRASIL, MEXICO");
    console.log("   (puedes usar cualquier categoría/subcategoría, el sistema solo filtra por REGIÓN)");
    console.log("4. Ve a Admin → Users y edita cada Regional Admin");
    console.log("5. Asigna su regionConfig correspondiente (admin_nola → config NOLA, etc.)");
    console.log("6. Cierra sesión e ingresa como cada usuario para probar:\n");
    console.log("   🌐 superadmin@test.com → Ve TODO");
    console.log("   📍 admin@nola.com → Solo ve usuarios con region=NOLA");
    console.log("   📍 admin@sola.com → Solo ve usuarios con region=SOLA");
    console.log("   📍 admin@brasil.com → Solo ve usuarios con region=BRASIL");
    console.log("   📍 admin@mexico.com → Solo ve usuarios con region=MEXICO\n");
    
  } catch (error: any) {
    console.error("\n❌ Error:", error.message);
    if (error.message.includes("unique")) {
      console.log("💡 Los usuarios ya existen. Elimínalos desde admin e intenta de nuevo.");
    }
    process.exit(1);
  }
  
  process.exit(0);
}

createTestUsers();
