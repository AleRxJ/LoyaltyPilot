import axios from 'axios';

interface EMBlueAuthResponse {
  success: boolean;
  token?: string;
  error?: string;
}

interface SendEmailParams {
  to: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
}

class EMBlueService {
  private baseUrl = 'https://api.embluemail.com/Services/Emblue3Service.svc/json';
  private token: string | null = null;
  private tokenExpiry: Date | null = null;

  private async authenticate(): Promise<EMBlueAuthResponse> {
    try {
      const response = await axios.post(`${this.baseUrl}/Authenticate`, {
        username: process.env.EMBLUE_USERNAME,
        password: process.env.EMBLUE_PASSWORD
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.data && response.data.Token) {
        this.token = response.data.Token;
        // Token expires after 30 minutes
        this.tokenExpiry = new Date(Date.now() + 25 * 60 * 1000); // 25 minutes to be safe
        return { success: true, token: this.token };
      } else {
        return { success: false, error: 'Authentication failed' };
      }
    } catch (error: any) {
      console.error('EMBlue authentication error:', error);
      return { 
        success: false, 
        error: error.response?.data?.Message || error.message 
      };
    }
  }

  private async ensureAuthenticated(): Promise<boolean> {
    // Check if token exists and is not expired
    if (this.token && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return true;
    }

    // Authenticate if no valid token
    const authResult = await this.authenticate();
    return authResult.success;
  }

  async sendWelcomeEmail(userEmail: string, firstName: string, lastName: string): Promise<boolean> {
    try {
      // Ensure we have a valid token
      if (!(await this.ensureAuthenticated())) {
        console.error('Failed to authenticate with EMBlue');
        return false;
      }

      const subject = '¡Bienvenido! Tu cuenta ha sido aprobada';
      const htmlContent = `
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
            <h1 style="color: #28a745; text-align: center;">¡Cuenta Aprobada!</h1>
            
            <p>Estimado/a <strong>${firstName} ${lastName}</strong>,</p>
            
            <p>¡Excelentes noticias! Tu cuenta en el Programa de Lealtad ha sido aprobada por nuestro equipo administrativo.</p>
            
            <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
              <h3 style="color: #28a745; margin-top: 0;">¿Qué puedes hacer ahora?</h3>
              <ul style="line-height: 1.6;">
                <li>Registrar deals y ganar puntos por tus ventas</li>
                <li>Canjear puntos por increíbles recompensas</li>
                <li>Acceder a tu panel de control personalizado</li>
                <li>Ver tu progreso y estadísticas en tiempo real</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.BASE_URL || 'https://loyalty-platform.replit.app'}" 
                 style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                Acceder a mi cuenta
              </a>
            </div>
            
            <p>Si tienes alguna pregunta, no dudes en contactar a nuestro equipo de soporte.</p>
            
            <p style="margin-top: 30px;">
              Saludos cordiales,<br>
              <strong>Equipo del Programa de Lealtad</strong>
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #6c757d; font-size: 12px;">
            <p>Este es un email automático, por favor no responder directamente.</p>
          </div>
        </body>
        </html>
      `;

      const textContent = `
¡Cuenta Aprobada!

Estimado/a ${firstName} ${lastName},

¡Excelentes noticias! Tu cuenta en el Programa de Lealtad ha sido aprobada por nuestro equipo administrativo.

¿Qué puedes hacer ahora?
- Registrar deals y ganar puntos por tus ventas
- Canjear puntos por increíbles recompensas  
- Acceder a tu panel de control personalizado
- Ver tu progreso y estadísticas en tiempo real

Puedes acceder a tu cuenta en: ${process.env.BASE_URL || 'https://loyalty-platform.replit.app'}

Si tienes alguna pregunta, no dudes en contactar a nuestro equipo de soporte.

Saludos cordiales,
Equipo del Programa de Lealtad

Este es un email automático, por favor no responder directamente.
      `;

      return await this.sendEmail({
        to: userEmail,
        subject,
        htmlContent,
        textContent
      });

    } catch (error) {
      console.error('Error sending welcome email:', error);
      return false;
    }
  }

  private async sendEmail(params: SendEmailParams): Promise<boolean> {
    try {
      if (!(await this.ensureAuthenticated())) {
        return false;
      }

      // EMBlue SendMailExpress API call
      const response = await axios.post(`${this.baseUrl}/SendMailExpress`, {
        token: this.token,
        recipientEmail: params.to,
        fromEmail: process.env.EMBLUE_FROM_EMAIL,
        subject: params.subject,
        htmlBody: params.htmlContent,
        textBody: params.textContent || '',
        campaignName: 'User Approval Notification'
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.data && response.data.Code === 0) {
        console.log(`Email sent successfully to ${params.to}`);
        return true;
      } else {
        console.error('EMBlue send email error:', response.data);
        return false;
      }

    } catch (error: any) {
      console.error('Error sending email via EMBlue:', error);
      return false;
    }
  }

  // Test connection to EMBlue API
  async testConnection(): Promise<boolean> {
    try {
      const response = await axios.post(`${this.baseUrl}/CheckConnection`, {}, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      return response.status === 200;
    } catch (error) {
      console.error('EMBlue connection test failed:', error);
      return false;
    }
  }
}

// Singleton instance
export const emblueService = new EMBlueService();