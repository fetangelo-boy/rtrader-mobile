import type { Express, Request, Response } from "express";
import { eq, desc, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import crypto from "crypto";
import multer from "multer";
import { subscriptionRequests } from "../../drizzle/schema";
import { getServerSupabase } from "../../lib/supabase";
import { storagePut } from "../storage";

// --- Helpers ---

function verifyAdminKey(req: Request, res: Response): boolean {
  const adminKey = process.env.ADMIN_API_KEY;
  if (!adminKey) {
    res.status(500).json({ error: "Admin API not configured" });
    return false;
  }
  const providedKey = req.headers["x-admin-key"] as string;
  if (!providedKey || providedKey !== adminKey) {
    res.status(401).json({ error: "Invalid admin key" });
    return false;
  }
  return true;
}

function generatePassword(length: number = 10): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let password = "";
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    password += chars[bytes[i] % chars.length];
  }
  return password;
}

function generateSubscriptionId(): string {
  return "sub-" + crypto.randomUUID().split("-")[0];
}

function getDb() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL not set");
  return drizzle(process.env.DATABASE_URL);
}

// Multer for receipt upload (in-memory, max 10MB)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// --- Routes ---

export function registerRequestRoutes(app: Express) {
  /**
   * POST /api/requests/upload-receipt
   * Upload a receipt screenshot to S3. Returns the URL.
   * Public endpoint (no admin key required).
   * Accepts multipart/form-data with a "file" field.
   */
  app.post("/api/requests/upload-receipt", upload.single("file"), async (req: Request, res: Response) => {
    try {
      const file = (req as any).file;
      if (!file) {
        res.status(400).json({ error: "No file uploaded. Send multipart/form-data with 'file' field." });
        return;
      }
      const ext = file.originalname?.split(".").pop() || "jpg";
      const key = `receipts/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
      const { url } = await storagePut(key, file.buffer, file.mimetype || "image/jpeg");
      console.log(`[Requests] Receipt uploaded: ${key}`);
      res.json({ success: true, url });
    } catch (error: any) {
      console.error("[Requests] upload-receipt error:", error);
      res.status(500).json({ error: "Failed to upload receipt: " + error.message });
    }
  });

  /**
   * POST /api/requests/create
   * Create a new subscription request. Public endpoint.
   *
   * Body:
   * {
   *   "channel": "telegram" | "email",
   *   "telegram_id": "123456789",       // Required for telegram channel
   *   "telegram_name": "Иван Петров",   // Optional
   *   "email": "ivan@example.com",      // Required for email channel
   *   "contact_name": "Иван Петров",    // Optional
   *   "receipt_url": "https://...",      // Required: URL from upload-receipt
   *   "receipt_text": "Оплата за месяц" // Optional comment
   * }
   */
  app.post("/api/requests/create", async (req: Request, res: Response) => {
    try {
      const { channel, telegram_id, telegram_name, email, contact_name, receipt_url, receipt_text } = req.body;

      if (!channel || !["telegram", "email"].includes(channel)) {
        res.status(400).json({ error: "channel must be 'telegram' or 'email'" });
        return;
      }
      if (channel === "telegram" && !telegram_id) {
        res.status(400).json({ error: "telegram_id is required for telegram channel" });
        return;
      }
      if (channel === "email" && !email) {
        res.status(400).json({ error: "email is required for email channel" });
        return;
      }
      if (!receipt_url) {
        res.status(400).json({ error: "receipt_url is required" });
        return;
      }

      const db = getDb();
      const result = await db.insert(subscriptionRequests).values({
        channel,
        status: "pending_review",
        telegramId: telegram_id ? String(telegram_id) : null,
        telegramName: telegram_name || null,
        email: email || null,
        contactName: contact_name || null,
        receiptUrl: receipt_url,
        receiptText: receipt_text || null,
      });

      const insertId = (result as any)[0]?.insertId;
      console.log(`[Requests] New request #${insertId} from ${channel}: ${telegram_id || email}`);

      res.json({
        success: true,
        request_id: insertId,
        status: "pending_review",
        message: "Ваш чек принят и находится на рассмотрении администратором, пожалуйста, ожидайте.",
      });
    } catch (error: any) {
      console.error("[Requests] create error:", error);
      res.status(500).json({ error: "Failed to create request: " + error.message });
    }
  });

  /**
   * GET /api/admin/requests
   * List subscription requests with optional filters.
   * Query params: status, channel, limit, offset
   */
  app.get("/api/admin/requests", async (req: Request, res: Response) => {
    if (!verifyAdminKey(req, res)) return;
    try {
      const db = getDb();
      const status = req.query.status as string | undefined;
      const channel = req.query.channel as string | undefined;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const offset = parseInt(req.query.offset as string) || 0;

      let query = db.select().from(subscriptionRequests).orderBy(desc(subscriptionRequests.createdAt)).limit(limit).offset(offset);

      // Apply filters via raw SQL conditions
      const conditions: any[] = [];
      if (status) conditions.push(eq(subscriptionRequests.status, status as any));
      if (channel) conditions.push(eq(subscriptionRequests.channel, channel as any));

      if (conditions.length === 1) {
        query = query.where(conditions[0]) as any;
      } else if (conditions.length === 2) {
        query = query.where(sql`${conditions[0]} AND ${conditions[1]}`) as any;
      }

      const requests = await query;

      // Count total
      const countResult = await db.select({ count: sql<number>`COUNT(*)` }).from(subscriptionRequests);
      const total = (countResult[0] as any)?.count || 0;

      res.json({ requests, total, limit, offset });
    } catch (error: any) {
      console.error("[Requests] list error:", error);
      res.status(500).json({ error: "Failed to list requests: " + error.message });
    }
  });

  /**
   * GET /api/admin/requests/:id
   * Get details of a single request.
   */
  app.get("/api/admin/requests/:id", async (req: Request, res: Response) => {
    if (!verifyAdminKey(req, res)) return;
    try {
      const db = getDb();
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ error: "Invalid request ID" });
        return;
      }
      const rows = await db.select().from(subscriptionRequests).where(eq(subscriptionRequests.id, id)).limit(1);
      if (!rows.length) {
        res.status(404).json({ error: "Request not found" });
        return;
      }
      res.json(rows[0]);
    } catch (error: any) {
      console.error("[Requests] get error:", error);
      res.status(500).json({ error: "Failed to get request: " + error.message });
    }
  });

  /**
   * POST /api/admin/requests/:id/approve
   * Approve a request and execute access provisioning.
   *
   * Body:
   * {
   *   "approved_until": "2026-06-01T00:00:00Z",  // Required: exact expiry date
   *   "approved_plan": "premium",                  // Optional (default: "premium")
   *   "admin_note": "Чек проверен"                 // Optional
   * }
   *
   * This endpoint:
   * 1. Validates the request exists and is pending_review
   * 2. Finds or creates the Supabase user
   * 3. Creates or updates the subscription
   * 4. Returns credentials (for new users) or confirmation (for existing)
   */
  app.post("/api/admin/requests/:id/approve", async (req: Request, res: Response) => {
    if (!verifyAdminKey(req, res)) return;
    try {
      const db = getDb();
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ error: "Invalid request ID" });
        return;
      }

      const { approved_until, approved_plan = "premium", admin_note } = req.body;
      if (!approved_until) {
        res.status(400).json({ error: "approved_until is required (ISO date string)" });
        return;
      }

      // Validate date
      const expiryDate = new Date(approved_until);
      if (isNaN(expiryDate.getTime())) {
        res.status(400).json({ error: "Invalid approved_until date format" });
        return;
      }

      // Get the request
      const rows = await db.select().from(subscriptionRequests).where(eq(subscriptionRequests.id, id)).limit(1);
      if (!rows.length) {
        res.status(404).json({ error: "Request not found" });
        return;
      }
      const request = rows[0];

      if (request.status !== "pending_review") {
        res.status(400).json({ error: `Request is already ${request.status}, cannot approve` });
        return;
      }

      // Update request to approved
      await db.update(subscriptionRequests).set({
        status: "approved",
        approvedUntil: expiryDate,
        approvedPlan: approved_plan,
        adminNote: admin_note || null,
        approvedBy: "admin",
      }).where(eq(subscriptionRequests.id, id));

      // --- EXECUTE: Create or renew user ---
      try {
        const supabase = getServerSupabase();
        const { data: usersData } = await supabase.auth.admin.listUsers();
        let existingUser: any = null;

        // Find existing user by telegram_id or email
        if (request.telegramId) {
          existingUser = usersData?.users?.find(
            (u: any) => u.user_metadata?.telegram_id === request.telegramId
          );
        }
        if (!existingUser && request.email) {
          existingUser = usersData?.users?.find((u: any) => u.email === request.email);
        }

        if (existingUser) {
          // --- RENEW existing user ---
          const { data: existingSub } = await supabase
            .from("subscriptions")
            .select("*")
            .eq("user_id", existingUser.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (existingSub) {
            await supabase
              .from("subscriptions")
              .update({
                status: "active",
                expires_at: expiryDate.toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq("id", existingSub.id);
          } else {
            await supabase.from("subscriptions").insert({
              id: generateSubscriptionId(),
              user_id: existingUser.id,
              plan: approved_plan,
              status: "active",
              started_at: new Date().toISOString(),
              expires_at: expiryDate.toISOString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
          }

          // Unban if previously banned
          await supabase.auth.admin.updateUserById(existingUser.id, {
            ban_duration: "none",
          });

          // Mark request as executed
          await db.update(subscriptionRequests).set({
            status: "executed",
            supabaseUserId: existingUser.id,
            isNewUser: 0,
            executedAt: new Date(),
          }).where(eq(subscriptionRequests.id, id));

          console.log(`[Requests] #${id} RENEWED: ${existingUser.email} until ${expiryDate.toISOString()}`);

          res.json({
            success: true,
            request_id: id,
            status: "executed",
            is_new_user: false,
            user_id: existingUser.id,
            email: existingUser.email,
            subscription: {
              plan: approved_plan,
              expires_at: expiryDate.toISOString(),
            },
            message: `Подписка продлена до ${expiryDate.toLocaleDateString("ru-RU")}`,
          });
        } else {
          // --- CREATE new user ---
          const email = request.email || `tg${request.telegramId}@rtrader.app`;
          const password = generatePassword(10);

          // Check email uniqueness
          const emailTaken = usersData?.users?.find((u: any) => u.email === email);
          if (emailTaken) {
            await db.update(subscriptionRequests).set({
              status: "failed",
              errorMessage: `Email ${email} already taken by user ${emailTaken.id}`,
            }).where(eq(subscriptionRequests.id, id));

            res.status(409).json({
              error: `Email ${email} already taken`,
              existing_user_id: emailTaken.id,
            });
            return;
          }

          // Create Supabase Auth user
          const userMetadata: any = {};
          if (request.telegramId) userMetadata.telegram_id = request.telegramId;
          if (request.telegramName) userMetadata.name = request.telegramName;
          if (request.contactName) userMetadata.name = request.contactName;
          userMetadata.email_verified = true;

          const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: userMetadata,
          });

          if (authError || !authData.user) {
            await db.update(subscriptionRequests).set({
              status: "failed",
              errorMessage: `Auth error: ${authError?.message || "unknown"}`,
            }).where(eq(subscriptionRequests.id, id));

            res.status(500).json({ error: "Failed to create user: " + (authError?.message || "unknown") });
            return;
          }

          const userId = authData.user.id;

          // Create profile
          const displayName = request.telegramName || request.contactName || email.split("@")[0];
          await supabase.from("profiles").upsert({
            id: userId,
            username: displayName,
            avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(displayName)}`,
            created_at: new Date().toISOString(),
          });

          // Create subscription
          await supabase.from("subscriptions").insert({
            id: generateSubscriptionId(),
            user_id: userId,
            plan: approved_plan,
            status: "active",
            started_at: new Date().toISOString(),
            expires_at: expiryDate.toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

          // Add to all chats
          const { data: allChats } = await supabase.from("chats").select("id");
          if (allChats?.length) {
            const participantRows = allChats.map((chat: any) => ({
              chat_id: chat.id,
              user_id: userId,
              role: "member",
              joined_at: new Date().toISOString(),
            }));
            await supabase.from("chat_participants").insert(participantRows);
          }

          // Mark request as executed
          await db.update(subscriptionRequests).set({
            status: "executed",
            supabaseUserId: userId,
            isNewUser: 1,
            executedAt: new Date(),
          }).where(eq(subscriptionRequests.id, id));

          console.log(`[Requests] #${id} CREATED: ${email} until ${expiryDate.toISOString()}`);

          res.json({
            success: true,
            request_id: id,
            status: "executed",
            is_new_user: true,
            user_id: userId,
            email,
            password,
            subscription: {
              plan: approved_plan,
              expires_at: expiryDate.toISOString(),
            },
            message: `Новый аккаунт создан. Логин: ${email}, Пароль: ${password}`,
          });
        }
      } catch (execError: any) {
        // Execute failed — mark as failed but keep approved state info
        await db.update(subscriptionRequests).set({
          status: "failed",
          errorMessage: execError.message,
        }).where(eq(subscriptionRequests.id, id));

        console.error(`[Requests] #${id} execute FAILED:`, execError);
        res.status(500).json({
          error: "Execution failed: " + execError.message,
          request_id: id,
          status: "failed",
        });
      }
    } catch (error: any) {
      console.error("[Requests] approve error:", error);
      res.status(500).json({ error: "Failed to approve request: " + error.message });
    }
  });

  /**
   * POST /api/admin/requests/:id/reject
   * Reject a subscription request.
   *
   * Body:
   * {
   *   "admin_note": "Чек не соответствует сумме"  // Optional
   * }
   */
  app.post("/api/admin/requests/:id/reject", async (req: Request, res: Response) => {
    if (!verifyAdminKey(req, res)) return;
    try {
      const db = getDb();
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ error: "Invalid request ID" });
        return;
      }

      const rows = await db.select().from(subscriptionRequests).where(eq(subscriptionRequests.id, id)).limit(1);
      if (!rows.length) {
        res.status(404).json({ error: "Request not found" });
        return;
      }
      const request = rows[0];

      if (request.status !== "pending_review") {
        res.status(400).json({ error: `Request is already ${request.status}, cannot reject` });
        return;
      }

      const { admin_note } = req.body;

      await db.update(subscriptionRequests).set({
        status: "rejected",
        adminNote: admin_note || null,
        approvedBy: "admin",
      }).where(eq(subscriptionRequests.id, id));

      console.log(`[Requests] #${id} REJECTED`);

      res.json({
        success: true,
        request_id: id,
        status: "rejected",
        admin_note: admin_note || null,
        // Info for bot to notify user
        channel: request.channel,
        telegram_id: request.telegramId,
        email: request.email,
        message: "Заявка отклонена.",
      });
    } catch (error: any) {
      console.error("[Requests] reject error:", error);
      res.status(500).json({ error: "Failed to reject request: " + error.message });
    }
  });

  console.log("[Requests] Subscription request routes registered");
}
