"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const install_1 = require("./install");
const log = require("npmlog");
if (process.env.npm_config_loglevel === 'silly') {
    // current npmlog DT show level as readonly
    log.level = 'silly';
}
install_1.install();
