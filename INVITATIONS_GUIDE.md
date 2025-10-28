# Gestión de Usuarios y Acceso - Sistema de Invitaciones

## Descripción

Este módulo implementa un sistema completo de gestión de usuarios con invitaciones por email, permitiendo a los administradores controlar quién puede acceder a la plataforma del Programa de Lealtad.

## Características Principales

### 1. Invitación de Usuarios Individual
- Los administradores pueden invitar usuarios individualmente por email
- Cada invitación incluye:
  - Email del usuario
  - Nombre y apellido
  - País
  - Token único de invitación

### 2. Invitación Masiva por CSV
- Importación de múltiples usuarios mediante archivo CSV/Excel
- Plantilla descargable para facilitar el formato correcto
- Validación automática de datos
- Reporte detallado de éxitos y fallos

### 3. Flujo de Registro
1. **Admin invita** → Usuario recibe email con link único
2. **Usuario completa registro** → Elige username y password
3. **Espera aprobación** → El admin debe aprobar la cuenta
4. **Cuenta aprobada** → Usuario recibe email de confirmación y puede acceder

### 4. Emails Automáticos
- **Email de Invitación**: Con link personalizado para completar registro
- **Email de Bienvenida**: Después de completar el registro
- **Email de Aprobación**: Cuando el admin aprueba la cuenta

## Configuración

### Variables de Entorno

Agrega las siguientes variables a tu archivo `.env`:

```env
# Configuración de SendGrid
SENDGRID_API_KEY=your_sendgrid_api_key_here
FROM_EMAIL=noreply@yourdomain.com

# URL de la aplicación
APP_URL=http://localhost:5000
```

### Obtener API Key de SendGrid

1. Crea una cuenta en [SendGrid](https://sendgrid.com/)
2. Ve a Settings → API Keys
3. Crea una nueva API key con permisos de envío de correo
4. Copia la key y agrégala a tu archivo `.env`

**Nota**: Si no configuras SendGrid, el sistema funcionará en modo simulado (los emails se mostrarán en la consola pero no se enviarán realmente).

## Uso

### Panel de Administración

1. **Accede al panel de Admin**
   - Inicia sesión como administrador
   - Ve a la sección "Admin"

2. **Tab "Invitations"**
   - Aquí puedes gestionar todas las invitaciones

### Invitar un Usuario Individual

1. Click en botón **"Invitar Usuario"**
2. Completa el formulario:
   - Email
   - Nombre
   - Apellido
   - País
3. Click en **"Enviar Invitación"**
4. El usuario recibirá un email con instrucciones

### Invitar Múltiples Usuarios (CSV)

1. Click en botón **"Importar CSV"**
2. (Opcional) Descarga la plantilla CSV
3. Completa el archivo con los datos:
   ```csv
   email,firstName,lastName,country
   usuario1@ejemplo.com,Juan,Pérez,México
   usuario2@ejemplo.com,María,García,Colombia
   ```
4. Sube el archivo
5. Revisa la vista previa
6. Click en **"Enviar X Invitaciones"**

### Aprobar Usuarios Registrados

1. Los usuarios que completaron su registro aparecen en "Usuarios Pendientes"
2. En el tab **"Pending Users"**:
   - Revisa la lista de usuarios pendientes
   - Click en **"Approve"** para aprobar
   - Click en **"Reject"** para rechazar
3. Al aprobar, el usuario recibirá un email de confirmación

## Endpoints API

### POST `/api/admin/users/invite`
Invita a un usuario individual.

**Body:**
```json
{
  "email": "usuario@ejemplo.com",
  "firstName": "Juan",
  "lastName": "Pérez",
  "country": "México"
}
```

### POST `/api/admin/users/invite-bulk`
Invita a múltiples usuarios.

**Body:**
```json
{
  "users": [
    {
      "email": "usuario1@ejemplo.com",
      "firstName": "Juan",
      "lastName": "Pérez",
      "country": "México"
    },
    {
      "email": "usuario2@ejemplo.com",
      "firstName": "María",
      "lastName": "García",
      "country": "Colombia"
    }
  ]
}
```

### POST `/api/auth/register-with-token`
Completa el registro con un token de invitación.

**Body:**
```json
{
  "inviteToken": "abc123...",
  "username": "juanperez",
  "password": "securepassword123"
}
```

### GET `/api/auth/verify-invite/:token`
Verifica si un token de invitación es válido.

**Response:**
```json
{
  "valid": true,
  "user": {
    "email": "usuario@ejemplo.com",
    "firstName": "Juan",
    "lastName": "Pérez",
    "country": "México"
  }
}
```

## Seguridad

### Tokens de Invitación
- Cada token es único (32 caracteres generados con nanoid)
- Los tokens se almacenan en la base de datos
- Un token solo puede usarse una vez
- Los tokens no tienen expiración (puedes agregar esta funcionalidad si la necesitas)

### Validaciones
- Email único: No se pueden enviar invitaciones a emails ya registrados
- Username único: Durante el registro se valida que el username no exista
- Solo admins pueden enviar invitaciones
- Los usuarios deben ser aprobados por un admin antes de poder acceder

## Formato del CSV

El archivo CSV debe tener las siguientes columnas (puede ser .csv, .xlsx, o .xls):

```csv
email,firstName,lastName,country
usuario1@ejemplo.com,Juan,Pérez,México
usuario2@ejemplo.com,María,García,Colombia
```

### Columnas Aceptadas (case-insensitive)
- **email**: Email, EMAIL, email
- **firstName**: firstName, FirstName, first_name, First Name
- **lastName**: lastName, LastName, last_name, Last Name
- **country**: country, Country, COUNTRY

## Personalización de Emails

Los templates de email están en `server/email.ts`. Puedes personalizarlos según tus necesidades:

- `sendInviteEmail()`: Email de invitación inicial
- `sendWelcomeEmail()`: Email después de completar registro
- `sendApprovalEmail()`: Email de aprobación de cuenta

## Troubleshooting

### Los emails no se envían
- Verifica que `SENDGRID_API_KEY` esté configurada correctamente
- Revisa la consola del servidor para ver los logs
- Verifica que el email `FROM_EMAIL` esté verificado en SendGrid

### Error "Email already exists"
- El email ya está registrado en el sistema
- No puedes enviar una nueva invitación a ese email

### Token inválido o expirado
- El token ya fue usado
- Verifica que el link sea correcto
- Contacta al administrador para una nueva invitación

## Próximas Mejoras

- [ ] Expiración de tokens de invitación (ej: 7 días)
- [ ] Re-enviar invitaciones
- [ ] Cancelar invitaciones pendientes
- [ ] Dashboard con estadísticas de invitaciones
- [ ] Personalización de templates por país/idioma
- [ ] Notificaciones en la app cuando hay usuarios pendientes

## Soporte

Para reportar problemas o solicitar nuevas funcionalidades, contacta al equipo de desarrollo.
