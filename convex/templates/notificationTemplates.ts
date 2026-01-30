export const generateNotificationEmail = (args: {
  userName: string;
  event: string;
  entityType: string;
  entityName: string;
  details: string;
  workgroupName: string;
}) => {
  const eventEmoji: Record<string, string> = {
    task_created: "✨",
    task_updated: "📝",
    task_deleted: "🗑️",
    task_assigned: "👤",
    task_completed: "✅",
    project_created: "🚀",
    project_updated: "🔄",
    project_deleted: "❌",
    task_due_soon: "⏰",
    task_overdue: "🚨",
  };

  const emoji = eventEmoji[args.event] || "📬";
  
  const eventColors: Record<string, string> = {
    task_created: "#22c55e",
    task_updated: "#3b82f6",
    task_deleted: "#ef4444",
    task_assigned: "#8b5cf6",
    task_completed: "#22c55e",
    project_created: "#6366f1",
    project_updated: "#3b82f6",
    project_deleted: "#ef4444",
    task_due_soon: "#f97316",
    task_overdue: "#ef4444",
  };
  
  const highlightColor = eventColors[args.event] || "#6366f1";

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Notificação ProjecTrak</title>
      </head>
      <body style="font-family: 'Segoe UI', Arial, sans-serif; background: #0f172a; color: #e2e8f0; padding: 24px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 640px; margin: 0 auto; background: #0f172a;">
          <tr>
            <td style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 32px; border-radius: 18px 18px 0 0; text-align: center;">
              <p style="margin: 0; letter-spacing: 4px; font-size: 13px; text-transform: uppercase; color: rgba(255,255,255,0.8);">Workspace ${args.workgroupName}</p>
              <h1 style="margin: 12px 0 0; font-size: 30px; color: #fff;">${emoji} Notificação</h1>
            </td>
          </tr>
          <tr>
            <td style="background: #0b1120; border: 1px solid rgba(148,163,184,0.2); border-top: none; border-radius: 0 0 18px 18px; padding: 32px;">
              <p style="font-size: 16px; color: #e2e8f0; margin: 0 0 16px 0;">Olá ${args.userName},</p>
              <p style="font-size: 15px; color: #cbd5f5; margin: 0 0 24px 0;">Uma atualização importante:</p>

              <div style="background: rgba(99,102,241,0.08); border: 1px solid rgba(99,102,241,0.3); border-radius: 14px; padding: 20px; margin-bottom: 24px;">
                <p style="margin: 0 0 10px 0; font-size: 14px; letter-spacing: 2px; text-transform: uppercase; color: rgba(148,163,184,0.8);">${args.entityType === "task" ? "Tarefa" : "Projeto"}</p>
                <h2 style="margin: 0 0 12px 0; font-size: 22px; color: #fff;">${args.entityName}</h2>
                <span style="display: inline-block; padding: 10px 18px; border-radius: 999px; font-size: 14px; font-weight: 600; background: rgba(255,255,255,0.1); color: ${highlightColor}; border: 1px solid ${highlightColor};">
                  ${emoji} ${args.event.replace(/_/g, " ").toUpperCase()}
                </span>
                <p style="margin: 18px 0 0 0; color: #94a3b8; font-size: 14px;">${args.details}</p>
              </div>

              <p style="font-size: 13px; color: rgba(226,232,240,0.7);">Essa mensagem foi enviada automaticamente pelo ProjecTrak.</p>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  const text = `
Notificação ProjecTrak

${emoji} Notificação
Olá ${args.userName},

Workspace: ${args.workgroupName}
${args.entityType === "task" ? "Tarefa" : "Projeto"}: ${args.entityName}
Detalhes: ${args.details}

Esta é uma notificação automática do ProjecTrak.
  `.trim();

  return { html, text };
};

export const generateTaskStatusUpdateEmail = (args: {
  userName: string;
  taskTitle: string;
  newStatus: string;
  details: string;
  workgroupName: string;
  projectName?: string;
  assigneeName?: string;
}) => {
  const normalizeStatus = (status: string) =>
    status
      .replace(/_/g, " ")
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  const statusPalette: Record<string, string> = {
    done: "#22c55e",
    completed: "#22c55e",
    in_progress: "#3b82f6",
    review: "#f97316",
    blocked: "#ef4444",
    todo: "#6366f1",
  };
  const normalizedKey = args.newStatus.toLowerCase().replace(/\s+/g, "_");
  const highlightColor = statusPalette[normalizedKey] ?? "#6366f1";
  const friendlyStatus = normalizeStatus(args.newStatus);

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Status da Tarefa Atualizado</title>
      </head>
      <body style="font-family: 'Segoe UI', Arial, sans-serif; background: #0f172a; color: #e2e8f0; padding: 24px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 640px; margin: 0 auto; background: #0f172a;">
          <tr>
            <td style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 32px; border-radius: 18px 18px 0 0; text-align: center;">
              <p style="margin: 0; letter-spacing: 4px; font-size: 13px; text-transform: uppercase; color: rgba(255,255,255,0.8);">Workspace ${args.workgroupName}</p>
              <h1 style="margin: 12px 0 0; font-size: 30px; color: #fff;">Atualização de Tarefa</h1>
            </td>
          </tr>
          <tr>
            <td style="background: #0b1120; border: 1px solid rgba(148,163,184,0.2); border-top: none; border-radius: 0 0 18px 18px; padding: 32px;">
              <p style="font-size: 16px; color: #e2e8f0; margin: 0 0 16px 0;">Olá ${args.userName},</p>
              <p style="font-size: 15px; color: #cbd5f5; margin: 0 0 24px 0;">A tarefa abaixo teve o status atualizado:</p>

              <div style="background: rgba(99,102,241,0.08); border: 1px solid rgba(99,102,241,0.3); border-radius: 14px; padding: 20px; margin-bottom: 24px;">
                <p style="margin: 0 0 10px 0; font-size: 14px; letter-spacing: 2px; text-transform: uppercase; color: rgba(148,163,184,0.8);">Tarefa</p>
                <h2 style="margin: 0 0 12px 0; font-size: 22px; color: #fff;">${args.taskTitle}</h2>
                ${args.projectName ? `<p style="margin: 0 0 12px 0; color: #cbd5f5; font-size: 14px;"><strong>Projeto:</strong> ${args.projectName}</p>` : ''}
                ${args.assigneeName ? `<p style="margin: 0 0 12px 0; color: #cbd5f5; font-size: 14px;"><strong>Responsável:</strong> ${args.assigneeName}</p>` : ''}
                <span style="display: inline-block; padding: 10px 18px; border-radius: 999px; font-size: 14px; font-weight: 600; background: rgba(255,255,255,0.1); color: ${highlightColor}; border: 1px solid ${highlightColor};">
                  ${friendlyStatus}
                </span>
                <p style="margin: 18px 0 0 0; color: #94a3b8; font-size: 14px;">${args.details}</p>
              </div>

              <p style="font-size: 13px; color: rgba(226,232,240,0.7);">Essa mensagem foi enviada automaticamente pelo ProjecTrak.</p>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  const text = `
Olá ${args.userName},

A tarefa "${args.taskTitle}" teve o status atualizado para ${friendlyStatus}.
${args.projectName ? `Projeto: ${args.projectName}` : ''}
${args.assigneeName ? `Responsável: ${args.assigneeName}` : ''}

Detalhes: ${args.details}
Workspace: ${args.workgroupName}

Mensagem automática do ProjecTrak.
  `.trim();

  return { html, text };
};
