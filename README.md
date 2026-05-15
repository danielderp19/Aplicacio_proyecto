# Logiser — Recolector de Datos de Colaboradores

## Stack
- **Frontend:** HTML + JS vanilla
- **Backend:** Node.js + Express
- **Base de datos:** Supabase (PostgreSQL)
- **Deploy:** Vercel

## Setup en 5 pasos

### 1. Crea el proyecto en Supabase
1. Ve a https://supabase.com y crea una cuenta gratis
2. Crea un nuevo proyecto
3. Ve a **SQL Editor** y ejecuta el contenido de `supabase_setup.sql`
4. Ve a **Settings → API** y copia:
   - `Project URL` → `SUPABASE_URL`
   - `service_role` key → `SUPABASE_SERVICE_KEY`

### 2. Configura las variables de entorno
```bash
cp .env.example .env
# Edita .env con tus valores de Supabase
```

### 3. Instala dependencias y prueba local
```bash
npm install
npm run dev
# Abre http://localhost:3000
```

### 4. Deploy en Vercel
```bash
npm install -g vercel
vercel login
vercel --prod
# En Vercel Dashboard → Settings → Environment Variables
# Agrega: SUPABASE_URL, SUPABASE_SERVICE_KEY, ADMIN_UNLOCK_KEY
```

### 5. Comparte el link
Vercel te da un link como: `https://logiser-colaboradores.vercel.app`
Ese link es el que envías a los colaboradores.

## Clave de administrador
- Default: `gatos negros`
- Cámbiala en la variable de entorno `ADMIN_UNLOCK_KEY`
- Se usa para:
  - Desbloquear edición de registros ya enviados
  - Descargar el histórico completo desde el panel admin

## Panel de administrador
Abre la app y presiona **⌘+Shift+A** (Mac) o **Ctrl+Shift+A** (Windows)
