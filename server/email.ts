import * as brevo from '@getbrevo/brevo';

// Configurar Brevo API key
const BREVO_API_KEY = process.env.BREVO_API_KEY || '';
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@loyaltyprogram.com';
const APP_URL = process.env.APP_URL || 'http://localhost:5000';

// Inicializar cliente de Brevo
const apiInstance = new brevo.TransactionalEmailsApi();
if (BREVO_API_KEY) {
  apiInstance.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, BREVO_API_KEY);
}

export interface InviteEmailData {
  email: string;
  firstName: string;
  lastName: string;
  inviteToken: string;
  invitedBy: string;
}

/**
 * Envía un email de invitación a un nuevo usuario
 */
export async function sendInviteEmail(data: InviteEmailData): Promise<boolean> {
  try {
    if (!BREVO_API_KEY) {
      console.warn('BREVO_API_KEY no configurada. Email no enviado.');
      console.log('Simulated invite email to:', data.email);
      console.log('Invite link:', `${APP_URL}/register?token=${data.inviteToken}`);
      return true; // Simular éxito en desarrollo
    }

    const inviteLink = `${APP_URL}/register?token=${data.inviteToken}`;
    
    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.to = [{ email: data.email, name: `${data.firstName} ${data.lastName}` }];
    sendSmtpEmail.sender = { email: FROM_EMAIL, name: 'Loyalty Program Platform' };
    sendSmtpEmail.subject = '🎉 Invitación al Loyalty Program';
    sendSmtpEmail.htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 30px;
              text-align: center;
              border-radius: 10px 10px 0 0;
            }
            .content {
              background: #f9fafb;
              padding: 30px;
              border: 1px solid #e5e7eb;
            }
            .button {
              display: inline-block;
              background: #667eea;
              color: white;
              padding: 12px 30px;
              text-decoration: none;
              border-radius: 5px;
              margin: 20px 0;
              font-weight: bold;
            }
            .footer {
              background: #f3f4f6;
              padding: 20px;
              text-align: center;
              font-size: 12px;
              color: #6b7280;
              border-radius: 0 0 10px 10px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🎉 ¡Bienvenido al Loyalty Program!</h1>
          </div>
          <div class="content">
            <p>Hola <strong>${data.firstName} ${data.lastName}</strong>,</p>
            
            <p>Has sido invitado por <strong>${data.invitedBy}</strong> a unirte a nuestro <strong>Loyalty Program Platform</strong>.</p>
            
            <p>Como participante autorizado, podrás:</p>
            <ul>
              <li>📊 Registrar tus deals y acumular puntos</li>
              <li>🎁 Canjear recompensas exclusivas (e-Gift Cards y más)</li>
              <li>📈 Ver tu progreso y ventas en tiempo real</li>
              <li>🏆 Competir en el ranking de partners</li>
            </ul>
            
            <p>Para completar tu registro, haz clic en el siguiente botón:</p>
            
            <div style="text-align: center;">
              <a href="${inviteLink}" class="button">Completar Registro</a>
            </div>
            
            <p style="margin-top: 20px; font-size: 14px; color: #6b7280;">
              O copia y pega este enlace en tu navegador:<br>
              <a href="${inviteLink}">${inviteLink}</a>
            </p>
            
            <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <strong>Nota:</strong> Este enlace de invitación es único y personal. No lo compartas con otros.
            </p>
          </div>
          <div class="footer">
            <p>Este es un correo automático, por favor no respondas a este mensaje.</p>
            <p>&copy; ${new Date().getFullYear()} Loyalty Program Platform. Todos los derechos reservados.</p>
          </div>
        </body>
        </html>
      `;
    sendSmtpEmail.textContent = `
Hola ${data.firstName} ${data.lastName},

Has sido invitado por ${data.invitedBy} a unirte a nuestro Loyalty Program Platform.

Para completar tu registro, visita el siguiente enlace:
${inviteLink}

Este enlace de invitación es único y personal. No lo compartas con otros.

Saludos,
Loyalty Program Platform
      `.trim();

    await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('Invite email sent successfully to:', data.email);
    return true;
  } catch (error) {
    console.error('Error sending invite email:', error);
    return false;
  }
}

/**
 * Envía un email de bienvenida después del registro
 */
export async function sendWelcomeEmail(email: string, firstName: string, lastName: string): Promise<boolean> {
  try {
    if (!BREVO_API_KEY) {
      console.warn('BREVO_API_KEY no configurada. Email no enviado.');
      return true;
    }

    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.to = [{ email: email, name: `${firstName} ${lastName}` }];
    sendSmtpEmail.sender = { email: FROM_EMAIL, name: 'Loyalty Program Platform' };
    sendSmtpEmail.subject = '✅ Registro Completado - Loyalty Program';
    sendSmtpEmail.htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 30px;
              text-align: center;
              border-radius: 10px 10px 0 0;
            }
            .content {
              background: #f9fafb;
              padding: 30px;
              border: 1px solid #e5e7eb;
            }
            .footer {
              background: #f3f4f6;
              padding: 20px;
              text-align: center;
              font-size: 12px;
              color: #6b7280;
              border-radius: 0 0 10px 10px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>✅ ¡Registro Completado!</h1>
          </div>
          <div class="content">
            <p>Hola <strong>${firstName} ${lastName}</strong>,</p>
            
            <p>¡Gracias por completar tu registro en el <strong>Loyalty Program Platform</strong>!</p>
            
            <p>Tu cuenta está ahora en revisión por nuestro equipo administrativo. Una vez aprobada, recibirás un correo de confirmación y podrás empezar a:</p>
            <ul>
              <li>✅ Registrar tus deals</li>
              <li>✅ Acumular puntos por tus ventas</li>
              <li>✅ Canjear recompensas (e-Gift Cards y más)</li>
            </ul>
            
            <p>Normalmente este proceso toma menos de 24 horas.</p>
            
            <p style="margin-top: 30px;">
              Si tienes alguna pregunta, no dudes en contactarnos.
            </p>
          </div>
          <div class="footer">
            <p>Este es un correo automático, por favor no respondas a este mensaje.</p>
            <p>&copy; ${new Date().getFullYear()} Loyalty Program Platform. Todos los derechos reservados.</p>
          </div>
        </body>
        </html>
      `;

    await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('Welcome email sent successfully to:', email);
    return true;
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return false;
  }
}

/**
 * Envía un email de cuenta activada y lista para usar
 */
export async function sendApprovalEmail(email: string, firstName: string, lastName: string): Promise<boolean> {
  try {
    if (!BREVO_API_KEY) {
      console.warn('BREVO_API_KEY no configurada. Email no enviado.');
      return true;
    }

    const loginLink = `${APP_URL}/login`;

    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.to = [{ email: email, name: `${firstName} ${lastName}` }];
    sendSmtpEmail.sender = { email: FROM_EMAIL, name: 'Loyalty Program Platform' };
    sendSmtpEmail.subject = '✅ ¡Cuenta Activada! - Loyalty Program';
    sendSmtpEmail.htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #10b981 0%, #059669 100%);
              color: white;
              padding: 30px;
              text-align: center;
              border-radius: 10px 10px 0 0;
            }
            .content {
              background: #f9fafb;
              padding: 30px;
              border: 1px solid #e5e7eb;
            }
            .button {
              display: inline-block;
              background: #10b981;
              color: white;
              padding: 12px 30px;
              text-decoration: none;
              border-radius: 5px;
              margin: 20px 0;
              font-weight: bold;
            }
            .footer {
              background: #f3f4f6;
              padding: 20px;
              text-align: center;
              font-size: 12px;
              color: #6b7280;
              border-radius: 0 0 10px 10px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🎉 ¡Registro Completado!</h1>
          </div>
          <div class="content">
            <p>Hola <strong>${firstName} ${lastName}</strong>,</p>
            
            <p>¡Bienvenido! Tu cuenta en el <strong>Loyalty Program Platform</strong> está <strong>lista para usar</strong>.</p>
            
            <p>Ya puedes iniciar sesión y comenzar a:</p>
            <ul>
              <li>📊 Registrar tus deals y acumular puntos</li>
              <li>🎁 Canjear recompensas exclusivas (e-Gift Cards)</li>
              <li>📈 Ver tu progreso y ventas en tiempo real</li>
              <li>🏆 Competir en el ranking de partners</li>
            </ul>
            
            <div style="text-align: center;">
              <a href="${loginLink}" class="button">Iniciar Sesión Ahora</a>
            </div>
            
            <p style="margin-top: 30px;">
              ¡Bienvenido a bordo! Estamos emocionados de tenerte con nosotros.
            </p>
          </div>
          <div class="footer">
            <p>Este es un correo automático, por favor no respondas a este mensaje.</p>
            <p>&copy; ${new Date().getFullYear()} Loyalty Program Platform. Todos los derechos reservados.</p>
          </div>
        </body>
        </html>
      `;

    await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('Approval email sent successfully to:', email);
    return true;
  } catch (error) {
    console.error('Error sending approval email:', error);
    return false;
  }
}
