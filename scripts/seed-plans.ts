import { drizzle } from "drizzle-orm/mysql2";
import { subscriptionPlans } from "../drizzle/schema_subscriptions";

async function seedPlans() {
  const db = drizzle(process.env.DATABASE_URL!);
  
  const plans = [
    { id: '1', name: '1 неделя', durationDays: 7, priceRub: '99', discountPercent: 0, monthlyPriceRub: '423' },
    { id: '2', name: '1 месяц', durationDays: 30, priceRub: '299', discountPercent: 0, monthlyPriceRub: '299' },
    { id: '3', name: '3 месяца', durationDays: 90, priceRub: '799', discountPercent: 11, monthlyPriceRub: '266' },
    { id: '4', name: '6 месяцев', durationDays: 180, priceRub: '1499', discountPercent: 17, monthlyPriceRub: '250' },
  ];
  
  for (const plan of plans) {
    try {
      await db.insert(subscriptionPlans).values(plan);
      console.log(`✓ Plan added: ${plan.name}`);
    } catch (error: any) {
      if (error.message.includes('Duplicate')) {
        console.log(`✓ Plan exists: ${plan.name}`);
      } else {
        console.error(`✗ Error adding plan ${plan.name}:`, error.message);
      }
    }
  }
  
  console.log('Seeding complete');
}

seedPlans().catch(console.error);
