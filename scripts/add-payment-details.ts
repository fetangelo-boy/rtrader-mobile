import { drizzle } from "drizzle-orm/mysql2";
import { paymentDetails } from "../drizzle/schema_subscriptions";
import { sql } from "drizzle-orm";

async function addPaymentDetails() {
  const db = drizzle(process.env.DATABASE_URL!);
  
  // Delete old payment details
  await db.execute(sql`DELETE FROM payment_details`);
  console.log("✓ Old payment details deleted");
  
  // Insert correct payment details
  const payment = {
    id: '1',
    bank: 'Т-Банк',
    cardNumber: '5536 9138 8189 0954',
    cardExpiry: '09/28',
    recipientName: 'Зерянский Роман Олегович',
    isActive: 1,
  };
  
  await db.insert(paymentDetails).values(payment);
  console.log(`✓ Payment details added: ${payment.recipientName}`);
  console.log(`  Bank: ${payment.bank}`);
  console.log(`  Card: ${payment.cardNumber}`);
  console.log(`  Expiry: ${payment.cardExpiry}`);
  
  console.log("✓ Payment details added successfully");
}

addPaymentDetails().catch(console.error);
