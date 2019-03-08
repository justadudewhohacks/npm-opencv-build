"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var os = require("os");
var log = require('npmlog');
function isAutoBuildDisabled() {
    return !!process.env.OPENCV4NODEJS_DISABLE_AUTOBUILD;
}
exports.isAutoBuildDisabled = isAutoBuildDisabled;
function flags() {
    var flagStr = process.env.OPENCV4NODEJS_AUTOBUILD_FLAGS;
    if (typeof (flagStr) === "string") {
        log.silly('install', 'using flags from OPENCV4NODEJS_AUTOBUILD_FLAGS:', flagStr);
        return flagStr.split(' ');
    }
    return [];
}
exports.flags = flags;
function opencvVersion() {
    return process.env.OPENCV4NODEJS_AUTOBUILD_OPENCV_VERSION || '3.4.3';
}
exports.opencvVersion = opencvVersion;
function numberOfCoresAvailable() {
    return os.cpus().length;
}
exports.numberOfCoresAvailable = numberOfCoresAvailable;
