"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BuildContext = void 0;
const path_1 = __importDefault(require("path"));
const utils_1 = require("./utils");
const fs_1 = __importDefault(require("fs"));
const npmlog_1 = __importDefault(require("npmlog"));
const picocolors_1 = __importDefault(require("picocolors"));
class BuildContext {
    opencvVersion;
    constructor() {
        /**
         * legacy version: 3.4.6
         * current #.x version: 3.4.15
         */
        const DEFAULT_OPENCV_VERSION = '3.4.16';
        if (!process.env.OPENCV4NODEJS_AUTOBUILD_OPENCV_VERSION) {
            console.log(`${picocolors_1.default.bold(picocolors_1.default.yellow("OPENCV4NODEJS_AUTOBUILD_OPENCV_VERSION"))} is not defined using default verison ${picocolors_1.default.green(DEFAULT_OPENCV_VERSION)}`);
        }
        this.opencvVersion = process.env.OPENCV4NODEJS_AUTOBUILD_OPENCV_VERSION || DEFAULT_OPENCV_VERSION;
        console.log(`Workdir will be: ${picocolors_1.default.green(this.opencvRoot)}`);
    }
    get rootDir() {
        return path_1.default.resolve(__dirname, '../');
    }
    get opencvRoot() {
        return path_1.default.join(this.rootDir, `opencv-${this.opencvVersion}`);
        // return path.join(this.rootDir, `opencv`)
    }
    get opencvSrc() {
        return path_1.default.join(this.opencvRoot, 'opencv');
    }
    get opencvContribSrc() {
        return path_1.default.join(this.opencvRoot, 'opencv_contrib');
    }
    get opencvContribModules() {
        return path_1.default.join(this.opencvContribSrc, 'modules');
    }
    get opencvBuild() {
        return path_1.default.join(this.opencvRoot, 'build');
    }
    get opencvInclude() {
        return path_1.default.join(this.opencvBuild, 'include');
    }
    get opencv4Include() {
        return path_1.default.join(this.opencvInclude, 'opencv4');
    }
    get opencvLibDir() {
        return (0, utils_1.isWin)() ? path_1.default.join(this.opencvBuild, 'lib/Release') : path_1.default.join(this.opencvBuild, 'lib');
    }
    get opencvBinDir() {
        return (0, utils_1.isWin)() ? path_1.default.join(this.opencvBuild, 'bin/Release') : path_1.default.join(this.opencvBuild, 'bin');
    }
    get autoBuildFile() {
        return path_1.default.join(this.opencvRoot, 'auto-build.json');
    }
    readAutoBuildFile() {
        try {
            const fileExists = fs_1.default.existsSync(this.autoBuildFile);
            if (fileExists) {
                const autoBuildFile = JSON.parse(fs_1.default.readFileSync(this.autoBuildFile).toString());
                if (!autoBuildFile.opencvVersion || !('autoBuildFlags' in autoBuildFile) || !Array.isArray(autoBuildFile.modules)) {
                    throw new Error('auto-build.json has invalid contents');
                }
                return autoBuildFile;
            }
            npmlog_1.default.info('readAutoBuildFile', 'file does not exists: %s', this.autoBuildFile, this.autoBuildFile);
        }
        catch (err) {
            npmlog_1.default.error('readAutoBuildFile', 'failed to read auto-build.json from: %s, with error: %s', this.autoBuildFile, err.toString());
        }
        return undefined;
    }
}
exports.BuildContext = BuildContext;
exports.default = BuildContext;
