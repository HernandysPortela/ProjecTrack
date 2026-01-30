export const generateDigestEmail = (args: {
  userName: string;
  workgroupName: string;
  notifications: Array<{
    event: string;
    entityType: string;
    entityName: string;
    details: string;
    createdAt: number;
  }>;
  frequency: string;
}) => {
  const notificationsList = args.notifications
    .map(
      (n) => `
      <div style="background: rgba(99,102,241,0.08); border: 1px solid rgba(99,102,241,0.3); border-radius: 10px; padding: 16px; margin-bottom: 12px;">
        <p style="margin: 0 0 8px 0; font-weight: 600; color: #fff; font-size: 15px;">${n.entityName}</p>
        <p style="margin: 0 0 8px 0; font-size: 14px; color: #cbd5f5;">${n.details}</p>
        <p style="margin: 0; font-size: 12px; color: #94a3b8;">${new Date(n.createdAt).toLocaleString("pt-BR")}</p>
      </div>
    `
    )
    .join("");

  const notificationsText = args.notifications
    .map(
      (n) => `
- ${n.entityName}
  ${n.details}
  ${new Date(n.createdAt).toLocaleString("pt-BR")}
    `
    )
    .join("\n");

  const frequencyLabel = args.frequency === "daily" ? "Diário" : "Semanal";

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Resumo ProjecTrak</title>
      </head>
      <body style="font-family: 'Segoe UI', Arial, sans-serif; background: #0f172a; color: #e2e8f0; padding: 24px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 640px; margin: 0 auto; background: #0f172a;">
          <tr>
            <td style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 32px; border-radius: 18px 18px 0 0; text-align: center;">
              <p style="margin: 0; letter-spacing: 4px; font-size: 13px; text-transform: uppercase; color: rgba(255,255,255,0.8);">Workspace ${args.workgroupName}</p>
              <h1 style="margin: 12px 0 0; font-size: 30px; color: #fff;">📊 Resumo ${frequencyLabel}</h1>
            </td>
          </tr>
          <tr>
            <td style="background: #0b1120; border: 1px solid rgba(148,163,184,0.2); border-top: none; border-radius: 0 0 18px 18px; padding: 32px;">
              <p style="font-size: 16px; color: #e2e8f0; margin: 0 0 16px 0;">Olá ${args.userName},</p>
              <p style="font-size: 15px; color: #cbd5f5; margin: 0 0 24px 0;">Aqui está o seu resumo ${frequencyLabel.toLowerCase()}:</p>

              <div style="margin-bottom: 24px;">
                <h3 style="color: #fff; margin: 0 0 16px 0; font-size: 18px;">${args.notifications.length} Atualizações</h3>
                ${notificationsList}
              </div>

              <p style="font-size: 13px; color: rgba(226,232,240,0.7);">Essa mensagem foi enviada automaticamente pelo ProjecTrak.</p>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  const text = `
Resumo ${frequencyLabel} ProjecTrak

Olá ${args.userName},

Aqui está o seu resumo ${frequencyLabel.toLowerCase()} para ${args.workgroupName}:

${args.notifications.length} Atualizações
${notificationsText}

Este é um resumo automático do ProjecTrak.
  `.trim();

  return { html, text };
};
