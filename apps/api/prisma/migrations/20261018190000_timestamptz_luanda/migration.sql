-- Os horários continuam a ser o mesmo instante: os valores antigos estavam em UTC.
ALTER TABLE "appointments" ALTER COLUMN "scheduledAt" TYPE TIMESTAMPTZ(3) USING "scheduledAt" AT TIME ZONE 'UTC';
ALTER TABLE "professional_blocks" ALTER COLUMN "startAt" TYPE TIMESTAMPTZ(3) USING "startAt" AT TIME ZONE 'UTC',
ALTER COLUMN "endAt" TYPE TIMESTAMPTZ(3) USING "endAt" AT TIME ZONE 'UTC';
ALTER TABLE "payments" ALTER COLUMN "paidAt" TYPE TIMESTAMPTZ(3) USING "paidAt" AT TIME ZONE 'UTC';

-- Novas sessões (consola do Neon, psql) mostram as horas em Angola, ex.: 14:00+01.
DO $$
BEGIN
  EXECUTE format('ALTER DATABASE %I SET timezone TO %L', current_database(), 'Africa/Luanda');
END
$$;
