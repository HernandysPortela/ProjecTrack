export const generateInviteEmail = (args: {
  name: string;
  inviterName: string;
  inviteLink: string;
  workgroupName?: string;
  roleName?: string;
}) => {
  const workgroupName = args.workgroupName || "Workspace";
  const roleName = args.roleName || "Colaborador";

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Convite para ProjecTrak</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f7;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f7; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);">
                
                <!-- Cabeçalho com gradiente -->
                <tr>
                  <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 50px 40px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0 0 10px 0; font-size: 36px; font-weight: 700; letter-spacing: -0.5px;">ProjecTrak</h1>
                    <div style="background-color: rgba(255, 255, 255, 0.2); display: inline-block; padding: 8px 20px; border-radius: 20px; margin-top: 10px;">
                      <p style="color: #ffffff; margin: 0; font-size: 15px; font-weight: 500;">✉️ Você recebeu um convite!</p>
                    </div>
                  </td>
                </tr>
                
                <!-- Conteúdo principal -->
                <tr>
                  <td style="padding: 50px 40px;">
                    <h2 style="color: #1a1a1a; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;">Olá, ${args.name}! 👋</h2>
                    
                    <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                      <strong style="color: #667eea;">${args.inviterName}</strong> convidou você para se juntar ao workspace <strong style="color: #667eea;">${workgroupName}</strong> no <strong>ProjecTrak</strong>!
                    </p>

                    <!-- Detalhes do convite -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 25px 0; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
                      <tr>
                        <td style="padding: 20px; background: linear-gradient(135deg, #f8f9ff 0%, #f0f1ff 100%);">
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="padding: 8px 0;">
                                <span style="color: #6b7280; font-size: 13px;">📋 Workspace:</span>
                                <span style="color: #1a1a1a; font-size: 14px; font-weight: 600; margin-left: 8px;">${workgroupName}</span>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0; border-top: 1px solid #e5e7eb;">
                                <span style="color: #6b7280; font-size: 13px;">👤 Sua função:</span>
                                <span style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; padding: 3px 12px; border-radius: 12px; font-size: 13px; font-weight: 600; margin-left: 8px;">${roleName}</span>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0; border-top: 1px solid #e5e7eb;">
                                <span style="color: #6b7280; font-size: 13px;">⏰ Válido por:</span>
                                <span style="color: #1a1a1a; font-size: 14px; font-weight: 500; margin-left: 8px;">7 dias</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Destaques de recursos -->
                    <div style="background: linear-gradient(135deg, #f8f9ff 0%, #f3f4ff 100%); border-left: 4px solid #667eea; padding: 20px; border-radius: 8px; margin: 30px 0;">
                      <p style="color: #4a4a4a; font-size: 15px; line-height: 1.7; margin: 0 0 15px 0; font-weight: 500;">
                        🚀 O que você pode fazer no ProjecTrak:
                      </p>
                      <ul style="color: #4a4a4a; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
                        <li>Colaborar em projetos com sua equipe</li>
                        <li>Gerenciar tarefas com quadros Kanban</li>
                        <li>Acompanhar o progresso em tempo real</li>
                        <li>Receber notificações e lembretes</li>
                      </ul>
                    </div>
                    
                    <!-- Botão de ação -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 35px 0;">
                      <tr>
                        <td align="center">
                          <a href="${args.inviteLink}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; padding: 16px 45px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
                            ✨ Aceitar Convite e Cadastrar
                          </a>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Link alternativo -->
                    <p style="color: #9ca3af; font-size: 13px; line-height: 1.5; margin: 25px 0 0 0; text-align: center;">
                      Se o botão não funcionar, copie e cole este link no seu navegador:<br>
                      <a href="${args.inviteLink}" style="color: #667eea; word-break: break-all;">${args.inviteLink}</a>
                    </p>
                  </td>
                </tr>
                
                <!-- Rodapé -->
                <tr>
                  <td style="background-color: #f9fafb; padding: 30px 40px; border-top: 1px solid #e5e7eb;">
                    <p style="color: #9ca3af; font-size: 12px; line-height: 1.5; margin: 0 0 10px 0; text-align: center;">
                      Este convite expira em 7 dias. Se você não esperava este convite, pode ignorar este email com segurança.
                    </p>
                    <p style="color: #d1d5db; font-size: 11px; margin: 0; text-align: center;">
                      © ${new Date().getFullYear()} ProjecTrak. Todos os direitos reservados.
                    </p>
                  </td>
                </tr>
                
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  const text = `
Convite para ProjecTrak

Olá, ${args.name}! 👋

${args.inviterName} convidou você para se juntar ao workspace "${workgroupName}" no ProjecTrak!

📋 Detalhes do convite:
• Workspace: ${workgroupName}
• Sua função: ${roleName}
• Válido por: 7 dias

🚀 O que você pode fazer no ProjecTrak:
• Colaborar em projetos com sua equipe
• Gerenciar tarefas com quadros Kanban
• Acompanhar o progresso em tempo real
• Receber notificações e lembretes

Aceite o convite e cadastre-se acessando:
${args.inviteLink}

Este convite expira em 7 dias. Se você não esperava este convite, pode ignorar este email com segurança.

© ${new Date().getFullYear()} ProjecTrak. Todos os direitos reservados.
  `.trim();

  return { html, text };
};
