-- Database: tahiticc
CREATE DATABASE tahiticc
    WITH
    OWNER = root
    ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.utf8'
    LC_CTYPE = 'en_US.utf8'
    LOCALE_PROVIDER = 'libc'
    TABLESPACE = pg_default
    CONNECTION LIMIT = -1
    IS_TEMPLATE = False;

-- Conectar a la base de datos tahiticc
\c tahiticc;

-- Extensión para UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Tabla de administradores ACTUALIZADA para OAuth
CREATE TABLE IF NOT EXISTS public.administradores
(
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    usuario text COLLATE pg_catalog."default" NOT NULL,
    email text COLLATE pg_catalog."default" NOT NULL,
    contraseña text COLLATE pg_catalog."default",
    proveedor text COLLATE pg_catalog."default" DEFAULT 'local'::text,
    id_proveedor text COLLATE pg_catalog."default",
    avatar_url text COLLATE pg_catalog."default",
    rol text COLLATE pg_catalog."default" DEFAULT 'admin'::text,
    verificado boolean DEFAULT true,
    creado_en timestamp with time zone DEFAULT now(),
    actualizado_en timestamp with time zone DEFAULT now(),
    ultimo_login timestamp with time zone,
    CONSTRAINT administradores_pkey PRIMARY KEY (id),
    CONSTRAINT administradores_email_key UNIQUE (email),
    CONSTRAINT administradores_usuario_key UNIQUE (usuario)
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.administradores
    OWNER to root;

-- Tabla de lugares
CREATE TABLE IF NOT EXISTS public.lugares
(
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    nombre text COLLATE pg_catalog."default" NOT NULL,
    descripcion text COLLATE pg_catalog."default",
    ubicacion text COLLATE pg_catalog."default",
    categoria text COLLATE pg_catalog."default",
    puntuacion_promedio numeric DEFAULT 0,
    total_calificaciones integer DEFAULT 0,
    foto_principal_url text COLLATE pg_catalog."default",
    creado_en timestamp with time zone DEFAULT now(),
    pdf_url text COLLATE pg_catalog."default",
    CONSTRAINT lugares_pkey PRIMARY KEY (id)
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.lugares
    OWNER to root;

-- Tabla para múltiples fotos por lugar
CREATE TABLE IF NOT EXISTS public.fotos_lugares
(
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    lugar_id uuid NOT NULL,
    url_foto text COLLATE pg_catalog."default" NOT NULL,
    ruta_almacenamiento text COLLATE pg_catalog."default",
    es_principal boolean DEFAULT false,
    descripcion text COLLATE pg_catalog."default",
    orden integer DEFAULT 0,
    ancho_imagen integer,
    alto_imagen integer,
    tamaño_archivo bigint,
    tipo_archivo text COLLATE pg_catalog."default",
    creado_en timestamp with time zone DEFAULT now(),
    CONSTRAINT fotos_lugares_pkey PRIMARY KEY (id),
    CONSTRAINT fotos_lugares_lugar_id_fkey FOREIGN KEY (lugar_id)
        REFERENCES public.lugares (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.fotos_lugares
    OWNER to root;

-- Tabla de calificaciones con control por IP/Navegador
CREATE TABLE IF NOT EXISTS public.calificaciones_lugares
(
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    lugar_id uuid NOT NULL,
    calificacion integer NOT NULL,
    comentario text COLLATE pg_catalog."default",
    ip_usuario text COLLATE pg_catalog."default",
    hash_navegador text COLLATE pg_catalog."default",
    creado_en timestamp with time zone DEFAULT now(),
    actualizado_en timestamp with time zone DEFAULT now(),
    CONSTRAINT calificaciones_lugares_pkey PRIMARY KEY (id),
    CONSTRAINT calificaciones_lugares_lugar_id_fkey FOREIGN KEY (lugar_id)
        REFERENCES public.lugares (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE,
    CONSTRAINT calificaciones_lugares_calificacion_check CHECK (calificacion >= 1 AND calificacion <= 5)
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.calificaciones_lugares
    OWNER to root;

-- Tabla principal de experiencias (mural anónimo)
CREATE TABLE IF NOT EXISTS public.experiencias
(
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    url_foto text COLLATE pg_catalog."default" NOT NULL,
    descripcion text COLLATE pg_catalog."default",
    creado_en timestamp with time zone DEFAULT now(),
    ruta_almacenamiento text COLLATE pg_catalog."default",
    estado text COLLATE pg_catalog."default" DEFAULT 'pendiente'::text,
    puntuacion_moderacion numeric DEFAULT 0,
    categorias_moderacion jsonb,
    contador_vistas integer DEFAULT 0,
    lugar_id uuid,
    ancho_imagen integer,
    alto_imagen integer,
    tamaño_archivo bigint,
    tipo_archivo text COLLATE pg_catalog."default",
    busqueda_segura_adulto text COLLATE pg_catalog."default",
    busqueda_segura_violencia text COLLATE pg_catalog."default",
    busqueda_segura_provocativo text COLLATE pg_catalog."default",
    banderas_moderacion_texto jsonb,
    CONSTRAINT experiencias_pkey PRIMARY KEY (id),
    CONSTRAINT experiencias_lugar_id_fkey FOREIGN KEY (lugar_id)
        REFERENCES public.lugares (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE SET NULL
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.experiencias
    OWNER to root;

-- Tabla para vistas de experiencias (métricas anónimas)
CREATE TABLE IF NOT EXISTS public.vistas_experiencias
(
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    experiencia_id uuid NOT NULL,
    ip_usuario text COLLATE pg_catalog."default",
    agente_usuario text COLLATE pg_catalog."default",
    visto_en timestamp with time zone DEFAULT now(),
    creado_en timestamp with time zone DEFAULT now(),
    CONSTRAINT vistas_experiencias_pkey PRIMARY KEY (id),
    CONSTRAINT vistas_experiencias_experiencia_id_fkey FOREIGN KEY (experiencia_id)
        REFERENCES public.experiencias (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.vistas_experiencias
    OWNER to root;

-- Índices para optimización
CREATE INDEX IF NOT EXISTS idx_lugares_categoria
    ON public.lugares USING btree
    (categoria COLLATE pg_catalog."default" ASC NULLS LAST)
    TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_fotos_lugares_lugar_id
    ON public.fotos_lugares USING btree
    (lugar_id ASC NULLS LAST)
    TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_fotos_lugares_es_principal
    ON public.fotos_lugares USING btree
    (es_principal ASC NULLS LAST)
    TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_fotos_lugares_orden
    ON public.fotos_lugares USING btree
    (orden ASC NULLS LAST)
    TABLESPACE pg_default;

CREATE UNIQUE INDEX IF NOT EXISTS idx_calificacion_unica 
    ON public.calificaciones_lugares (lugar_id, hash_navegador);

CREATE INDEX IF NOT EXISTS idx_calificaciones_por_lugar 
    ON public.calificaciones_lugares (lugar_id, creado_en DESC)
    TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_calificaciones_ip
    ON public.calificaciones_lugares (ip_usuario, creado_en)
    TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_experiencias_estado
    ON public.experiencias USING btree
    (estado COLLATE pg_catalog."default" ASC NULLS LAST)
    TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_experiencias_creado_en
    ON public.experiencias USING btree
    (creado_en DESC NULLS LAST)
    TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_experiencias_lugar_id
    ON public.experiencias USING btree
    (lugar_id ASC NULLS LAST)
    TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_vistas_experiencias_experiencia_id
    ON public.vistas_experiencias USING btree
    (experiencia_id ASC NULLS LAST)
    TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_vistas_experiencias_visto_en
    ON public.vistas_experiencias USING btree
    (visto_en DESC NULLS LAST)
    TABLESPACE pg_default;

-- Insertar usuario administrador con contraseña VACÍA para OAuth
INSERT INTO public.administradores (usuario, email, contraseña, proveedor, rol, verificado) VALUES
('juanramiro', 'juanramiro139@gmail.com', NULL, 'google', 'super_admin', true)
ON CONFLICT (email) DO UPDATE SET
    usuario = EXCLUDED.usuario,
    contraseña = EXCLUDED.contraseña,
    proveedor = EXCLUDED.proveedor,
    rol = EXCLUDED.rol,
    actualizado_en = NOW();

-- Insertar lugares REALES de San Juan Tahitic (sin calificaciones, nuevos IDs)
INSERT INTO public.lugares (id, nombre, descripcion, foto_principal_url, ubicacion, categoria, puntuacion_promedio, total_calificaciones, creado_en) VALUES
(
    gen_random_uuid(),
    'Cascada La Cuerda – Monte Virgen',
    'Una de las cascadas más altas de la región con 143 metros de altura. Requiere experiencia en senderismo para disfrutar su ruta desafiante.',
    '/images/cascada_la_cuerda.jpg',
    '19.958349,-97.527431 (San Juan Tahitic, 73905 Zacapoaxtla, Pue.)',
    'Cascada',
    0,  -- Sin calificaciones iniciales
    0,
    NOW()
),
(
    gen_random_uuid(),
    'Puente del Infiernillo – San Juan Tahitic',
    'Puente natural de ~30 metros sobre el río Apulco, rodeado de barrancas y vegetación espesa. Un sitio único para la aventura y la observación.',
    '/images/puente_infernillo.jpg',
    '19.956663,-97.553011 (Capilla del Divino Salvador de Apolateno, 73565 San Juan Tahitic, Zacapoaxtla, Pue.)',
    'Puente',
    0,  -- Sin calificaciones iniciales
    0,
    NOW()
),
(
    gen_random_uuid(),
    'Cascada Salto de La Paz – Monte Virgen',
    'Una de las joyas naturales de Monte Virgen, con una caída de 94 metros rodeada de densa vegetación y fauna local.',
    '/images/salto_de_la_paz.jpg',
    '19.958425,-97.530367 (XF59+8V, 73687 San Juan Tahitic, Pue.)',
    'Cascada',
    0,  -- Sin calificaciones iniciales
    0,
    NOW()
),
(
    gen_random_uuid(),
    'Cascada de los Enamorados (Xochiateno) – San Juan Tahitic',
    'Cascada de 82 metros envuelta en leyendas románticas locales. Ideal para fotografía y un ambiente tranquilo en medio de la naturaleza.',
    '/images/cascada_enamorados.jpeg',
    '19.925384,-97.538205 (73686 San Juan Tahitic, Zacapoaxtla, Pue.)',
    'Cascada',
    0,  -- Sin calificaciones iniciales
    0,
    NOW()
)
ON CONFLICT DO NOTHING;

-- Insertar fotos adicionales para los lugares (galerías)
INSERT INTO public.fotos_lugares (lugar_id, url_foto, es_principal, descripcion, orden) 
SELECT 
    id, 
    '/images/cascada_la_cuerda_vista1.jpg',
    false,
    'Vista frontal de la cascada',
    2
FROM public.lugares WHERE nombre = 'Cascada La Cuerda – Monte Virgen'
ON CONFLICT DO NOTHING;

INSERT INTO public.fotos_lugares (lugar_id, url_foto, es_principal, descripcion, orden) 
SELECT 
    id, 
    '/images/cascada_la_cuerda_vista2.jpg',
    false,
    'Sendero hacia la cascada',
    3
FROM public.lugares WHERE nombre = 'Cascada La Cuerda – Monte Virgen'
ON CONFLICT DO NOTHING;

INSERT INTO public.fotos_lugares (lugar_id, url_foto, es_principal, descripcion, orden) 
SELECT 
    id, 
    '/images/puente_infernillo_vista1.jpg',
    false,
    'Vista desde abajo del puente',
    2
FROM public.lugares WHERE nombre = 'Puente del Infiernillo – San Juan Tahitic'
ON CONFLICT DO NOTHING;

INSERT INTO public.fotos_lugares (lugar_id, url_foto, es_principal, descripcion, orden) 
SELECT 
    id, 
    '/images/salto_de_la_paz_vista1.jpg',
    false,
    'Piscina natural al pie de la cascada',
    2
FROM public.lugares WHERE nombre = 'Cascada Salto de La Paz – Monte Virgen'
ON CONFLICT DO NOTHING;

-- Comentarios en las tablas
COMMENT ON TABLE public.lugares IS 'Lugares disponibles para experiencias y calificaciones';
COMMENT ON TABLE public.fotos_lugares IS 'Múltiples fotos por lugar para galerías';
COMMENT ON TABLE public.calificaciones_lugares IS 'Calificaciones con control por IP/navegador para evitar duplicados';
COMMENT ON TABLE public.experiencias IS 'Experiencias anónimas del mural digital';
COMMENT ON TABLE public.vistas_experiencias IS 'Registro de vistas anónimas a experiencias';
COMMENT ON TABLE public.administradores IS 'Usuarios administradores del sistema para OAuth/JWT';

-- Función para actualizar automáticamente las puntuaciones de lugares
CREATE OR REPLACE FUNCTION actualizar_puntuaciones_lugar()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN
        UPDATE public.lugares 
        SET 
            puntuacion_promedio = (
                SELECT COALESCE(AVG(calificacion), 0) 
                FROM public.calificaciones_lugares 
                WHERE lugar_id = COALESCE(NEW.lugar_id, OLD.lugar_id)
            ),
            total_calificaciones = (
                SELECT COUNT(*) 
                FROM public.calificaciones_lugares 
                WHERE lugar_id = COALESCE(NEW.lugar_id, OLD.lugar_id)
            )
        WHERE id = COALESCE(NEW.lugar_id, OLD.lugar_id);
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger para mantener actualizadas las puntuaciones
CREATE TRIGGER trigger_actualizar_puntuaciones_lugar
    AFTER INSERT OR UPDATE OR DELETE ON public.calificaciones_lugares
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_puntuaciones_lugar();

-- Función para asegurar que solo haya una foto principal por lugar
CREATE OR REPLACE FUNCTION asegurar_foto_principal_unica()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.es_principal THEN
        UPDATE public.fotos_lugares 
        SET es_principal = false 
        WHERE lugar_id = NEW.lugar_id 
        AND id != NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para foto principal única
CREATE TRIGGER trigger_foto_principal_unica
    AFTER INSERT OR UPDATE ON public.fotos_lugares
    FOR EACH ROW
    WHEN (NEW.es_principal = true)
    EXECUTE FUNCTION asegurar_foto_principal_unica();

-- Permisos
GRANT ALL PRIVILEGES ON DATABASE tahiticc TO root;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO root;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO root;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO root;


-- Después de ejecutar el script:
SELECT nombre, puntuacion_promedio, total_calificaciones, creado_en 
FROM lugares 
ORDER BY creado_en DESC;

select * from lugares;

UPDATE lugares
SET foto_principal_url = regexp_replace(foto_principal_url, '^/images/', '/images/lugares/');


select *from calificaciones_lugares;
select *from lugares;

UPDATE administradores
SET usuario = 'Juan Ramiro'
WHERE id = '26450473-894d-4511-bc32-8ca69923f691';

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'fotos_lugares';

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'calificaciones_lugares';


