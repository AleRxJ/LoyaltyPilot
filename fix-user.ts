import { drizzle } from "drizzle-orm/neon-serverless";
import { neon } from "@neondatabase/serverless";
import { eq } from "drizzle-orm";
import { users } from "./shared/schema.js";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL not set");
}

const sql = neon(DATABASE_URL);
const db = drizzle({ client: sql });

async function fixUser() {
  try {
    // Actualizar todos los usuarios para que sean activos y aprobados
    const updated = await db.update(users)
      .set({ 
        isActive: true, 
        isApproved: true,
        role: "admin"
      })
      .returning();

    console.log("✅ Usuarios actualizados:");
    updated.forEach(u => {
      console.log(`  👤 ${u.username} - ${u.email} - Role: ${u.role}`);
    });
    
    console.log("\n🎉 Ahora puedes iniciar sesión en http://localhost:5000");
    
    process.exit(0);
  } catch (error: any) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

fixUser();
