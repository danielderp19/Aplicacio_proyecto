require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const ADMIN_KEY = process.env.ADMIN_UNLOCK_KEY || 'gatos negros';

// ── TEST ENDPOINT ──
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    supabase: !!process.env.SUPABASE_URL,
    message: 'Servidor funcionando'
  });
});

// ── VERSION ENDPOINT ──
app.get('/api/version', (req, res) => {
  res.json({ version: 'v1.2.0' });
});

// ── GET /api/empleado/:cedula ──
// Revisa si ya existe un registro para esa cédula
app.get('/api/empleado/:cedula', async (req, res) => {
  const { cedula } = req.params;
  const { data, error } = await supabase
    .from('colaboradores')
    .select('cedula, nombre, fecha_completacion')
    .eq('cedula', cedula)
    .single();

  if (error && error.code !== 'PGRST116') {
    return res.status(500).json({ error: error.message });
  }
  res.json({ existe: !!data, registro: data || null });
});

// ── POST /api/unlock ──
// Verifica la clave para desbloquear edición
app.post('/api/unlock', (req, res) => {
  const { clave } = req.body;
  if (!clave) return res.status(400).json({ ok: false, error: 'Clave requerida' });
  const ok = clave.toLowerCase().trim() === ADMIN_KEY.toLowerCase().trim();
  res.json({ ok });
});

// ── POST /api/empleado ──
// Guarda o actualiza un registro (borrador o completo)
app.post('/api/empleado', async (req, res) => {
  const datos = req.body;
  if (!datos.cedula) return res.status(400).json({ error: 'Cédula requerida' });

  const esBorrador = req.query.borrador === 'true' || req.headers['x-draft'] === 'true';
  const ahora = new Date().toISOString();

  // Intentar con columnas de borrador (tabla actualizada)
  let payload = {
    cedula: String(datos.cedula),
    nombre: `${datos['Primer nombre'] || ''} ${datos['Primer apellido'] || ''}`.trim(),
    datos_completos: { ...datos, ciudad_empresa: 'Bogotá' },
    es_borrador: esBorrador,
    fecha_guardado: ahora,
    fecha_completacion: esBorrador ? null : ahora
  };

  let { error } = await supabase
    .from('colaboradores')
    .upsert(payload, { onConflict: 'cedula' });

  // Si falla por columnas nuevas inexistentes, guardar sin ellas
  if (error && error.message && error.message.includes('schema cache')) {
    payload = {
      cedula: String(datos.cedula),
      nombre: `${datos['Primer nombre'] || ''} ${datos['Primer apellido'] || ''}`.trim(),
      datos_completos: { ...datos, _borrador: esBorrador },
      fecha_completacion: esBorrador ? undefined : ahora
    };
    const retry = await supabase
      .from('colaboradores')
      .upsert(payload, { onConflict: 'cedula' });
    error = retry.error;
  }

  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true, draft: esBorrador });
});

// ── GET /api/admin/todos ──
// Descarga todos los registros (protegido por clave)
app.get('/api/admin/todos', async (req, res) => {
  const clave = req.headers['x-admin-key'];
  if (!clave || clave.toLowerCase().trim() !== ADMIN_KEY.toLowerCase().trim()) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  const { data, error } = await supabase
    .from('colaboradores')
    .select('cedula, nombre, fecha_completacion, datos_completos')
    .order('fecha_completacion', { ascending: false });

  if (error) {
    console.error('Error en /api/admin/todos:', error);
    return res.status(500).json({ error: error.message });
  }
  res.json(data);
});

// ── GET /api/admin/stats ──
app.get('/api/admin/stats', async (req, res) => {
  const clave = req.headers['x-admin-key'];
  if (!clave || clave.toLowerCase().trim() !== ADMIN_KEY.toLowerCase().trim()) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  const { count, error } = await supabase
    .from('colaboradores')
    .select('*', { count: 'exact', head: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ total: count, total_base: 222 });
});

// ── DELETE /api/empleado/:cedula ──
// Elimina un registro (protegido por clave admin)
app.delete('/api/empleado/:cedula', async (req, res) => {
  const clave = req.headers['x-admin-key'];
  if (!clave || clave.toLowerCase().trim() !== ADMIN_KEY.toLowerCase().trim()) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  const { cedula } = req.params;
  const { error } = await supabase
    .from('colaboradores')
    .delete()
    .eq('cedula', cedula);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`✓ Servidor corriendo en http://localhost:${PORT}`));
}

module.exports = app;
