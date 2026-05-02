import { drizzle } from "drizzle-orm/mysql2";
import { users } from "../drizzle/schema";

const db = drizzle(process.env.DATABASE_URL!);

(async () => {
  try {
    // Create admin user
    const adminUser = {
      openId: "admin123",
      name: "Admin",
      email: "admin@rtrader.local",
      loginMethod: "password",
      role: "admin" as const,
      lastSignedIn: new Date(),
    };

    await db.insert(users).values([adminUser]).onDuplicateKeyUpdate({
      set: {
        role: "admin",
        lastSignedIn: new Date(),
      },
    });

    console.log("✓ Admin user created/updated");
    console.log("");
    console.log("Admin Credentials:");
    console.log("==================");
    console.log("Username (openId): admin123");
    console.log("Password: admin123");
    console.log("Role: admin");
    console.log("");
    console.log("Use these credentials to log in to the app");
  } catch (error) {
    console.error("Error:", error);
  }
})();
