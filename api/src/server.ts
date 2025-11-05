import { buildApp } from './app.js';
import { loadConfig } from './settings.js';
import { ensureInitialAdminFromConfig } from './services/userService.js';

async function start() {
  const config = loadConfig();
  const app = await buildApp(config);

  if (config.bootstrapAdmin) {
    try {
      const result = await ensureInitialAdminFromConfig(app.db, config.bootstrapAdmin);
      if (result.created) {
        app.log.info('Created initial admin user from environment configuration');
      } else {
        app.log.debug({ reason: result.reason }, 'Skipped env-admin bootstrap');
      }
    } catch (error) {
      app.log.error(error, 'Failed to create admin user from environment configuration');
    }
  }

  try {
    await app.listen({ port: config.port, host: config.host });
    app.log.info(`Server listening on http://${config.host}:${config.port}`);
  } catch (error) {
    app.log.error(error, 'Failed to start server');
    process.exit(1);
  }
}

void start();
