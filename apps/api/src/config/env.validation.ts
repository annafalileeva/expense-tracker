/**
 * Проверка переменных окружения на старте: лучше упасть сразу,
 * чем поймать `undefined` в рантайме на первом запросе к БД.
 */
export function validateEnv(config: Record<string, unknown>): Record<string, unknown> {
  const required = ['DATABASE_URL', 'JWT_SECRET'];
  const missing = required.filter((key) => !config[key]);

  if (missing.length > 0) {
    throw new Error(
      `Не заданы обязательные переменные окружения: ${missing.join(', ')}. ` +
        'Скопируйте .env.example в .env в корне монорепозитория.',
    );
  }

  const port = config.API_PORT;
  if (port !== undefined && Number.isNaN(Number(port))) {
    throw new Error(`API_PORT должен быть числом, получено: ${String(port)}`);
  }

  return config;
}
