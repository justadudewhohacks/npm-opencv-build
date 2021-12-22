"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const install_1 = require("./install");
const npmlog_1 = __importDefault(require("npmlog"));
if (process.env.npm_config_loglevel === 'silly') {
    // current npmlog DT show level as readonly
    npmlog_1.default.level = 'silly';
}
void (0, install_1.install)();
