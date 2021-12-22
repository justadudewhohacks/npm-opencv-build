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
exports.getLibs = exports.BuildContext = exports.isUnix = exports.isWin = exports.isOSX = exports.applyEnvsFromPackageJson = exports.readEnvsFromPackageJson = exports.isAutoBuildDisabled = exports.opencvModules = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const constants_1 = require("./constants");
// import BuildContext from './BuildContext';
const getLibsFactory_1 = require("./getLibsFactory");
const utils_1 = require("./utils");
var constants_2 = require("./constants");
Object.defineProperty(exports, "opencvModules", { enumerable: true, get: function () { return constants_2.opencvModules; } });
var env_1 = require("./env");
Object.defineProperty(exports, "isAutoBuildDisabled", { enumerable: true, get: function () { return env_1.isAutoBuildDisabled; } });
Object.defineProperty(exports, "readEnvsFromPackageJson", { enumerable: true, get: function () { return env_1.readEnvsFromPackageJson; } });
Object.defineProperty(exports, "applyEnvsFromPackageJson", { enumerable: true, get: function () { return env_1.applyEnvsFromPackageJson; } });
var utils_2 = require("./utils");
Object.defineProperty(exports, "isOSX", { enumerable: true, get: function () { return utils_2.isOSX; } });
Object.defineProperty(exports, "isWin", { enumerable: true, get: function () { return utils_2.isWin; } });
Object.defineProperty(exports, "isUnix", { enumerable: true, get: function () { return utils_2.isUnix; } });
var BuildContext_1 = require("./BuildContext");
Object.defineProperty(exports, "BuildContext", { enumerable: true, get: function () { return BuildContext_1.BuildContext; } });
;
/**
 * opencv include directory
 */
// export const opencvInclude = dirs.opencvInclude
/**
 * opencv4 include directory
 */
//export const opencv4Include = dirs.opencv4Include
/**
 * built lib directory
 */
//export const opencvLibDir = dirs.opencvLibDir
/**
 * built bin directory
 */
//export const opencvBinDir = dirs.opencvBinDir
/**
 * build directory
 */
//export const opencvBuildDir = dirs.opencvBuild
/**
 * list available module + path as OpencvModule[]
 */
exports.getLibs = (0, getLibsFactory_1.getLibsFactory)({ isWin: utils_1.isWin, isOSX: utils_1.isOSX, opencvModules: constants_1.opencvModules, path, fs });
