import { drizzle } from "drizzle-orm/mysql2";
import { authUsers } from "../drizzle/schema_auth";
import { hashPassword } from "../server/_core/jwt";

const db = drizzle(process.env.DATABASE_URL!);

(async () => {
  try {
    // Hash the password
    const passwordHash = await hashPassword("admin123");

    // Create admin user in authUsers table
    const adminUser = {
      id: "admin_user_001",
      email: "admin@rtrader.local",
      passwordHash: passwordHash,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(authUsers).values(adminUser).onDuplicateKeyUpdate({
      set: {
        passwordHash: passwordHash,
        updatedAt: new Date(),
      },
    });

    console.log("✓ Admin user created in authUsers table");
    console.log("");
    console.log("Admin Credentials:");
    console.log("==================");
    console.log("Email: admin@rtrader.local");
    console.log("Password: admin123");
    console.log("");
    console.log("Use these credentials to log in to the app");
  } catch (error) {
    console.error("Error:", error);
  }
})();
