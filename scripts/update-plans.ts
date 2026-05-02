import { drizzle } from "drizzle-orm/mysql2";
import { subscriptionPlans } from "../drizzle/schema_subscriptions";
import { sql } from "drizzle-orm";

async function updatePlans() {
  const db = drizzle(process.env.DATABASE_URL!);
  
  // Delete old plans
  await db.execute(sql`DELETE FROM subscription_plans`);
  console.log("✓ Old plans deleted");
  
  // Insert correct plans
  const plans = [
    { id: '1', name: '1 неделя', durationDays: 7, priceRub: '1700', discountPercent: 0, monthlyPriceRub: '1700' },
    { id: '2', name: '1 месяц', durationDays: 30, priceRub: '4000', discountPercent: 0, monthlyPriceRub: '4000' },
    { id: '3', name: '3 месяца', durationDays: 90, priceRub: '10300', discountPercent: 14, monthlyPriceRub: '3433' },
    { id: '4', name: 'Полгода', durationDays: 180, priceRub: '20000', discountPercent: 17, monthlyPriceRub: '3333' },
  ];
  
  for (const plan of plans) {
    await db.insert(subscriptionPlans).values(plan);
    console.log(`✓ Added: ${plan.name} - ${plan.priceRub}₽`);
  }
  
  console.log("✓ All plans updated successfully");
}

updatePlans().catch(console.error);
