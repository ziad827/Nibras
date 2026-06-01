import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  SWAGGER_PATH: Joi.string().default('api/docs'),

  MONGO_URI: Joi.string()
    .uri({ scheme: ['mongodb', 'mongodb+srv'] })
    .required(),
  MONGO_MAX_POOL_SIZE: Joi.number().integer().min(1).default(10),
  MONGO_SERVER_SELECTION_TIMEOUT_MS: Joi.number()
    .integer()
    .min(0)
    .default(5000),
  MONGO_RETRY_ATTEMPTS: Joi.number().integer().min(0).default(5),
  MONGO_RETRY_DELAY_MS: Joi.number().integer().min(0).default(3000),

  REDIS_HOST: Joi.string().hostname().required(),
  REDIS_PORT: Joi.number().port().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').optional(),
  REDIS_TTL_SECONDS: Joi.number().integer().min(0).default(60),

  AUTH_SECRET: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.string().min(32).required(),
    otherwise: Joi.string().min(8).default('nibras-dev-auth-secret'),
  }),
  WEB_BASE_URL: Joi.string().uri().default('http://localhost:3000'),
  API_BASE_URL: Joi.string().uri().optional(),
  GITHUB_APP_CLIENT_ID: Joi.string().allow('').optional(),
  GITHUB_APP_CLIENT_SECRET: Joi.string().allow('').optional(),
  RESEND_API_KEY: Joi.string().allow('').optional(),
  NIBRAS_EMAIL_FROM: Joi.string().default('Nibras <noreply@nibras.dev>'),
  SESSION_TTL_DAYS: Joi.number().integer().min(1).max(365).default(30),
  MAGIC_LINK_TTL_SECONDS: Joi.number().integer().min(60).max(3600).default(300),
});
