"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var os = require("os");
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
function parseAutoBuildFlags() {
    var flagStr = autoBuildFlags();
    if (typeof (flagStr) === 'string' && flagStr.length) {
        log.silly('install', 'using flags from OPENCV4NODEJS_AUTOBUILD_FLAGS:', flagStr);
        return flagStr.split(' ');
    }
    return [];
}
exports.parseAutoBuildFlags = parseAutoBuildFlags;
function opencvVersion() {
    return process.env.OPENCV4NODEJS_AUTOBUILD_OPENCV_VERSION || '3.4.6';
}
exports.opencvVersion = opencvVersion;
function numberOfCoresAvailable() {
    return os.cpus().length;
}
exports.numberOfCoresAvailable = numberOfCoresAvailable;
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
