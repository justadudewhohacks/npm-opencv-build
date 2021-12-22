import { install } from './install';
import * as log from 'npmlog';
import { BuildContext } from '.';

if (process.env.npm_config_loglevel === 'silly') {
  // current npmlog DT show level as readonly
  (log as any).level = 'silly'
}

const ctxt = new BuildContext();
void install(ctxt)
