import { Router } from "express";
import { clerkClient } from "@clerk/express";
import { db, invitesTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireGestor } from "../middlewares/requireAuth";
import { sendInviteEmail } from "../lib/email";

const router = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Build the sign-up link only from domains this repl actually serves. */
function getTrustedOrigin(forwardedHost: string | undefined): string {
  const allowed = [
    ...(process.env.REPLIT_DOMAINS?.split(",") ?? []),
    process.env.REPLIT_DEV_DOMAIN,
  ]
    .map((d) => d?.trim())
    .filter((d): d is string => !!d);

  const requested = forwardedHost?.split(",")[0]?.trim();
  const host = requested && allowed.includes(requested) ? requested : allowed[0];
  if (host) return `https://${host}`;
  return process.env.APP_URL ?? "https://gestao-de-projetos.replit.app";
}

function inviteRow(inv: typeof invitesTable.$inferSelect) {
  return {
    id: inv.id,
    email: inv.email,
    name: inv.name,
    intendedRole: inv.intendedRole,
    clerkInvitationId: inv.clerkInvitationId ?? null,
    invitedAt: inv.invitedAt.toISOString(),
  };
}

router.get("/invitations", requireGestor, async (_req, res) => {
  const invites = await db.select().from(invitesTable).orderBy(invitesTable.invitedAt);
  return res.json(invites.map(inviteRow));
});

router.post("/invitations", requireGestor, async (req, res) => {
  const { email, name, intendedRole } = req.body as {
    email?: string;
    name?: string;
    intendedRole?: string;
  };

  if (!email || !name || !intendedRole) {
    return res.status(400).json({ error: "email, name e intendedRole são obrigatórios" });
  }

  if (!EMAIL_RE.test(email.trim()) || email.length > 254) {
    return res.status(400).json({ error: "E-mail inválido. Verifique e tente novamente." });
  }

  if (name.trim().length === 0 || name.length > 120) {
    return res.status(400).json({ error: "Nome inválido." });
  }

  const validRoles = ["gestor", "executor", "observador"];
  if (!validRoles.includes(intendedRole)) {
    return res.status(400).json({ error: "papel inválido" });
  }

  const [existingUser] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase()));

  if (existingUser) {
    return res.status(409).json({ error: "Este e-mail já possui uma conta no sistema." });
  }

  const [existingInvite] = await db
    .select()
    .from(invitesTable)
    .where(eq(invitesTable.email, email.toLowerCase()));

  if (existingInvite) {
    return res.status(409).json({ error: "Um convite já foi enviado para este e-mail." });
  }

  const signUpUrl = `${getTrustedOrigin(req.headers["x-forwarded-host"] as string | undefined)}/sign-up`;

  const [invite] = await db
    .insert(invitesTable)
    .values({
      email: email.toLowerCase(),
      name,
      intendedRole: intendedRole as "gestor" | "executor" | "observador",
      clerkInvitationId: null,
    })
    .returning();

  // Best-effort email; role assignment happens automatically on first sign-in
  // (requireAuth matches the pending invite by e-mail).
  const emailSent = await sendInviteEmail({
    toEmail: email.toLowerCase(),
    toName: name,
    intendedRole,
    signUpUrl,
  });

  return res.status(201).json({ ...inviteRow(invite), emailSent, signUpUrl });
});

router.delete("/invitations/:id", requireGestor, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "id inválido" });

  const [invite] = await db
    .select()
    .from(invitesTable)
    .where(eq(invitesTable.id, id));

  if (!invite) return res.status(404).json({ error: "Convite não encontrado" });

  if (invite.clerkInvitationId) {
    try {
      await clerkClient.invitations.revokeInvitation(invite.clerkInvitationId);
    } catch {
      // If Clerk revocation fails, continue with DB deletion anyway
    }
  }

  await db.delete(invitesTable).where(eq(invitesTable.id, id));
  return res.status(204).send();
});

export default router;
