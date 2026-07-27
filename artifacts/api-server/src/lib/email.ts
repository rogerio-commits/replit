import { Resend } from "resend";

const client = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM = process.env.EMAIL_FROM ?? "Ulimax <onboarding@resend.dev>";
const APP_URL = process.env.APP_URL ?? "https://gestao-de-projetos.replit.app";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function baseTemplate(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Inter,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.07);">
        <!-- Header -->
        <tr><td style="background:#ff6600;padding:24px 32px;">
          <p style="margin:0;font-size:18px;font-weight:700;color:#fff;letter-spacing:-0.3px;">Ulimax &amp; Co.</p>
          <p style="margin:4px 0 0;font-size:12px;color:rgba(255,255,255,.8);">Sistema de Controle de Projetos</p>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:32px;">
          ${body}
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#f4f4f5;padding:16px 32px;border-top:1px solid #e4e4e7;">
          <p style="margin:0;font-size:11px;color:#71717a;text-align:center;">
            Você recebeu este email porque é membro do Ulimax.<br>
            <a href="${APP_URL}" style="color:#ff6600;text-decoration:none;">Acessar o sistema</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendInviteEmail(opts: {
  toEmail: string;
  toName: string;
  intendedRole: string;
  signUpUrl: string;
}): Promise<boolean> {
  if (!client) return false;
  const toEmail = escapeHtml(opts.toEmail);
  const toName = escapeHtml(opts.toName);
  const signUpUrl = escapeHtml(opts.signUpUrl);
  const { intendedRole } = opts;
  const roleLabel =
    intendedRole === "gestor" ? "Gestor" : intendedRole === "gestor_obras" ? "Gestor de Obras" : intendedRole === "executor" ? "Executor" : "Observador";
  const body = `
    <h2 style="margin:0 0 8px;font-size:20px;color:#18181b;">Você foi convidado para o Ulimax</h2>
    <p style="margin:0 0 24px;font-size:14px;color:#71717a;">Olá, <strong>${toName}</strong>. Você recebeu um convite para acessar o Sistema de Controle de Projetos da Ulimax como <strong>${roleLabel}</strong>.</p>
    <p style="margin:0 0 24px;font-size:14px;color:#3f3f46;">Para começar, crie sua conta usando <strong>este mesmo e-mail (${toEmail})</strong> — seu acesso será liberado automaticamente.</p>
    <a href="${signUpUrl}" style="display:inline-block;background:#ff6600;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;">Criar minha conta</a>
    <p style="margin:24px 0 0;font-size:12px;color:#71717a;">Se o botão não funcionar, copie e cole este link no navegador:<br><a href="${signUpUrl}" style="color:#ff6600;">${signUpUrl}</a></p>
  `;
  try {
    await client.emails.send({
      from: FROM,
      to: opts.toEmail,
      subject: `[Ulimax] Convite para acessar o sistema`,
      html: baseTemplate("Convite — Ulimax", body),
    });
    return true;
  } catch {
    return false;
  }
}

export async function sendTaskAssignedEmail(opts: {
  toEmail: string;
  toName: string;
  taskTitle: string;
  taskId: number;
  projectName: string;
  assignedByName: string;
}): Promise<void> {
  if (!client) return;
  const { toEmail, toName, taskTitle, projectName, assignedByName, taskId } = opts;
  const link = `${APP_URL}/tasks`;
  const body = `
    <h2 style="margin:0 0 8px;font-size:20px;color:#18181b;">Nova tarefa atribuída a você</h2>
    <p style="margin:0 0 24px;font-size:14px;color:#71717a;">Olá, <strong>${toName}</strong>. ${assignedByName} atribuiu uma nova tarefa.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;border-radius:8px;padding:20px;margin-bottom:24px;">
      <tr><td>
        <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#71717a;text-transform:uppercase;letter-spacing:.5px;">Tarefa</p>
        <p style="margin:0 0 16px;font-size:16px;font-weight:600;color:#18181b;">${taskTitle}</p>
        <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#71717a;text-transform:uppercase;letter-spacing:.5px;">Projeto</p>
        <p style="margin:0;font-size:14px;color:#3f3f46;">${projectName}</p>
      </td></tr>
    </table>
    <a href="${link}" style="display:inline-block;background:#ff6600;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;">Ver Tarefa</a>
  `;
  await client.emails.send({
    from: FROM,
    to: toEmail,
    subject: `[Ulimax] Nova tarefa: ${taskTitle}`,
    html: baseTemplate(`Nova tarefa: ${taskTitle}`, body),
  });
}

export async function sendTaskCommentedEmail(opts: {
  toEmail: string;
  toName: string;
  taskTitle: string;
  taskId: number;
  authorName: string;
  commentPreview: string;
}): Promise<void> {
  if (!client) return;
  const { toEmail, toName, taskTitle, authorName, commentPreview } = opts;
  const link = `${APP_URL}/tasks`;
  const body = `
    <h2 style="margin:0 0 8px;font-size:20px;color:#18181b;">Novo comentário na sua tarefa</h2>
    <p style="margin:0 0 24px;font-size:14px;color:#71717a;">Olá, <strong>${toName}</strong>. <strong>${authorName}</strong> comentou na tarefa <strong>${taskTitle}</strong>.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-left:3px solid #ff6600;padding:12px 16px;background:#fff7f0;border-radius:0 8px 8px 0;margin-bottom:24px;">
      <tr><td>
        <p style="margin:0;font-size:14px;color:#3f3f46;font-style:italic;">"${commentPreview}"</p>
      </td></tr>
    </table>
    <a href="${link}" style="display:inline-block;background:#ff6600;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;">Ver Tarefa</a>
  `;
  await client.emails.send({
    from: FROM,
    to: toEmail,
    subject: `[Ulimax] ${authorName} comentou em: ${taskTitle}`,
    html: baseTemplate(`Comentário em: ${taskTitle}`, body),
  });
}

export async function sendMentionEmail(opts: {
  toEmail: string;
  toName: string;
  taskTitle: string;
  taskId: number;
  authorName: string;
  commentPreview: string;
}): Promise<void> {
  if (!client) return;
  const { toEmail, toName, taskTitle, authorName, commentPreview } = opts;
  const link = `${APP_URL}/tasks`;
  const body = `
    <h2 style="margin:0 0 8px;font-size:20px;color:#18181b;">Você foi mencionado em um comentário</h2>
    <p style="margin:0 0 24px;font-size:14px;color:#71717a;">Olá, <strong>${toName}</strong>. <strong>${authorName}</strong> te mencionou na tarefa <strong>${taskTitle}</strong>.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-left:3px solid #ff6600;padding:12px 16px;background:#fff7f0;border-radius:0 8px 8px 0;margin-bottom:24px;">
      <tr><td>
        <p style="margin:0;font-size:14px;color:#3f3f46;font-style:italic;">"${commentPreview}"</p>
      </td></tr>
    </table>
    <a href="${link}" style="display:inline-block;background:#ff6600;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;">Ver Comentário</a>
  `;
  await client.emails.send({
    from: FROM,
    to: toEmail,
    subject: `[Ulimax] ${authorName} te mencionou em: ${taskTitle}`,
    html: baseTemplate(`Menção em: ${taskTitle}`, body),
  });
}

export async function sendDeadlineReminderEmail(opts: {
  toEmail: string;
  toName: string;
  taskTitle: string;
  taskId: number;
  projectName: string;
  daysLeft: number;
  dueDate: string;
}): Promise<void> {
  if (!client) return;
  const { toEmail, toName, taskTitle, projectName, daysLeft, dueDate } = opts;
  const link = `${APP_URL}/tasks`;
  const urgencyColor = daysLeft <= 1 ? "#ef4444" : daysLeft <= 3 ? "#f97316" : "#eab308";
  const urgencyLabel = daysLeft === 0 ? "vence hoje!" : daysLeft === 1 ? "vence amanhã!" : `vence em ${daysLeft} dias`;
  const body = `
    <h2 style="margin:0 0 8px;font-size:20px;color:#18181b;">⏰ Prazo se aproximando</h2>
    <p style="margin:0 0 24px;font-size:14px;color:#71717a;">Olá, <strong>${toName}</strong>. Uma tarefa atribuída a você está com prazo próximo.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;border-radius:8px;padding:20px;margin-bottom:24px;">
      <tr><td>
        <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#71717a;text-transform:uppercase;letter-spacing:.5px;">Tarefa</p>
        <p style="margin:0 0 16px;font-size:16px;font-weight:600;color:#18181b;">${taskTitle}</p>
        <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#71717a;text-transform:uppercase;letter-spacing:.5px;">Projeto</p>
        <p style="margin:0 0 16px;font-size:14px;color:#3f3f46;">${projectName}</p>
        <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#71717a;text-transform:uppercase;letter-spacing:.5px;">Prazo</p>
        <p style="margin:0;font-size:14px;font-weight:700;color:${urgencyColor};">${dueDate} — ${urgencyLabel}</p>
      </td></tr>
    </table>
    <a href="${link}" style="display:inline-block;background:#ff6600;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;">Ver Tarefa</a>
  `;
  await client.emails.send({
    from: FROM,
    to: toEmail,
    subject: `[Ulimax] ⏰ Prazo: ${taskTitle} ${urgencyLabel}`,
    html: baseTemplate(`Prazo próximo: ${taskTitle}`, body),
  });
}

export interface DigestTaskItem {
  title: string;
  meta: string;
}

function renderTaskBucket(label: string, color: string, items: DigestTaskItem[]): string {
  if (!items.length) return "";
  const shown = items.slice(0, 6);
  const extra = items.length - shown.length;
  const rows = shown
    .map(
      (t) => `
      <tr><td style="padding:6px 0;border-bottom:1px solid #f4f4f5;">
        <p style="margin:0;font-size:13px;font-weight:600;color:#18181b;">${escapeHtml(t.title)}</p>
        <p style="margin:2px 0 0;font-size:12px;color:#71717a;">${escapeHtml(t.meta)}</p>
      </td></tr>`,
    )
    .join("");
  const extraRow = extra > 0
    ? `<tr><td style="padding:6px 0;"><p style="margin:0;font-size:12px;color:#71717a;">+ ${extra} outra${extra > 1 ? "s" : ""}</p></td></tr>`
    : "";
  return `
    <p style="margin:20px 0 4px;font-size:12px;font-weight:700;color:${color};text-transform:uppercase;letter-spacing:.5px;">${escapeHtml(label)} (${items.length})</p>
    <table width="100%" cellpadding="0" cellspacing="0">${rows}${extraRow}</table>`;
}

export async function sendDailySummaryEmail(opts: {
  toEmail: string;
  toName: string;
  atrasadas: DigestTaskItem[];
  vencemHoje: DigestTaskItem[];
  proximas: DigestTaskItem[];
  paradas: DigestTaskItem[];
}): Promise<void> {
  if (!client) return;
  const { toEmail, toName, atrasadas, vencemHoje, proximas, paradas } = opts;
  const total = atrasadas.length + vencemHoje.length + proximas.length + paradas.length;
  if (!total) return;
  const link = `${APP_URL}/meu-dia`;
  const body = `
    <h2 style="margin:0 0 8px;font-size:20px;color:#18181b;">⏰ Suas pendências de hoje</h2>
    <p style="margin:0 0 8px;font-size:14px;color:#71717a;">Olá, <strong>${escapeHtml(toName)}</strong>. Este é o seu lembrete automático diário — ${total} ${total === 1 ? "tarefa precisa" : "tarefas precisam"} da sua atenção.</p>
    ${renderTaskBucket("Atrasadas", "#ef4444", atrasadas)}
    ${renderTaskBucket("Vencem hoje", "#f97316", vencemHoje)}
    ${renderTaskBucket("Vencem em até 3 dias", "#eab308", proximas)}
    ${renderTaskBucket("Paradas há 7+ dias", "#71717a", paradas)}
    <a href="${link}" style="display:inline-block;margin-top:24px;background:#ff6600;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;">Abrir Meu Dia</a>
  `;
  await client.emails.send({
    from: FROM,
    to: toEmail,
    subject: `[Ulimax] ⏰ Você tem ${total} ${total === 1 ? "pendência" : "pendências"} hoje`,
    html: baseTemplate("Suas pendências de hoje", body),
  });
}

export async function sendGestorDigestEmail(opts: {
  toEmail: string;
  toName: string;
  totalAtrasadas: number;
  totalVencemHoje: number;
  totalProximas: number;
  totalParadas: number;
  semResponsavel: number;
  porPessoa: { name: string; atrasadas: number; vencemHoje: number; proximas: number; paradas: number }[];
}): Promise<void> {
  if (!client) return;
  const { toEmail, toName, totalAtrasadas, totalVencemHoje, totalProximas, totalParadas, semResponsavel, porPessoa } = opts;
  const kpi = (label: string, value: number, color: string) => `
    <td align="center" style="padding:12px 4px;background:#f4f4f5;border-radius:8px;">
      <p style="margin:0;font-size:22px;font-weight:700;color:${color};">${value}</p>
      <p style="margin:2px 0 0;font-size:11px;color:#71717a;">${label}</p>
    </td>`;
  const pessoaRows = porPessoa
    .filter((p) => p.atrasadas + p.vencemHoje + p.proximas + p.paradas > 0)
    .map(
      (p) => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #f4f4f5;font-size:13px;font-weight:600;color:#18181b;">${escapeHtml(p.name)}</td>
        <td align="center" style="padding:8px 4px;border-bottom:1px solid #f4f4f5;font-size:13px;color:${p.atrasadas ? "#ef4444" : "#a1a1aa"};font-weight:${p.atrasadas ? "700" : "400"};">${p.atrasadas}</td>
        <td align="center" style="padding:8px 4px;border-bottom:1px solid #f4f4f5;font-size:13px;color:${p.vencemHoje ? "#f97316" : "#a1a1aa"};font-weight:${p.vencemHoje ? "700" : "400"};">${p.vencemHoje}</td>
        <td align="center" style="padding:8px 4px;border-bottom:1px solid #f4f4f5;font-size:13px;color:${p.proximas ? "#eab308" : "#a1a1aa"};">${p.proximas}</td>
        <td align="center" style="padding:8px 4px;border-bottom:1px solid #f4f4f5;font-size:13px;color:#71717a;">${p.paradas}</td>
      </tr>`,
    )
    .join("");
  const body = `
    <h2 style="margin:0 0 8px;font-size:20px;color:#18181b;">📋 Resumo diário da equipe</h2>
    <p style="margin:0 0 20px;font-size:14px;color:#71717a;">Olá, <strong>${escapeHtml(toName)}</strong>. Situação das tarefas da equipe nesta manhã:</p>
    <table width="100%" cellpadding="0" cellspacing="8"><tr>
      ${kpi("Atrasadas", totalAtrasadas, "#ef4444")}
      ${kpi("Vencem hoje", totalVencemHoje, "#f97316")}
      ${kpi("Em 3 dias", totalProximas, "#eab308")}
      ${kpi("Paradas 7d+", totalParadas, "#71717a")}
    </tr></table>
    ${pessoaRows ? `
    <p style="margin:24px 0 4px;font-size:12px;font-weight:700;color:#71717a;text-transform:uppercase;letter-spacing:.5px;">Por pessoa</p>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:4px 0;font-size:11px;color:#a1a1aa;">Membro</td>
        <td align="center" style="padding:4px;font-size:11px;color:#a1a1aa;">Atrasadas</td>
        <td align="center" style="padding:4px;font-size:11px;color:#a1a1aa;">Hoje</td>
        <td align="center" style="padding:4px;font-size:11px;color:#a1a1aa;">3 dias</td>
        <td align="center" style="padding:4px;font-size:11px;color:#a1a1aa;">Paradas</td>
      </tr>
      ${pessoaRows}
    </table>` : ""}
    ${semResponsavel > 0 ? `<p style="margin:16px 0 0;font-size:13px;color:#3f3f46;">⚠️ <strong>${semResponsavel}</strong> tarefa${semResponsavel > 1 ? "s" : ""} em aberto sem responsável definido.</p>` : ""}
    <a href="${APP_URL}" style="display:inline-block;margin-top:24px;background:#ff6600;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;">Abrir o painel</a>
  `;
  await client.emails.send({
    from: FROM,
    to: toEmail,
    subject: `[Ulimax] 📋 Resumo do dia: ${totalAtrasadas} atrasada${totalAtrasadas === 1 ? "" : "s"}, ${totalVencemHoje} vence${totalVencemHoje === 1 ? "" : "m"} hoje`,
    html: baseTemplate("Resumo diário da equipe", body),
  });
}
