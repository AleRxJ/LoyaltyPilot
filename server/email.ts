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

/**
 * Envía email al usuario cuando su deal ha sido aprobado
 */
export async function sendDealApprovedEmail(
  email: string, 
  firstName: string, 
  lastName: string,
  dealDetails: {
    productName: string;
    dealValue: string;
    pointsEarned: number;
  }
): Promise<boolean> {
  try {
    if (!BREVO_API_KEY) {
      console.warn('BREVO_API_KEY no configurada. Email no enviado.');
      console.log(`Simulated deal approved email to: ${email}`);
      return true;
    }

    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.to = [{ email, name: `${firstName} ${lastName}` }];
    sendSmtpEmail.sender = { email: FROM_EMAIL, name: 'Loyalty Program Platform' };
    sendSmtpEmail.subject = '🎉 Deal Aprobado - Puntos Ganados';
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
          .deal-details {
            background: white;
            border: 2px solid #10b981;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
          }
          .points-badge {
            display: inline-block;
            background: #10b981;
            color: white;
            padding: 10px 20px;
            border-radius: 20px;
            font-size: 24px;
            font-weight: bold;
            margin: 10px 0;
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
          <h1>🎉 ¡Deal Aprobado!</h1>
        </div>
        <div class="content">
          <p>Hola <strong>${firstName} ${lastName}</strong>,</p>
          
          <p>¡Excelentes noticias! Tu deal ha sido aprobado y has ganado puntos.</p>
          
          <div class="deal-details">
            <h3 style="margin-top: 0; color: #10b981;">📊 Detalles del Deal</h3>
            <p><strong>Producto:</strong> ${dealDetails.productName}</p>
            <p><strong>Valor del Deal:</strong> $${dealDetails.dealValue}</p>
            <div style="text-align: center; margin: 20px 0;">
              <div class="points-badge">
                +${dealDetails.pointsEarned} puntos
              </div>
            </div>
          </div>
          
          <p>Estos puntos ya están disponibles en tu cuenta y puedes usarlos para canjear recompensas increíbles.</p>
          
          <p style="margin-top: 30px;">
            <a href="${APP_URL}" style="display: inline-block; background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px;">
              Ver Mi Dashboard
            </a>
          </p>
          
          <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">
            ¡Sigue así! Cada deal aprobado te acerca más a tus recompensas favoritas.
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
    console.log('Deal approved email sent successfully to:', email);
    return true;
  } catch (error) {
    console.error('Error sending deal approved email:', error);
    return false;
  }
}

/**
 * Envía email al usuario cuando su redención de puntos ha sido aprobada
 */
export async function sendRedemptionApprovedEmail(
  email: string,
  firstName: string,
  lastName: string,
  redemptionDetails: {
    rewardName: string;
    pointsCost: number;
    status: string;
    estimatedDeliveryDays?: number;
  }
): Promise<void> {
  try {
    if (!BREVO_API_KEY) {
      console.warn('BREVO_API_KEY no configurada. Email no enviado.');
      console.log(`Simulated redemption approved email to: ${email}`);
      return;
    }

    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.to = [{ email, name: `${firstName} ${lastName}` }];
    sendSmtpEmail.sender = { email: FROM_EMAIL, name: 'Loyalty Program Platform' };
    sendSmtpEmail.subject = '🎁 Redención Aprobada - Tu Recompensa Está en Camino';
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
            background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
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
          .reward-box {
            background: white;
            border: 2px solid #8b5cf6;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            text-align: center;
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
          <h1>🎁 ¡Redención Aprobada!</h1>
        </div>
        <div class="content">
          <p>Hola <strong>${firstName} ${lastName}</strong>,</p>
          
          <p>¡Fantástico! Tu solicitud de redención ha sido aprobada.</p>
          
          <div class="reward-box">
            <h2 style="color: #8b5cf6; margin-top: 0;">🎉 ${redemptionDetails.rewardName}</h2>
            <p style="font-size: 18px; color: #6b7280;">
              <strong>${redemptionDetails.pointsCost} puntos</strong> canjeados
            </p>
          </div>
          
          <p><strong>Estado:</strong> ${redemptionDetails.status === 'approved' ? '✅ Aprobado' : '📦 En proceso'}</p>
          
          ${redemptionDetails.estimatedDeliveryDays ? `
          <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #374151;">
              <strong>⏱️ Tiempo estimado de entrega:</strong> 
              <span style="color: #8b5cf6; font-weight: bold;">${redemptionDetails.estimatedDeliveryDays} días hábiles</span>
            </p>
          </div>
          ` : ''}
          
          <p>Recibirás más información sobre la entrega de tu recompensa próximamente.</p>
          
          <p style="margin-top: 30px;">
            <a href="${APP_URL}/rewards" style="display: inline-block; background: #8b5cf6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px;">
              Ver Mis Redenciones
            </a>
          </p>
          
          <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">
            ¡Gracias por ser parte de nuestro programa de lealtad!
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
    console.log('Redemption approved email sent successfully to:', email);
  } catch (error) {
    console.error('Error sending redemption approved email:', error);
  }
}

/**
 * Envía email al admin cuando un usuario solicita redención de puntos
 */
export async function sendRedemptionRequestToAdmin(
  adminEmail: string,
  userDetails: {
    firstName: string;
    lastName: string;
    email: string;
  },
  redemptionDetails: {
    rewardName: string;
    pointsCost: number;
    redemptionId: string;
  }
): Promise<boolean> {
  try {
    if (!BREVO_API_KEY) {
      console.warn('BREVO_API_KEY no configurada. Email no enviado.');
      console.log(`Simulated redemption request email to admin: ${adminEmail}`);
      return true;
    }

    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.to = [{ email: adminEmail, name: 'Admin' }];
    sendSmtpEmail.sender = { email: FROM_EMAIL, name: 'Loyalty Program Platform' };
    sendSmtpEmail.subject = '🔔 Nueva Solicitud de Redención de Puntos';
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
            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
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
          .info-box {
            background: white;
            border-left: 4px solid #f59e0b;
            padding: 15px;
            margin: 15px 0;
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
          <h1>🔔 Nueva Solicitud de Redención</h1>
        </div>
        <div class="content">
          <p>Hola Admin,</p>
          
          <p>Un usuario ha solicitado redimir puntos. Por favor, revisa y procesa esta solicitud.</p>
          
          <div class="info-box">
            <h3 style="margin-top: 0; color: #f59e0b;">👤 Usuario</h3>
            <p><strong>Nombre:</strong> ${userDetails.firstName} ${userDetails.lastName}</p>
            <p><strong>Email:</strong> ${userDetails.email}</p>
          </div>
          
          <div class="info-box">
            <h3 style="margin-top: 0; color: #f59e0b;">🎁 Detalles de Redención</h3>
            <p><strong>Recompensa:</strong> ${redemptionDetails.rewardName}</p>
            <p><strong>Puntos:</strong> ${redemptionDetails.pointsCost}</p>
            <p><strong>ID Redención:</strong> ${redemptionDetails.redemptionId}</p>
          </div>
          
          <p style="margin-top: 30px;">
            <a href="${APP_URL}/admin" style="display: inline-block; background: #f59e0b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px;">
              Ir al Panel Admin
            </a>
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
    console.log('Redemption request email sent successfully to admin:', adminEmail);
    return true;
  } catch (error) {
    console.error('Error sending redemption request email to admin:', error);
    return false;
  }
}

/**
 * Envía email al admin cuando un usuario crea un ticket de soporte
 */
export async function sendSupportTicketToAdmin(
  adminEmail: string,
  userDetails: {
    firstName: string;
    lastName: string;
    email: string;
  },
  ticketDetails: {
    subject: string;
    message: string;
    ticketId: string;
  }
): Promise<boolean> {
  try {
    if (!BREVO_API_KEY) {
      console.warn('BREVO_API_KEY no configurada. Email no enviado.');
      console.log(`Simulated support ticket email to admin: ${adminEmail}`);
      return true;
    }

    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.to = [{ email: adminEmail, name: 'Admin' }];
    sendSmtpEmail.sender = { email: FROM_EMAIL, name: 'Loyalty Program Platform' };
    sendSmtpEmail.subject = '🎫 Nuevo Ticket de Soporte';
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
            background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
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
          .info-box {
            background: white;
            border-left: 4px solid #ef4444;
            padding: 15px;
            margin: 15px 0;
          }
          .ticket-message {
            background: #fef2f2;
            border: 1px solid #fecaca;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
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
          <h1>🎫 Nuevo Ticket de Soporte</h1>
        </div>
        <div class="content">
          <p>Hola Admin,</p>
          
          <p>Un usuario ha creado un nuevo ticket de soporte que requiere tu atención.</p>
          
          <div class="info-box">
            <h3 style="margin-top: 0; color: #ef4444;">👤 Usuario</h3>
            <p><strong>Nombre:</strong> ${userDetails.firstName} ${userDetails.lastName}</p>
            <p><strong>Email:</strong> ${userDetails.email}</p>
          </div>
          
          <div class="info-box">
            <h3 style="margin-top: 0; color: #ef4444;">🎫 Detalles del Ticket</h3>
            <p><strong>ID Ticket:</strong> ${ticketDetails.ticketId}</p>
            <p><strong>Asunto:</strong> ${ticketDetails.subject}</p>
          </div>
          
          <div class="ticket-message">
            <h4 style="margin-top: 0;">💬 Mensaje:</h4>
            <p>${ticketDetails.message}</p>
          </div>
          
          <p style="margin-top: 30px;">
            <a href="${APP_URL}/admin" style="display: inline-block; background: #ef4444; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px;">
              Ir a Tickets de Soporte
            </a>
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
    console.log('Support ticket email sent successfully to admin:', adminEmail);
    return true;
  } catch (error) {
    console.error('Error sending support ticket email to admin:', error);
    return false;
  }
}

export interface MagicLinkEmailData {
  email: string;
  firstName: string;
  lastName: string;
  loginToken: string;
}

/**
 * Envía un email con magic link para acceso sin contraseña
 */
export async function sendMagicLinkEmail(data: MagicLinkEmailData): Promise<boolean> {
  try {
    if (!BREVO_API_KEY) {
      console.warn('BREVO_API_KEY no configurada. Email no enviado.');
      console.log('Simulated magic link email to:', data.email);
      console.log('Magic link:', `${APP_URL}/login/magic?token=${data.loginToken}`);
      return true; // Simular éxito en desarrollo
    }

    const magicLink = `${APP_URL}/login/magic?token=${data.loginToken}`;
    
    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.to = [{ email: data.email, name: `${data.firstName} ${data.lastName}` }];
    sendSmtpEmail.sender = { email: FROM_EMAIL, name: 'Loyalty Program Platform' };
    sendSmtpEmail.subject = '🔐 Tu enlace de acceso a LoyaltyPilot';
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
              border-radius: 0 0 10px 10px;
            }
            .button {
              display: inline-block;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white !important;
              padding: 15px 30px;
              text-decoration: none;
              border-radius: 5px;
              margin: 20px 0;
              font-weight: bold;
            }
            .footer {
              margin-top: 30px;
              text-align: center;
              color: #6b7280;
              font-size: 12px;
            }
            .warning {
              background: #fef3c7;
              border-left: 4px solid #f59e0b;
              padding: 15px;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🔐 Acceso sin Contraseña</h1>
          </div>
          <div class="content">
            <p>Hola ${data.firstName},</p>
            
            <p>Has solicitado acceder a tu cuenta sin contraseña. Haz clic en el siguiente botón para iniciar sesión:</p>
            
            <div style="text-align: center;">
              <a href="${magicLink}" class="button">Acceder Ahora</a>
            </div>
            
            <p style="margin-top: 20px; font-size: 14px; color: #6b7280;">
              O copia y pega este enlace en tu navegador:<br>
              <a href="${magicLink}">${magicLink}</a>
            </p>
            
            <div class="warning">
              <p style="margin: 0;"><strong>⏰ Importante:</strong></p>
              <ul style="margin: 10px 0 0 0; padding-left: 20px;">
                <li>Este enlace expira en <strong>15 minutos</strong></li>
                <li>Solo puede usarse <strong>una vez</strong></li>
                <li>Si no solicitaste este acceso, ignora este email</li>
              </ul>
            </div>
          </div>
          <div class="footer">
            <p>Este es un correo automático, por favor no respondas a este mensaje.</p>
            <p>&copy; ${new Date().getFullYear()} Loyalty Program Platform. Todos los derechos reservados.</p>
          </div>
        </body>
        </html>
      `;
    sendSmtpEmail.textContent = `
Hola ${data.firstName},

Has solicitado acceder a tu cuenta sin contraseña.

Para iniciar sesión, visita el siguiente enlace:
${magicLink}

IMPORTANTE:
- Este enlace expira en 15 minutos
- Solo puede usarse una vez
- Si no solicitaste este acceso, ignora este email

Saludos,
Loyalty Program Platform
      `.trim();

    await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('Magic link email sent successfully to:', data.email);
    return true;
  } catch (error) {
    console.error('Error sending magic link email:', error);
    return false;
  }
}
