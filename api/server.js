require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { buildFormatoBuffer, buildFormatosZip } = require('./formatoColaborador');
const empleadosBase = require('../data/empleados_base.json');

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
  res.json({ version: 'v1.3.3' });
});

// ── GET /api/empleado/:cedula ──
// Revisa si ya existe un registro para esa cédula
app.get('/api/empleado/:cedula', async (req, res) => {
  const { cedula } = req.params;
  const { data, error } = await supabase
    .from('colaboradores')
    .select('cedula, nombre, fecha_completacion, datos_completos')
    .eq('cedula', cedula)
    .single();

  if (error && error.code !== 'PGRST116') {
    return res.status(500).json({ error: error.message });
  }
  const esBorrador = !!data?.datos_completos?._borrador;
  res.json({ existe: !!data, es_borrador: esBorrador, registro: data || null });
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
      fecha_completacion: esBorrador ? null : ahora
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

// ── GET /api/admin/formato/:cedula ──
// Descarga una ficha individual en el formato oficial de actualización
app.get('/api/admin/formato/:cedula', async (req, res) => {
  const clave = req.headers['x-admin-key'];
  if (!clave || clave.toLowerCase().trim() !== ADMIN_KEY.toLowerCase().trim()) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  const { cedula } = req.params;
  const { data, error } = await supabase
    .from('colaboradores')
    .select('cedula, nombre, datos_completos')
    .eq('cedula', cedula)
    .single();

  if (error && error.code !== 'PGRST116') return res.status(500).json({ error: error.message });
  const base = empleadosBase.find((e) => String(e['Numero documento empleado']).trim() === String(cedula).trim()) || {};
  const datosCompletos = {
    ...base,
    ...(data?.datos_completos || {}),
    cedula: String(cedula),
  };
  const buffer = await buildFormatoBuffer(datosCompletos);
  const filename = `Formato_${cedula}.xlsx`;
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(Buffer.from(buffer));
});

// ── GET /api/admin/formatos ──
// Descarga un ZIP con todas las fichas diligenciadas
app.get('/api/admin/formatos', async (req, res) => {
  const clave = req.headers['x-admin-key'];
  if (!clave || clave.toLowerCase().trim() !== ADMIN_KEY.toLowerCase().trim()) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  const { data, error } = await supabase
    .from('colaboradores')
    .select('cedula, nombre, fecha_completacion, datos_completos')
    .order('fecha_completacion', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  const actualizaciones = new Map((data || []).map((r) => [String(r.cedula), r]));
  const registrosConsolidados = empleadosBase.map((base) => {
    const cedula = String(base['Numero documento empleado'] || base.cedula || '').trim();
    const actualizado = actualizaciones.get(cedula);
    const datosCompletos = {
      ...base,
      ...(actualizado?.datos_completos || {}),
      cedula,
    };
    return {
      cedula,
      nombre: actualizado?.nombre || `${base['Primer nombre'] || ''} ${base['Primer apellido'] || ''}`.trim(),
      fecha_completacion: actualizado?.fecha_completacion || null,
      datos_completos: datosCompletos,
    };
  });
  const zip = await buildFormatosZip(registrosConsolidados);
  const today = new Date().toISOString().slice(0, 10);
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="Formatos_Colaboradores_Logiser_${today}.zip"`);
  res.send(zip);
});

// ── GET /api/admin/formatos-completados ──
// Descarga un ZIP solo con las fichas de colaboradores que ya diligenciaron datos
app.get('/api/admin/formatos-completados', async (req, res) => {
  const clave = req.headers['x-admin-key'];
  if (!clave || clave.toLowerCase().trim() !== ADMIN_KEY.toLowerCase().trim()) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  const { data, error } = await supabase
    .from('colaboradores')
    .select('cedula, nombre, fecha_completacion, datos_completos')
    .order('fecha_completacion', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  const basePorCedula = new Map(
    empleadosBase.map((base) => [String(base['Numero documento empleado']).trim(), base])
  );
  const registrosCompletados = (data || [])
    .filter((record) => !record.datos_completos?._borrador && record.fecha_completacion)
    .map((record) => {
      const cedula = String(record.cedula || '').trim();
      const base = basePorCedula.get(cedula) || {};
      return {
        cedula,
        nombre: record.nombre || `${base['Primer nombre'] || ''} ${base['Primer apellido'] || ''}`.trim(),
        fecha_completacion: record.fecha_completacion,
        datos_completos: {
          ...base,
          ...(record.datos_completos || {}),
          cedula,
        },
      };
    });

  const zip = await buildFormatosZip(registrosCompletados);
  const today = new Date().toISOString().slice(0, 10);
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="Formatos_Diligenciados_Logiser_${today}.zip"`);
  res.send(zip);
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
