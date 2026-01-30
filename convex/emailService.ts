"use node";
import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import nodemailer from "nodemailer";
import { generateOtpEmail, generatePasswordResetConfirmationEmail } from "./templates/authTemplates";
import { generateNotificationEmail, generateTaskStatusUpdateEmail } from "./templates/notificationTemplates";
import { generateDigestEmail } from "./templates/digestTemplates";
import { generateReminderEmail } from "./templates/reminderTemplates";
import { generateInviteEmail } from "./templates/inviteTemplates";

// Helper function to send email using Nodemailer directly
async function sendEmailNode(to: string, subject: string, html: string, text?: string) {
  const emailUser = process.env.GMAIL_USER || process.env.EMAIL_USER;
  const emailPassword = process.env.GMAIL_PASS || process.env.EMAIL_PASSWORD;

  if (!emailUser || !emailPassword) {
    console.error("GMAIL_USER/GMAIL_PASS (or EMAIL_USER/EMAIL_PASSWORD) not set. Cannot send email.");
    return { messageId: null, error: "Missing credentials" };
  }

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: emailUser,
        pass: emailPassword,
      },
    });

    const info = await transporter.sendMail({
      from: `"ProjecTrak" <${emailUser}>`,
      to,
      subject,
      html,
      text,
    });

    console.log("Email sent: %s", info.messageId);
    return { messageId: info.messageId };
  } catch (error) {
    console.error("Error sending email:", error);
    return { messageId: null, error: String(error) };
  }
}

export const sendEmail = internalAction({
  args: {
    to: v.string(),
    subject: v.string(),
    html: v.string(),
    text: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await sendEmailNode(args.to, args.subject, args.html, args.text);
  },
});

// Send immediate notification email
export const sendNotificationEmail = internalAction({
  args: {
    userId: v.id("users"),
    email: v.string(),
    userName: v.string(),
    event: v.string(),
    entityType: v.string(),
    entityName: v.string(),
    details: v.string(),
    workgroupName: v.string(),
    projectName: v.optional(v.string()),
    assigneeName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const subject = getEmailSubject(args.event, args.entityType, args.entityName);
    
    let emailContent;
    if (args.event === "task_status_updated") {
      emailContent = generateTaskStatusUpdateEmail({
        userName: args.userName,
        taskTitle: args.entityName,
        newStatus: extractStatusFromDetails(args.details) || "Novo Status",
        details: args.details,
        workgroupName: args.workgroupName,
        projectName: args.projectName,
        assigneeName: args.assigneeName,
      });
    } else {
      emailContent = generateNotificationEmail({
        userName: args.userName,
        event: args.event,
        entityType: args.entityType,
        entityName: args.entityName,
        details: args.details,
        workgroupName: args.workgroupName,
      });
    }

    await sendEmailNode(args.email, subject, emailContent.html, emailContent.text);
    return { success: true };
  },
});

// Send OTP email
export const sendOtpEmail = internalAction({
  args: {
    email: v.string(),
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const { html, text } = generateOtpEmail(args.token);
    await sendEmailNode(args.email, "Seu código de verificação ProjecTrak", html, text);
  },
});

// Send password reset email
export const sendPasswordResetEmail = internalAction({
  args: {
    email: v.string(),
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const { html, text } = generateOtpEmail(args.token); // Reusing OTP template for simplicity or create specific one
    await sendEmailNode(args.email, "Redefinição de Senha ProjecTrak", html, text);
  },
});

// Send digest email (daily/weekly summary)
export const sendDigestEmail = internalAction({
  args: {
    userId: v.id("users"),
    email: v.string(),
    userName: v.string(),
    workgroupName: v.string(),
    notifications: v.array(
      v.object({
        event: v.string(),
        entityType: v.string(),
        entityName: v.string(),
        details: v.string(),
        createdAt: v.number(),
      })
    ),
    frequency: v.string(),
  },
  handler: async (ctx, args) => {
    const { html, text } = generateDigestEmail({
      userName: args.userName,
      workgroupName: args.workgroupName,
      notifications: args.notifications,
      frequency: args.frequency,
    });
    
    const subject = `Resumo ${args.frequency === "daily" ? "Diário" : "Semanal"} - ${args.workgroupName}`;
    await sendEmailNode(args.email, subject, html, text);
    return { success: true };
  },
});

export const sendReminderEmail = internalAction({
  args: {
    userId: v.id("users"),
    email: v.string(),
    userName: v.string(),
    taskTitle: v.string(),
    taskId: v.string(),
    projectName: v.string(),
    dueDate: v.number(),
    isOverdue: v.boolean(),
    hoursUntilDue: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { html, text } = generateReminderEmail({
      userName: args.userName,
      taskTitle: args.taskTitle,
      projectName: args.projectName,
      dueDate: args.dueDate,
      isOverdue: args.isOverdue,
      hoursUntilDue: args.hoursUntilDue,
    });

    const subject = args.isOverdue 
      ? `⚠️ Tarefa Atrasada: ${args.taskTitle}`
      : `⏰ Lembrete de Tarefa: ${args.taskTitle}`;

    await sendEmailNode(args.email, subject, html, text);
    return { success: true };
  },
});

// Send password reset confirmation email
export const sendPasswordResetConfirmationEmail = internalAction({
  args: {
    email: v.string(),
    userName: v.string(),
  },
  handler: async (ctx, args) => {
    const { html, text } = generatePasswordResetConfirmationEmail(args.userName);
    await sendEmailNode(args.email, "Sua senha foi alterada", html, text);
  },
});

// Send invitation email
export const sendInviteEmail = internalAction({
  args: {
    email: v.string(),
    name: v.string(),
    inviterName: v.string(),
    inviteLink: v.string(),
  },
  handler: async (ctx, args) => {
    const { html, text } = generateInviteEmail({
      name: args.name,
      inviterName: args.inviterName,
      inviteLink: args.inviteLink,
    });
    
    await sendEmailNode(args.email, "Convite para participar do ProjecTrak", html, text);
    return { success: true };
  },
});

function extractStatusFromDetails(details: string): string | null {
  const match = details.match(/status atualizado para (.+)/i);
  if (!match) {
    return null;
  }
  return match[1].trim();
}

function getEmailSubject(event: string, entityType: string, entityName: string): string {
  const eventMap: Record<string, string> = {
    task_created: `Nova Tarefa Criada: ${entityName}`,
    task_updated: `Tarefa Atualizada: ${entityName}`,
    task_deleted: `Tarefa Excluída: ${entityName}`,
    task_assigned: `Tarefa Atribuída a Você: ${entityName}`,
    task_completed: `Tarefa Concluída: ${entityName}`,
    project_created: `Novo Projeto Criado: ${entityName}`,
    project_updated: `Projeto Atualizado: ${entityName}`,
    project_deleted: `Projeto Excluído: ${entityName}`,
    task_due_soon: `Tarefa Vence em Breve: ${entityName}`,
    task_overdue: `Tarefa Atrasada: ${entityName}`,
    task_status_updated: `Status da Tarefa Atualizado: ${entityName}`,
  };

  return eventMap[event] || `Notificação ProjecTrak: ${entityName}`;
}
export const sendDailySummaryEmail = internalAction({
  args: {
    userId: v.id("users"),
    email: v.string(),
    userName: v.string(),
    workgroupName: v.string(),
    overdueTasks: v.array(
      v.object({
        taskId: v.id("tasks"),
        taskTitle: v.string(),
        projectName: v.string(),
        dueDate: v.number(),
        priority: v.string(),
      })
    ),
    upcomingTasks: v.array(
      v.object({
        taskId: v.id("tasks"),
        taskTitle: v.string(),
        projectName: v.string(),
        dueDate: v.number(),
        priority: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const priorityColors: Record<string, string> = {
      high: "#ef4444",
      medium: "#f97316",
      low: "#10b981",
    };

    const formatTaskList = (tasks: typeof args.overdueTasks, isOverdue: boolean) => {
      return tasks
        .map((task) => {
          const dueDate = new Date(task.dueDate);
          const formattedDate = dueDate.toLocaleDateString("pt-BR");
          const priorityColor = priorityColors[task.priority] || "#94a3b8";
          const daysInfo = isOverdue
            ? `${Math.floor((Date.now() - task.dueDate) / (1000 * 60 * 60 * 24))} dias atrasado`
            : `Vence em ${Math.ceil((task.dueDate - Date.now()) / (1000 * 60 * 60 * 24))} dias`;

          return `
        <div style="background: rgba(99,102,241,0.08); border-left: 4px solid ${priorityColor}; border-radius: 10px; padding: 16px; margin-bottom: 12px;">
          <p style="margin: 0 0 8px 0; font-weight: 600; color: #fff; font-size: 15px;">${task.taskTitle}</p>
          <p style="margin: 0 0 4px 0; font-size: 13px; color: #cbd5f5;">📁 ${task.projectName}</p>
          <p style="margin: 0 0 4px 0; font-size: 13px; color: #cbd5f5;">📅 ${formattedDate}</p>
          <span style="display: inline-block; padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 600; background: rgba(255,255,255,0.1); color: ${priorityColor}; border: 1px solid ${priorityColor};">
            ${daysInfo}
          </span>
        </div>`;
        })
        .join("");
    };

    const overdueSection =
      args.overdueTasks.length > 0
        ? `
    <div style="margin-bottom: 32px;">
      <h3 style="color: #ef4444; margin: 0 0 16px 0; font-size: 18px;">⚠️ Tarefas Atrasadas (${args.overdueTasks.length})</h3>
      ${formatTaskList(args.overdueTasks, true)}
    </div>`
        : "";

    const upcomingSection =
      args.upcomingTasks.length > 0
        ? `
    <div style="margin-bottom: 24px;">
      <h3 style="color: #f97316; margin: 0 0 16px 0; font-size: 18px;">⏰ Próximas de Vencer (${args.upcomingTasks.length})</h3>
      ${formatTaskList(args.upcomingTasks, false)}
    </div>`
        : "";

    const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Resumo Diário ProjecTrak</title>
      </head>
      <body style="font-family: 'Segoe UI', Arial, sans-serif; background: #0f172a; color: #e2e8f0; padding: 24px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 640px; margin: 0 auto; background: #0f172a;">
          <tr>
            <td style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 32px; border-radius: 18px 18px 0 0; text-align: center;">
              <p style="margin: 0; letter-spacing: 4px; font-size: 13px; text-transform: uppercase; color: rgba(255,255,255,0.8);">Workspace ${args.workgroupName}</p>
              <h1 style="margin: 12px 0 0; font-size: 30px; color: #fff;">📋 Resumo Diário de Tarefas</h1>
            </td>
          </tr>
          <tr>
            <td style="background: #0b1120; border: 1px solid rgba(148,163,184,0.2); border-top: none; border-radius: 0 0 18px 18px; padding: 32px;">
              <p style="font-size: 16px; color: #e2e8f0; margin: 0 0 16px 0;">Olá ${args.userName},</p>
              <p style="font-size: 15px; color: #cbd5f5; margin: 0 0 24px 0;">Aqui está o resumo das suas tarefas para hoje:</p>

              ${overdueSection}
              ${upcomingSection}

              <p style="font-size: 13px; color: rgba(226,232,240,0.7); margin-top: 24px;">Este resumo é enviado automaticamente todos os dias pelo ProjecTrak.</p>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

    const formatTaskListText = (tasks: typeof args.overdueTasks, isOverdue: boolean) => {
      return tasks
        .map((task) => {
          const dueDate = new Date(task.dueDate);
          const formattedDate = dueDate.toLocaleDateString("pt-BR");
          const daysInfo = isOverdue
            ? `${Math.floor((Date.now() - task.dueDate) / (1000 * 60 * 60 * 24))} dias atrasado`
            : `Vence em ${Math.ceil((task.dueDate - Date.now()) / (1000 * 60 * 60 * 24))} dias`;

          return `- ${task.taskTitle}\n  Projeto: ${task.projectName}\n  Data: ${formattedDate}\n  ${daysInfo}`;
        })
        .join("\n\n");
    };

    const text = `
Resumo Diário ProjecTrak - ${args.workgroupName}

Olá ${args.userName},

Aqui está o resumo das suas tarefas para hoje:

${args.overdueTasks.length > 0 ? `⚠️ TAREFAS ATRASADAS (${args.overdueTasks.length}):\n${formatTaskListText(args.overdueTasks, true)}\n\n` : ""}${args.upcomingTasks.length > 0 ? `⏰ PRÓXIMAS DE VENCER (${args.upcomingTasks.length}):\n${formatTaskListText(args.upcomingTasks, false)}\n\n` : ""}
Este resumo é enviado automaticamente todos os dias pelo ProjecTrak.
  `.trim();

    const subject = `📋 Resumo Diário de Tarefas - ${args.workgroupName}`;
    await sendEmailNode(args.email, subject, html, text);
    return { success: true };
  },
});
