import { install } from './install';
import * as log from 'npmlog';

if (process.env.npm_config_loglevel === 'silly') {
  // current npmlog DT show level as readonly
  (log as any).level = 'silly'
}

install()
