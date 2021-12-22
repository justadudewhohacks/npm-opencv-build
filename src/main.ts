import { install } from './install.js';
import log from 'npmlog';

if (process.env.npm_config_loglevel === 'silly') {
  log.level = 'silly'
}

void install()
