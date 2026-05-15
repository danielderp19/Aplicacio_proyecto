-- Ejecuta esto en el SQL Editor de Supabase

create table if not exists colaboradores (
  id bigint generated always as identity primary key,
  cedula text unique not null,
  nombre text,
  datos_completos jsonb,
  fecha_completacion timestamptz default now()
);

-- Índice para búsquedas rápidas por cédula
create index if not exists idx_colaboradores_cedula on colaboradores(cedula);

-- Deshabilitar RLS para acceso desde el servidor (service key)
alter table colaboradores disable row level security;
