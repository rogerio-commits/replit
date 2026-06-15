import { type Request, type Response, type NextFunction } from "express";
import { getAuth } from "@clerk/express";
import { clerkClient } from "@clerk/express";
import { db, usersTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";

export type AppUserRole = "gestor" | "executor" | "observador";

export interface AppUser {
  id: number;
  clerkUserId: string;
  email: string;
  role: AppUserRole;
  createdAt: Date;
}

declare global {
  namespace Express {
    interface Request {
      appUser?: AppUser;
    }
  }
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const auth = getAuth(req);
  if (!auth?.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  let [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkUserId, auth.userId));

  if (!user) {
    let email = "";
    try {
      const clerkUser = await clerkClient.users.getUser(auth.userId);
      email = clerkUser.emailAddresses[0]?.emailAddress ?? "";
    } catch {
      // non-critical, proceed with empty email
    }

    const [{ value: userCount }] = await db
      .select({ value: count() })
      .from(usersTable);

    const role: AppUserRole = userCount === 0 ? "gestor" : "observador";

    [user] = await db
      .insert(usersTable)
      .values({ clerkUserId: auth.userId, email, role })
      .returning();
  }

  req.appUser = user as AppUser;
  next();
}

export function requireGestor(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!req.appUser || req.appUser.role !== "gestor") {
    res.status(403).json({ error: "Proibido: papel de gestor necessário" });
    return;
  }
  next();
}

export function requireExecutorOrGestor(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!req.appUser || (req.appUser.role !== "gestor" && req.appUser.role !== "executor")) {
    res.status(403).json({ error: "Proibido: papel de executor ou gestor necessário" });
    return;
  }
  next();
}
