-- Выполните, если таблицы уже созданы без поля delivery_address
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS delivery_address TEXT;

UPDATE shipments SET delivery_address = 'Адрес не указан' WHERE delivery_address IS NULL;

ALTER TABLE shipments ALTER COLUMN delivery_address SET NOT NULL;
