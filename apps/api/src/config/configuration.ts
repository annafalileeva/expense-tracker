/**
 * Типизированный конфиг приложения. Читается один раз при старте
 * через ConfigModule.forRoot({ load: [configuration] }).
 */
export interface AppConfig {
  nodeEnv: string;
  port: number;
  webOrigin: string;
  databaseUrl: string;
  jwt: {
    secret: string;
    expiresIn: string;
  };
}

export default (): AppConfig => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number.parseInt(process.env.API_PORT ?? '3001', 10),
  webOrigin: process.env.WEB_ORIGIN ?? 'http://localhost:3000',
  databaseUrl: process.env.DATABASE_URL ?? '',
  jwt: {
    secret: process.env.JWT_SECRET ?? '',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  },
});
