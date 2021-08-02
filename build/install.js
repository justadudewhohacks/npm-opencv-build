"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.install = void 0;
const fs = require("fs");
const path = require("path");
const constants_1 = require("./constants");
const dirs_1 = require("./dirs");
const env_1 = require("./env");
const getLibsFactory_1 = require("./getLibsFactory");
const setupOpencv_1 = require("./setupOpencv");
const utils_1 = require("./utils");
const log = require("npmlog");
const getLibs = getLibsFactory_1.getLibsFactory({ isWin: utils_1.isWin, isOSX: utils_1.isOSX, opencvModules: constants_1.opencvModules, path, fs });
function checkInstalledLibs(autoBuildFile) {
    let hasLibs = true;
    log.info('install', 'checking for opencv libraries');
    if (!fs.existsSync(dirs_1.default.opencvLibDir)) {
        log.info('install', 'library dir does not exist:', dirs_1.default.opencvLibDir);
        return;
    }
    const installedLibs = getLibs(dirs_1.default.opencvLibDir);
    autoBuildFile.modules.forEach(({ opencvModule, libPath }) => {
        if (!libPath) {
            log.info('install', '%s: %s', opencvModule, 'ignored');
            return;
        }
        const foundLib = installedLibs.find(lib => lib.opencvModule === opencvModule);
        hasLibs = hasLibs && !!foundLib;
        log.info('install', '%s: %s', opencvModule, foundLib ? foundLib.libPath : 'not found');
    });
    return hasLibs;
}
function install() {
    return __awaiter(this, void 0, void 0, function* () {
        // if project directory has a package.json containing opencv4nodejs variables
        // apply these variables to the process environment
        env_1.applyEnvsFromPackageJson();
        if (env_1.isAutoBuildDisabled()) {
            log.info('install', 'OPENCV4NODEJS_DISABLE_AUTOBUILD is set');
            log.info('install', 'skipping auto build...');
            return;
        }
        log.info('install', 'if you want to use an own OpenCV installation set OPENCV4NODEJS_DISABLE_AUTOBUILD');
        // prevent rebuild on every install
        const autoBuildFile = env_1.readAutoBuildFile();
        if (autoBuildFile) {
            log.info('install', `found auto-build.json: ${dirs_1.default.autoBuildFile}`);
            if (autoBuildFile.opencvVersion !== env_1.opencvVersion()) {
                log.info('install', `auto build opencv version is ${autoBuildFile.opencvVersion}, but OPENCV4NODEJS_AUTOBUILD_OPENCV_VERSION=${env_1.opencvVersion()}`);
            }
            else if (autoBuildFile.autoBuildFlags !== env_1.autoBuildFlags()) {
                log.info('install', `auto build flags are ${autoBuildFile.autoBuildFlags}, but OPENCV4NODEJS_AUTOBUILD_FLAGS=${env_1.autoBuildFlags()}`);
            }
            else {
                const hasLibs = checkInstalledLibs(autoBuildFile);
                if (hasLibs) {
                    log.info('install', 'found all libraries');
                    return;
                }
                else {
                    log.info('install', 'missing some libraries');
                }
            }
        }
        else {
            log.info('install', `failed to find auto-build.json: ${dirs_1.default.autoBuildFile}`);
        }
        log.info('install', '');
        log.info('install', 'running install script...');
        log.info('install', '');
        log.info('install', 'opencv version: %s', env_1.opencvVersion());
        log.info('install', 'with opencv contrib: %s', env_1.isWithoutContrib() ? 'no' : 'yes');
        log.info('install', 'custom build flags: %s', env_1.autoBuildFlags());
        log.info('install', '');
        try {
            yield utils_1.requireGit();
            yield utils_1.requireCmake();
            yield setupOpencv_1.setupOpencv();
        }
        catch (err) {
            if (err.toString)
                log.error('install', err.toString());
            else
                log.error('install', JSON.stringify(err));
            process.exit(1);
        }
    });
}
exports.install = install;
