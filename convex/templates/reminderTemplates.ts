export const generateReminderEmail = (args: {
  userName: string;
  taskTitle: string;
  projectName: string;
  dueDate: number;
  isOverdue: boolean;
  hoursUntilDue?: number;
}) => {
  const dueDateTime = new Date(args.dueDate);
  const formattedDate = dueDateTime.toLocaleDateString("pt-BR");
  const formattedTime = dueDateTime.toLocaleTimeString("pt-BR");

  let timeMessage = "";
  let timeMessageText = "";
  let statusColor = "#f97316";
  
  if (args.isOverdue) {
    const overdueDays = Math.floor((Date.now() - args.dueDate) / (1000 * 60 * 60 * 24));
    timeMessage = `Esta tarefa está atrasada há ${overdueDays} dia${overdueDays !== 1 ? 's' : ''}`;
    timeMessageText = `Esta tarefa está atrasada há ${overdueDays} dia${overdueDays !== 1 ? 's' : ''}`;
    statusColor = "#ef4444";
  } else if (args.hoursUntilDue !== undefined) {
    if (args.hoursUntilDue < 24) {
      timeMessage = `Esta tarefa vence em ${args.hoursUntilDue} horas`;
      timeMessageText = `Esta tarefa vence em ${args.hoursUntilDue} horas`;
      statusColor = "#f97316";
    } else {
      const days = Math.floor(args.hoursUntilDue / 24);
      timeMessage = `Esta tarefa vence em ${days} dia${days !== 1 ? 's' : ''}`;
      timeMessageText = `Esta tarefa vence em ${days} dia${days !== 1 ? 's' : ''}`;
      statusColor = "#f59e0b";
    }
  }

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Lembrete de Tarefa ProjecTrak</title>
      </head>
      <body style="font-family: 'Segoe UI', Arial, sans-serif; background: #0f172a; color: #e2e8f0; padding: 24px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 640px; margin: 0 auto; background: #0f172a;">
          <tr>
            <td style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 32px; border-radius: 18px 18px 0 0; text-align: center;">
              <p style="margin: 0; letter-spacing: 4px; font-size: 13px; text-transform: uppercase; color: rgba(255,255,255,0.8);">Projeto ${args.projectName}</p>
              <h1 style="margin: 12px 0 0; font-size: 30px; color: #fff;">${args.isOverdue ? '⚠️ Tarefa Atrasada' : '⏰ Lembrete de Tarefa'}</h1>
            </td>
          </tr>
          <tr>
            <td style="background: #0b1120; border: 1px solid rgba(148,163,184,0.2); border-top: none; border-radius: 0 0 18px 18px; padding: 32px;">
              <p style="font-size: 16px; color: #e2e8f0; margin: 0 0 16px 0;">Olá ${args.userName},</p>
              <p style="font-size: 15px; color: #cbd5f5; margin: 0 0 24px 0;">${args.isOverdue ? 'Uma tarefa está atrasada:' : 'Lembrete de prazo:'}</p>

              <div style="background: rgba(99,102,241,0.08); border: 1px solid rgba(99,102,241,0.3); border-radius: 14px; padding: 20px; margin-bottom: 24px;">
                <p style="margin: 0 0 10px 0; font-size: 14px; letter-spacing: 2px; text-transform: uppercase; color: rgba(148,163,184,0.8);">Tarefa</p>
                <h2 style="margin: 0 0 12px 0; font-size: 22px; color: #fff;">${args.taskTitle}</h2>
                ${args.projectName ? `<p style="margin: 0 0 12px 0; color: #cbd5f5; font-size: 14px;"><strong>Projeto:</strong> ${args.projectName}</p>` : ''}
                <p style="margin: 0 0 12px 0; color: #cbd5f5; font-size: 14px;"><strong>Vencimento:</strong> ${formattedDate} às ${formattedTime}</p>
                <span style="display: inline-block; padding: 10px 18px; border-radius: 999px; font-size: 14px; font-weight: 600; background: rgba(255,255,255,0.1); color: ${statusColor}; border: 1px solid ${statusColor};">
                  ${timeMessage}
                </span>
              </div>

              <p style="font-size: 13px; color: rgba(226,232,240,0.7);">Essa mensagem foi enviada automaticamente pelo ProjecTrak.</p>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  const text = `
ProjecTrak ${args.isOverdue ? '⚠️ Tarefa Atrasada' : '⏰ Lembrete de Tarefa'}

Olá ${args.userName},

${args.taskTitle}
Projeto: ${args.projectName}
Vencimento: ${formattedDate} às ${formattedTime}
${timeMessageText}

Este é um lembrete automático do ProjecTrak.
  `.trim();

  return { html, text };
};
