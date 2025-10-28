import { drizzle } from "drizzle-orm/neon-serverless";
import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";
import * as schema from "./shared/schema";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL not set");
}

const sql = neon(DATABASE_URL);
const db = drizzle({ client: sql, schema });

async function createAdminUser() {
  try {
    const hashedPassword = await bcrypt.hash("admin123", 10);
    
    const [admin] = await db.insert(schema.users).values({
      username: "admin",
      email: "admin@loyaltyprogram.com",
      password: hashedPassword,
      firstName: "Admin",
      lastName: "User",
      country: "US",
      role: "admin",
      isActive: true,
      isApproved: true,
    }).returning();

    console.log("✅ Usuario admin creado exitosamente!");
    console.log("👤 Username: admin");
    console.log("🔑 Password: admin123");
    console.log("\n🎉 Ya puedes iniciar sesión en http://localhost:5000");
    
    process.exit(0);
  } catch (error: any) {
    if (error.code === '23505') { // Unique constraint violation
      console.log("ℹ️  El usuario admin ya existe");
      console.log("👤 Username: admin");
      console.log("🔑 Password: admin123");
      process.exit(0);
    } else {
      console.error("❌ Error creando usuario admin:", error);
      process.exit(1);
    }
  }
}

createAdminUser();
