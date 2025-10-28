# 🎯 Guía Rápida - Sistema de Invitaciones

## ✅ ¿Qué se implementó?

Se ha desarrollado completamente el módulo de **Gestión de Usuarios y Acceso** que incluye:

1. **Invitación de usuarios por email** (individual y masiva)
2. **Sistema de registro con tokens únicos**
3. **Aprobación manual de usuarios** por admin
4. **Emails automáticos** en cada etapa del proceso
5. **Importación masiva por CSV/Excel**

## 🚀 Inicio Rápido

### 1. Configurar Variables de Entorno

Crea o edita el archivo `.env` en la raíz del proyecto:

```env
# SendGrid (para envío de emails)
SENDGRID_API_KEY=tu_api_key_aqui
FROM_EMAIL=noreply@tudominio.com

# URL de la aplicación
APP_URL=http://localhost:5000

# Base de datos y otros (ya existentes)
DATABASE_URL=tu_connection_string
SESSION_SECRET=tu_secret_key
PORT=5000
```

### 2. Obtener API Key de SendGrid (Opcional para desarrollo)

Si quieres emails reales:
1. Crea cuenta gratuita en https://sendgrid.com
2. Ve a Settings → API Keys
3. Crea nueva API key con permisos de "Mail Send"
4. Copia y pega en `.env`

**NOTA**: Si no configuras SendGrid, el sistema funcionará en **modo simulado** (los emails se mostrarán en la consola del servidor en lugar de enviarse).

### 3. Ejecutar la Aplicación

```bash
# Instalar dependencias (si no lo has hecho)
npm install

# Ejecutar en desarrollo
npm run dev
```

## 📖 Cómo Usar

### Como Administrador

1. **Iniciar sesión** como admin
2. **Ir al panel Admin** (menú superior)
3. **Tab "Invitations"**

#### Opción A: Invitar un usuario
- Click en "Invitar Usuario"
- Completa: email, nombre, apellido, país
- El usuario recibirá un email con link único

#### Opción B: Importar múltiples usuarios
- Click en "Importar CSV"
- Descarga la plantilla (opcional)
- Completa el archivo:
  ```csv
  email,firstName,lastName,country
  usuario1@ejemplo.com,Juan,Pérez,México
  usuario2@ejemplo.com,María,García,Colombia
  ```
- Sube el archivo
- Revisa la vista previa
- Click en "Enviar X Invitaciones"

### Como Usuario Invitado

1. **Recibir email** de invitación
2. **Click en el link** del email
3. **Completar registro**:
   - Elegir nombre de usuario
   - Crear contraseña
4. **Esperar aprobación** del admin
5. **Recibir email** de confirmación
6. **Iniciar sesión** ✅

### Aprobar Usuarios Pendientes

1. Panel Admin → Tab "Pending Users"
2. Ver lista de usuarios que completaron registro
3. Click en "Approve" para aprobar
4. El usuario recibirá email de confirmación automáticamente

## 📂 Archivos Importantes

```
📁 LoyaltyPilot/
├─ 📄 INVITATIONS_GUIDE.md          # Guía detallada completa
├─ 📄 IMPLEMENTATION_SUMMARY.md     # Resumen de implementación
├─ 📄 QUICK_START.md                # Este archivo
├─ 📄 .env.example                  # Ejemplo de configuración
│
├─ 📁 server/
│  ├─ email.ts                      # ✨ Nuevo: Sistema de emails
│  ├─ routes.ts                     # ⚙️ Modificado: Endpoints de invitación
│  └─ storage.ts                    # ⚙️ Modificado: getUserByInviteToken
│
└─ 📁 client/src/
   ├─ 📁 components/admin/
   │  └─ UserInvitationsTab.tsx     # ✨ Nuevo: UI de invitaciones
   ├─ 📁 pages/
   │  ├─ register-invite.tsx        # ✨ Nuevo: Página de registro
   │  └─ admin.tsx                  # ⚙️ Modificado: Nuevo tab
   └─ App.tsx                       # ⚙️ Modificado: Ruta /register
```

## 🎯 Flujo Visual

```
ADMIN                         SISTEMA                      USUARIO
  │                              │                            │
  ├─ Enviar invitación ────────>│                            │
  │                              ├─ Generar token único      │
  │                              ├─ Guardar en BD            │
  │                              └─ Enviar email ──────────> │
  │                              │                            ├─ Recibir email
  │                              │                            ├─ Click en link
  │                              │<─── GET /register?token ──┤
  │                              ├─ Verificar token          │
  │                              └─ Mostrar formulario ────> │
  │                              │                            ├─ Llenar form
  │                              │<─── POST registro ────────┤
  │                              ├─ Guardar usuario          │
  │                              └─ Email bienvenida ──────> │
  │                              │                            │
  ├─ Ver pendientes             │                            │
  ├─ Aprobar usuario ──────────>│                            │
  │                              ├─ Marcar aprobado          │
  │                              └─ Email aprobación ──────> │
  │                              │                            │
  │                              │                            ├─ Iniciar sesión ✅
```

## 🔧 Troubleshooting

### Los emails no se envían
✅ **Solución**: Esto es normal si no configuraste SendGrid. Los emails se simulan en la consola del servidor. Para enviar emails reales, configura `SENDGRID_API_KEY`.

### "Email already exists"
✅ **Solución**: El email ya está registrado. Usa otro email o elimina el usuario existente desde el panel de admin.

### "Invalid invitation"
✅ **Solución**: El token ya fue usado o no es válido. El admin debe enviar una nueva invitación.

## 📚 Documentación Adicional

- **Guía Completa**: Lee `INVITATIONS_GUIDE.md` para documentación detallada
- **Detalles Técnicos**: Lee `IMPLEMENTATION_SUMMARY.md` para info de implementación
- **Endpoints API**: Documentados en `INVITATIONS_GUIDE.md`

## ✅ Checklist de Verificación

Antes de usar en producción, verifica:

- [ ] Variables de entorno configuradas
- [ ] SendGrid API key válida (si quieres emails reales)
- [ ] FROM_EMAIL verificado en SendGrid
- [ ] APP_URL apunta a tu dominio de producción
- [ ] Base de datos configurada correctamente
- [ ] Al menos un usuario admin creado

## 🎉 ¡Listo para Usar!

El sistema está **completamente funcional**. Puedes:

1. Invitar usuarios individual o masivamente
2. Los usuarios pueden registrarse con su link único
3. Aprobar cuentas desde el panel admin
4. Todos reciben emails automáticos en cada paso

---

**¿Necesitas ayuda?** Revisa `INVITATIONS_GUIDE.md` para más detalles.
