import { OpenCVBuilder } from './OpenCVBuilder.js';
import log from 'npmlog';

if (process.env.npm_config_loglevel === 'silly') {
  log.level = 'silly'
}

/**
 * called from `npm run do-install` triggered by postinstall script
 */
new OpenCVBuilder().install();