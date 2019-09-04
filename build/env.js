"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var os = require("os");
var path = require("path");
var dirs_1 = require("./dirs");
var log = require('npmlog');
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
function opencvVersion() {
    return process.env.OPENCV4NODEJS_AUTOBUILD_OPENCV_VERSION || '3.4.6';
}
exports.opencvVersion = opencvVersion;
function numberOfCoresAvailable() {
    return os.cpus().length;
}
exports.numberOfCoresAvailable = numberOfCoresAvailable;
function parseAutoBuildFlags() {
    var flagStr = autoBuildFlags();
    if (typeof (flagStr) === 'string' && flagStr.length) {
        log.silly('install', 'using flags from OPENCV4NODEJS_AUTOBUILD_FLAGS:', flagStr);
        return flagStr.split(' ');
    }
    return [];
}
exports.parseAutoBuildFlags = parseAutoBuildFlags;
function readAutoBuildFile() {
    try {
        var fileExists = fs.existsSync(dirs_1.dirs.autoBuildFile);
        if (fileExists) {
            var autoBuildFile = JSON.parse(fs.readFileSync(dirs_1.dirs.autoBuildFile).toString());
            if (!autoBuildFile.opencvVersion || !('autoBuildFlags' in autoBuildFile) || !Array.isArray(autoBuildFile.modules)) {
                throw new Error('auto-build.json has invalid contents');
            }
            return autoBuildFile;
        }
        log.info('readAutoBuildFile', 'file does not exists: %s', dirs_1.dirs.autoBuildFile, dirs_1.dirs.autoBuildFile);
    }
    catch (err) {
        log.error('readAutoBuildFile', 'failed to read auto-build.json from: %s, with error: %s', dirs_1.dirs.autoBuildFile, err.toString());
    }
    return undefined;
}
exports.readAutoBuildFile = readAutoBuildFile;
function parsePackageJson() {
    if (!process.env.INIT_CWD) {
        log.error('process.env.INIT_CWD is undefined or empty');
        return;
    }
    var absPath = path.resolve(process.env.INIT_CWD, 'package.json');
    if (!fs.existsSync(absPath)) {
        log.info('No package.json in folder.');
        return;
    }
    try {
        return JSON.parse(fs.readFileSync(absPath).toString());
    }
    catch (error) {
        log.error('failed to parse package.json:');
        log.error(error);
    }
}
function readEnvsFromPackageJson() {
    var rootPackageJSON = parsePackageJson();
    if (!rootPackageJSON || !rootPackageJSON.opencv4nodejs) {
        return;
    }
    var envs = Object.keys(rootPackageJSON.opencv4nodejs);
    if (envs.length) {
        log.info('the following opencv4nodejs environment variables are set in the package.json:');
        envs.forEach(function (key) { return log.info(key + ": " + rootPackageJSON.opencv4nodejs[key]); });
    }
    var _a = rootPackageJSON.opencv4nodejs, autoBuildBuildCuda = _a.autoBuildBuildCuda, autoBuildFlags = _a.autoBuildFlags, autoBuildOpenCVVersion = _a.autoBuildOpenCVVersion, autoBuildWithoutContrib = _a.autoBuildWithoutContrib, disableAutoBuild = _a.disableAutoBuild, opencvIncludeDir = _a.opencvIncludeDir, opencvLibDir = _a.opencvLibDir, opencvBinDir = _a.opencvBinDir;
    if (autoBuildFlags) {
        process.env.OPENCV4NODEJS_AUTOBUILD_FLAGS = autoBuildFlags;
    }
    if (autoBuildBuildCuda) {
        process.env.OPENCV4NODEJS_BUILD_CUDA = autoBuildBuildCuda;
    }
    if (autoBuildOpenCVVersion) {
        process.env.OPENCV4NODEJS_AUTOBUILD_OPENCV_VERSION = autoBuildOpenCVVersion;
    }
    if (autoBuildWithoutContrib) {
        process.env.OPENCV4NODEJS_AUTOBUILD_WITHOUT_CONTRIB = autoBuildWithoutContrib;
    }
    if (disableAutoBuild) {
        process.env.OPENCV4NODEJS_DISABLE_AUTOBUILD = disableAutoBuild;
    }
    if (opencvIncludeDir) {
        process.env.OPENCV_INCLUDE_DIR = opencvIncludeDir;
    }
    if (opencvLibDir) {
        process.env.OPENCV_LIB_DIR = opencvIncludeDir;
    }
    if (opencvBinDir) {
        process.env.OPENCV_BIN_DIR = opencvBinDir;
    }
}
exports.readEnvsFromPackageJson = readEnvsFromPackageJson;
