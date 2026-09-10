import { Router } from "express";
import { clerkClient } from "@clerk/express";
import { db, membersTable, usersTable, invitesTable } from "@workspace/db";
import { requireGestor } from "../middlewares/requireAuth";
import { eq } from "drizzle-orm";
import {
  CreateMemberBody,
  CreateMemberWithAccessBody,
  UpdateMemberParams,
  UpdateMemberBody,
  DeleteMemberParams,
  GetMemberParams,
} from "@workspace/api-zod";

const router = Router();

function formatMember(m: typeof membersTable.$inferSelect) {
  return {
    id: m.id,
    name: m.name,
    role: m.role,
    email: m.email,
    avatarUrl: m.avatarUrl ?? null,
    team: m.team,
    createdAt: m.createdAt.toISOString(),
  };
}

router.get("/members", async (_req, res) => {
  const rows = await db.select().from(membersTable).orderBy(membersTable.name);
  return res.json(rows.map(formatMember));
});

router.post("/members", requireGestor, async (req, res) => {
  const body = CreateMemberBody.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "Invalid body" });

  const [member] = await db
    .insert(membersTable)
    .values({
      name: body.data.name,
      role: body.data.role,
      email: body.data.email,
      avatarUrl: body.data.avatarUrl ?? null,
      team: (body.data.team as "projetos" | "tecnica") ?? "projetos",
    })
    .returning();

  return res.status(201).json(formatMember(member));
});

/**
 * Traduz o erro do Clerk para uma frase que o gestor entenda — ele está criando
 * a senha de outra pessoa e precisa saber o que corrigir no formulário.
 */
function clerkErrorMessage(err: unknown): string {
  const errors = (err as { errors?: { code?: string; longMessage?: string; message?: string }[] })?.errors;
  const first = errors?.[0];
  switch (first?.code) {
    case "form_password_pwned":
      return "Esta senha já apareceu em vazamentos públicos. Escolha outra.";
    case "form_password_length_too_short":
      return "Senha muito curta. Use pelo menos 8 caracteres.";
    case "form_password_not_strong_enough":
      return "Senha muito fraca. Misture letras, números e símbolos.";
    case "form_identifier_exists":
      return "Já existe uma conta com este e-mail.";
    case "form_param_format_invalid":
      return "E-mail inválido. Verifique e tente novamente.";
    default:
      return first?.longMessage ?? first?.message ?? "Não foi possível criar o acesso. Tente novamente.";
  }
}

/**
 * Cadastro direto: o gestor preenche os dados da pessoa E define a senha dela.
 * Evita o ida-e-volta do convite (a pessoa recebia e-mail, criava a própria
 * senha e só então virava usuária). A senha vai direto para o Clerk — nunca
 * é gravada no nosso banco nem registrada em log.
 */
router.post("/members/with-access", requireGestor, async (req, res) => {
  const body = CreateMemberWithAccessBody.safeParse(req.body);
  if (!body.success) {
    return res.status(400).json({ error: "Preencha nome, cargo, e-mail, papel e uma senha de 8+ caracteres." });
  }

  const email = body.data.email.trim().toLowerCase();
  const name = body.data.name.trim();

  const [existingUser] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (existingUser) {
    return res.status(409).json({ error: "Este e-mail já possui uma conta no sistema." });
  }

  const [existingMember] = await db.select().from(membersTable).where(eq(membersTable.email, email));
  if (existingMember) {
    return res.status(409).json({ error: "Já existe um membro da equipe com este e-mail." });
  }

  const [firstName, ...rest] = name.split(/\s+/);

  let clerkUserId: string;
  try {
    const created = await clerkClient.users.createUser({
      emailAddress: [email],
      password: body.data.password,
      firstName,
      lastName: rest.join(" ") || undefined,
      skipPasswordChecks: false,
    });
    clerkUserId = created.id;
  } catch (err: unknown) {
    return res.status(400).json({ error: clerkErrorMessage(err) });
  }

  try {
    const [member] = await db
      .insert(membersTable)
      .values({
        name,
        role: body.data.role,
        email,
        team: (body.data.team as "projetos" | "tecnica") ?? "projetos",
      })
      .returning();

    // O papel já entra gravado: a pessoa não depende do casamento por e-mail
    // que o fluxo de convite fazia no primeiro login.
    await db.insert(usersTable).values({
      clerkUserId,
      email,
      role: body.data.intendedRole,
    });

    // Convite pendente para o mesmo e-mail perde o sentido.
    await db.delete(invitesTable).where(eq(invitesTable.email, email));

    return res.status(201).json({ member: formatMember(member), accountCreated: true });
  } catch (err: unknown) {
    // Conta criada no Clerk mas o banco falhou: desfaz para o e-mail não ficar
    // preso e o gestor poder tentar de novo.
    try {
      await clerkClient.users.deleteUser(clerkUserId);
    } catch {
      // sem o que fazer aqui — o erro do banco é o que importa reportar
    }
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: `Erro ao salvar o membro: ${msg}` });
  }
});

router.get("/members/:id", async (req, res) => {
  const params = GetMemberParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) return res.status(400).json({ error: "Invalid id" });

  const [member] = await db
    .select()
    .from(membersTable)
    .where(eq(membersTable.id, params.data.id));

  if (!member) return res.status(404).json({ error: "Not found" });

  return res.json(formatMember(member));
});

router.patch("/members/:id", requireGestor, async (req, res) => {
  const params = UpdateMemberParams.safeParse({ id: Number(req.params.id) });
  const body = UpdateMemberBody.safeParse(req.body);
  if (!params.success || !body.success) {
    return res.status(400).json({ error: "Invalid input" });
  }

  const updateData: Record<string, unknown> = {};
  if (body.data.name !== undefined) updateData.name = body.data.name;
  if (body.data.role !== undefined) updateData.role = body.data.role;
  if (body.data.email !== undefined) updateData.email = body.data.email;
  if (body.data.avatarUrl !== undefined) updateData.avatarUrl = body.data.avatarUrl;
  if (body.data.team !== undefined) updateData.team = body.data.team;

  const [member] = await db
    .update(membersTable)
    .set(updateData)
    .where(eq(membersTable.id, params.data.id))
    .returning();

  if (!member) return res.status(404).json({ error: "Not found" });

  return res.json(formatMember(member));
});

router.delete("/members/:id", requireGestor, async (req, res) => {
  const params = DeleteMemberParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) return res.status(400).json({ error: "Invalid id" });

  await db.delete(membersTable).where(eq(membersTable.id, params.data.id));
  return res.status(204).send();
});

router.post("/members/:id/signin-link", requireGestor, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "id inválido" });

  const [member] = await db.select().from(membersTable).where(eq(membersTable.id, id));
  if (!member) return res.status(404).json({ error: "Membro não encontrado" });

  const list = await clerkClient.users.getUserList({ emailAddress: [member.email] });
  if (!list.data.length) {
    return res.status(404).json({ error: "Este membro ainda não possui uma conta no sistema. Envie um convite primeiro." });
  }

  try {
    const token = await clerkClient.signInTokens.createSignInToken({
      userId: list.data[0].id,
      expiresInSeconds: 60 * 60 * 24,
    });
    return res.json({ url: token.url });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: `Erro ao gerar link: ${msg}` });
  }
});

export default router;
