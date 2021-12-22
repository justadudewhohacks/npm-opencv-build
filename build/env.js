"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyEnvsFromPackageJson = exports.readEnvsFromPackageJson = exports.getCwd = exports.parseAutoBuildFlags = exports.numberOfCoresAvailable = exports.autoBuildFlags = exports.isWithoutContrib = exports.buildWithCuda = exports.isAutoBuildDisabled = void 0;
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const log = __importStar(require("npmlog"));
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
