import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { chatRouter } from "./routers/chat";
import { accountRouter } from "./routers/account";
import { profileRouter } from "./routers/profile";
import { notificationsRouter } from "./routers/notifications";
import { authRouter } from "./routers/auth";

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: authRouter,

  chat: chatRouter,
  account: accountRouter,
  profile: profileRouter,
  notifications: notificationsRouter,
});

export type AppRouter = typeof appRouter;
