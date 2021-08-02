"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Dirs = void 0;
const path = require("path");
const env_1 = require("./env");
const utils_1 = require("./utils");
class Dirs {
    get rootDir() {
        return path.resolve(__dirname, '../');
    }
    get opencvRoot() {
        return path.join(this.rootDir, `opencv-${env_1.opencvVersion()}`);
    }
    get opencvSrc() {
        return path.join(this.opencvRoot, 'opencv');
    }
    get opencvContribSrc() {
        return path.join(this.opencvRoot, 'opencv_contrib');
    }
    get opencvContribModules() {
        return path.join(this.opencvContribSrc, 'modules');
    }
    get opencvBuild() {
        return path.join(this.opencvRoot, 'build');
    }
    get opencvInclude() {
        return path.join(this.opencvBuild, 'include');
    }
    get opencv4Include() {
        return path.join(this.opencvInclude, 'opencv4');
    }
    get opencvLibDir() {
        return utils_1.isWin() ? path.join(this.opencvBuild, 'lib/Release') : path.join(this.opencvBuild, 'lib');
    }
    get opencvBinDir() {
        return utils_1.isWin() ? path.join(this.opencvBuild, 'bin/Release') : path.join(this.opencvBuild, 'bin');
    }
    get autoBuildFile() {
        return path.join(this.opencvRoot, 'auto-build.json');
    }
}
exports.Dirs = Dirs;
const singleton = new Dirs();
exports.default = singleton;
