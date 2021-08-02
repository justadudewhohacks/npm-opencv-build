"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyEnvsFromPackageJson = exports.readEnvsFromPackageJson = exports.getCwd = exports.readAutoBuildFile = exports.parseAutoBuildFlags = exports.numberOfCoresAvailable = exports.opencvVersion = exports.autoBuildFlags = exports.isWithoutContrib = exports.buildWithCuda = exports.isAutoBuildDisabled = void 0;
const fs = require("fs");
const os = require("os");
const path = require("path");
const dirs_1 = require("./dirs");
const log = require("npmlog");
function isAutoBuildDisabled() {
    return !!process.env.OPENCV4NODEJS_DISABLE_AUTOBUILD;
}
exports.isAutoBuildDisabled = isAutoBuildDisabled;
function buildWithCuda() {
    return !!process.env.OPENCV4NODEJS_BUILD_CUDA || false;
}
exports.buildWithCuda = buildWithCuda;
function isWithoutContrib() {
    return !!process.env.OPENCV4NODEJS_AUTOBUILD_WITHOUT_CONTRIB;
}
exports.isWithoutContrib = isWithoutContrib;
function autoBuildFlags() {
    return process.env.OPENCV4NODEJS_AUTOBUILD_FLAGS || '';
}
exports.autoBuildFlags = autoBuildFlags;
// last: '3.4.15'
function opencvVersion() {
    return process.env.OPENCV4NODEJS_AUTOBUILD_OPENCV_VERSION || '3.4.6';
}
exports.opencvVersion = opencvVersion;
function numberOfCoresAvailable() {
    return os.cpus().length;
}
exports.numberOfCoresAvailable = numberOfCoresAvailable;
function parseAutoBuildFlags() {
    const flagStr = autoBuildFlags();
    if (typeof (flagStr) === 'string' && flagStr.length) {
        log.silly('install', 'using flags from OPENCV4NODEJS_AUTOBUILD_FLAGS:', flagStr);
        return flagStr.split(' ');
    }
    return [];
}
exports.parseAutoBuildFlags = parseAutoBuildFlags;
function readAutoBuildFile() {
    try {
        const fileExists = fs.existsSync(dirs_1.default.autoBuildFile);
        if (fileExists) {
            const autoBuildFile = JSON.parse(fs.readFileSync(dirs_1.default.autoBuildFile).toString());
            if (!autoBuildFile.opencvVersion || !('autoBuildFlags' in autoBuildFile) || !Array.isArray(autoBuildFile.modules)) {
                throw new Error('auto-build.json has invalid contents');
            }
            return autoBuildFile;
        }
        log.info('readAutoBuildFile', 'file does not exists: %s', dirs_1.default.autoBuildFile, dirs_1.default.autoBuildFile);
    }
    catch (err) {
        log.error('readAutoBuildFile', 'failed to read auto-build.json from: %s, with error: %s', dirs_1.default.autoBuildFile, err.toString());
    }
    return undefined;
}
exports.readAutoBuildFile = readAutoBuildFile;
function getCwd() {
    const cwd = process.env.INIT_CWD || process.cwd();
    if (!cwd) {
        throw new Error('process.env.INIT_CWD || process.cwd() is undefined or empty');
    }
    return cwd;
}
exports.getCwd = getCwd;
function parsePackageJson() {
    const absPath = path.resolve(getCwd(), 'package.json');
    if (!fs.existsSync(absPath)) {
        return null;
    }
    log.info('config', `looking for opencv4nodejs option from ${absPath}`);
    return JSON.parse(fs.readFileSync(absPath).toString());
}
/**
 * get opencv4nodejs section from package.json if available
 * @returns opencv4nodejs customs
 */
function readEnvsFromPackageJson() {
    const rootPackageJSON = parsePackageJson();
    return rootPackageJSON
        ? (rootPackageJSON.opencv4nodejs || {})
        : {};
}
exports.readEnvsFromPackageJson = readEnvsFromPackageJson;
function applyEnvsFromPackageJson() {
    let envs = {};
    try {
        envs = readEnvsFromPackageJson();
    }
    catch (err) {
        log.error('applyEnvsFromPackageJson', 'failed to parse package.json:');
        log.error('applyEnvsFromPackageJson', err);
    }
    const envKeys = Object.keys(envs);
    if (envKeys.length) {
        log.info('applyEnvsFromPackageJson', 'the following opencv4nodejs environment variables are set in the package.json:');
        envKeys.forEach(key => log.info('applyEnvsFromPackageJson', `${key}: ${envs[key]}`));
    }
    const { autoBuildBuildCuda, autoBuildFlags, autoBuildOpencvVersion, autoBuildWithoutContrib, disableAutoBuild, opencvIncludeDir, opencvLibDir, opencvBinDir } = envs;
    if (autoBuildFlags) {
        process.env.OPENCV4NODEJS_AUTOBUILD_FLAGS = '' + autoBuildFlags;
    }
    if (autoBuildBuildCuda) {
        process.env.OPENCV4NODEJS_BUILD_CUDA = '' + autoBuildBuildCuda;
    }
    if (autoBuildOpencvVersion) {
        process.env.OPENCV4NODEJS_AUTOBUILD_OPENCV_VERSION = '' + autoBuildOpencvVersion;
    }
    if (autoBuildWithoutContrib) {
        process.env.OPENCV4NODEJS_AUTOBUILD_WITHOUT_CONTRIB = '' + autoBuildWithoutContrib;
    }
    if (disableAutoBuild) {
        process.env.OPENCV4NODEJS_DISABLE_AUTOBUILD = '' + disableAutoBuild;
    }
    if (opencvIncludeDir) {
        process.env.OPENCV_INCLUDE_DIR = '' + opencvIncludeDir;
    }
    if (opencvLibDir) {
        process.env.OPENCV_LIB_DIR = '' + opencvLibDir;
    }
    if (opencvBinDir) {
        process.env.OPENCV_BIN_DIR = '' + opencvBinDir;
    }
}
exports.applyEnvsFromPackageJson = applyEnvsFromPackageJson;
