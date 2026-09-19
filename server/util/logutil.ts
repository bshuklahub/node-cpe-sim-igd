// logutil.ts
import log4js, { Logger, Configuration } from 'log4js';

const env = process.env.NODE_ENV || 'development';

const config: Configuration = {
  appenders: {
    console: {
      type: 'stdout',
      layout: {
        type: 'pattern',
        pattern: '%d{ISO8601_WITH_TZ_OFFSET} [%p] %c - %m',
      },
    },
    file: {
      type: 'dateFile',
      filename: 'logs/app.log',
      pattern: '.yyyy-MM-dd',
      // Keep 30 days worth of rotated log files
      numBackups: 30,
      keepFileExt: true,
      layout: {
        type: 'pattern',
        pattern: '%d{ISO8601_WITH_TZ_OFFSET} [%p] %c - %m',
      },
    },
  },
  categories: {
    default: {
      appenders: ['console', 'file'],
      level: env === 'production' ? 'info' : 'debug',
      enableCallStack: false,
    },
  },
};

log4js.configure(config);

/**
 * Returns a named logger instance.
 * Use different names per module/file for better traceability.
 *
 * Example:
 *   const logger = getLogger('UserService');
 *   logger.info('User created', { id: 123 });
 */
export function getLogger(name: string): Logger {
  return log4js.getLogger(name);
}

/**
 * Shortcut default logger for simple use cases.
 *
 * Example:
 *   import logger from './logutil';
 *   logger.error('Something went wrong');
 */
const defaultLogger = getLogger('App');

export default defaultLogger;