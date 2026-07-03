import { Resend } from "resend";

const client = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM = process.env.EMAIL_FROM ?? "Ulimax <onboarding@resend.dev>";
const APP_URL = process.env.APP_URL ?? "https://gestao-de-projetos.replit.app";

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
