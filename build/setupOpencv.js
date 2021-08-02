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
exports.setupOpencv = void 0;
const fs = require("fs");
const path = require("path");
const _1 = require(".");
const constants_1 = require("./constants");
const dirs_1 = require("./dirs");
const env_1 = require("./env");
const findMsBuild_1 = require("./findMsBuild");
const utils_1 = require("./utils");
const log = require("npmlog");
const rimraf = require("rimraf");
const util_1 = require("util");
const primraf = util_1.promisify(rimraf);
function getMsbuildCmd(sln) {
    return [
        sln,
        '/p:Configuration=Release',
        `/p:Platform=${process.arch === 'x64' ? 'x64' : 'x86'}`
    ];
}
function getRunBuildCmd(msbuildExe) {
    if (msbuildExe) {
        return () => __awaiter(this, void 0, void 0, function* () {
            yield utils_1.spawn(`${msbuildExe}`, getMsbuildCmd('./OpenCV.sln'), { cwd: dirs_1.default.opencvBuild });
            yield utils_1.spawn(`${msbuildExe}`, getMsbuildCmd('./INSTALL.vcxproj'), { cwd: dirs_1.default.opencvBuild });
        });
    }
    return () => __awaiter(this, void 0, void 0, function* () {
        yield utils_1.spawn('make', ['install', `-j${env_1.numberOfCoresAvailable()}`], { cwd: dirs_1.default.opencvBuild });
        // revert the strange archiving of libopencv.so going on with make install
        yield utils_1.spawn('make', ['all', `-j${env_1.numberOfCoresAvailable()}`], { cwd: dirs_1.default.opencvBuild });
    });
}
function getCudaCmakeFlags() {
    return [
        '-DWITH_CUDA=ON',
        '-DBUILD_opencv_cudacodec=OFF',
        '-DCUDA_FAST_MATH=ON',
        '-DWITH_CUBLAS=ON', // optional
    ];
}
function getSharedCmakeFlags() {
    let conditionalFlags = env_1.isWithoutContrib()
        ? []
        : [
            '-DOPENCV_ENABLE_NONFREE=ON',
            `-DOPENCV_EXTRA_MODULES_PATH=${dirs_1.default.opencvContribModules}`
        ];
    if (env_1.buildWithCuda() && utils_1.isCudaAvailable()) {
        log.info('install', 'Adding CUDA flags...');
        conditionalFlags = conditionalFlags.concat(getCudaCmakeFlags());
    }
    return constants_1.defaultCmakeFlags
        .concat(conditionalFlags)
        .concat(env_1.parseAutoBuildFlags());
}
function getWinCmakeFlags(msversion) {
    const cmakeVsCompiler = constants_1.cmakeVsCompilers[msversion];
    const cmakeArch = constants_1.cmakeArchs[process.arch];
    if (!cmakeVsCompiler) {
        throw new Error(`no cmake vs compiler found for msversion: ${msversion}`);
    }
    if (!cmakeArch) {
        throw new Error(`no cmake arch found for process.arch: ${process.arch}`);
    }
    return [
        '-G',
        `${cmakeVsCompiler}${cmakeArch}`
    ].concat(getSharedCmakeFlags());
}
function getCmakeArgs(cmakeFlags) {
    return [dirs_1.default.opencvSrc].concat(cmakeFlags);
}
function getMsbuildIfWin() {
    return __awaiter(this, void 0, void 0, function* () {
        if (utils_1.isWin()) {
            const msbuild = yield findMsBuild_1.findMsBuild();
            log.info('install', 'using msbuild:', msbuild);
            return msbuild;
        }
        return undefined;
    });
}
function writeAutoBuildFile() {
    const autoBuildFile = {
        opencvVersion: env_1.opencvVersion(),
        autoBuildFlags: env_1.autoBuildFlags(),
        modules: _1.getLibs(dirs_1.default.opencvLibDir)
    };
    log.info('install', 'writing auto-build file into directory: %s', dirs_1.default.autoBuildFile);
    log.info('install', JSON.stringify(autoBuildFile));
    fs.writeFileSync(dirs_1.default.autoBuildFile, JSON.stringify(autoBuildFile, null, 4));
}
function setupOpencv() {
    return __awaiter(this, void 0, void 0, function* () {
        const msbuild = yield getMsbuildIfWin();
        let cMakeFlags = [];
        let msbuildPath = undefined;
        // Get cmake flags here to check for CUDA early on instead of the start of the building process
        if (utils_1.isWin()) {
            if (!msbuild)
                throw Error('Error getting Ms Build info');
            cMakeFlags = getWinCmakeFlags("" + msbuild.version);
            msbuildPath = msbuild.path;
        }
        else {
            cMakeFlags = getSharedCmakeFlags();
        }
        const tag = env_1.opencvVersion();
        log.info('install', 'installing opencv version %s into directory: %s', tag, dirs_1.default.opencvRoot);
        const opencvContribRoot = path.join(dirs_1.default.opencvRoot, 'opencv_contrib');
        const opencvRoot = path.join(dirs_1.default.opencvRoot, 'opencv');
        fs.mkdirSync(path.join(dirs_1.default.rootDir, 'opencv'), { recursive: true });
        yield primraf(path.join(dirs_1.default.opencvRoot, 'build'));
        fs.mkdirSync(path.join(dirs_1.default.opencvRoot, 'build'), { recursive: true });
        yield primraf(opencvRoot);
        yield primraf(opencvContribRoot);
        if (env_1.isWithoutContrib()) {
            log.info('install', 'skipping download of opencv_contrib since OPENCV4NODEJS_AUTOBUILD_WITHOUT_CONTRIB is set');
        }
        else {
            yield utils_1.spawn('git', ['clone', '-b', `${tag}`, '--single-branch', '--depth', '1', '--progress', constants_1.opencvContribRepoUrl], { cwd: dirs_1.default.opencvRoot });
        }
        yield utils_1.spawn('git', ['clone', '-b', `${tag}`, '--single-branch', '--depth', '1', '--progress', constants_1.opencvRepoUrl], { cwd: dirs_1.default.opencvRoot });
        const cmakeArgs = getCmakeArgs(cMakeFlags);
        log.info('install', 'running cmake %s', cmakeArgs);
        yield utils_1.spawn('cmake', cmakeArgs, { cwd: dirs_1.default.opencvBuild });
        log.info('install', 'starting build...');
        yield getRunBuildCmd(msbuildPath)();
        writeAutoBuildFile();
        /**
         * DELETE TMP build dirs
         */
        try {
            yield primraf(opencvRoot);
        }
        catch (err) {
            log.error('install', 'failed to clean opencv source folder:', err);
            log.error('install', 'consider removing the folder yourself: %s', opencvRoot);
        }
        try {
            yield primraf(opencvContribRoot);
        }
        catch (err) {
            log.error('install', 'failed to clean opencv_contrib source folder:', err);
            log.error('install', 'consider removing the folder yourself: %s', opencvContribRoot);
        }
    });
}
exports.setupOpencv = setupOpencv;
