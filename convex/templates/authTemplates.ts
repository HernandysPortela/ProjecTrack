export const generateOtpEmail = (token: string) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
      <div style="max-width: 400px; margin: 0 auto; text-align: center;">
        <h2 style="color: #667eea;">Código de Verificação</h2>
        <p style="font-size: 16px;">Seu código de verificação é:</p>
        <h1 style="font-size: 32px; letter-spacing: 5px; background: #f3f4f6; padding: 10px; border-radius: 8px;">${token}</h1>
        <p style="font-size: 14px; color: #666;">Este código expira em 15 minutos.</p>
      </div>
    </body>
    </html>
  `;

  const text = `
Código de Verificação

Seu código de verificação é: ${token}

Este código expira em 15 minutos.
  `.trim();

  return { html, text };
};

export const generatePasswordResetConfirmationEmail = (userName: string) => {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Senha Alterada com Sucesso</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">ProjecTrak</h1>
        </div>
        
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0;">
          <h2 style="color: #667eea; margin-top: 0;">Senha Alterada</h2>
          
          <p style="font-size: 16px;">Olá ${userName},</p>
          
          <p style="font-size: 16px;">Sua senha foi alterada com sucesso.</p>
          <p style="font-size: 14px; color: #666;">Se você não realizou esta alteração, entre em contato com o suporte imediatamente.</p>
          
          <p style="font-size: 14px; color: #666; margin-top: 30px;">
            Esta é uma notificação automática do ProjecTrak.
          </p>
        </div>
        
        <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
          <p>© ${new Date().getFullYear()} ProjecTrak. Todos os direitos reservados.</p>
        </div>
      </body>
    </html>
  `;

  const text = `
Senha Alterada com Sucesso

Olá ${userName},

Sua senha foi alterada com sucesso.
Se você não realizou esta alteração, entre em contato com o suporte imediatamente.

Esta é uma notificação automática do ProjecTrak.
  `.trim();

  return { html, text };
};
