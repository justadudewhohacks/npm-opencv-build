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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupOpencv = void 0;
const fs_1 = __importDefault(require("fs"));
const _1 = require(".");
const constants_1 = require("./constants");
const env_1 = require("./env");
const findMsBuild_1 = require("./findMsBuild");
const utils_1 = require("./utils");
const npmlog_1 = __importDefault(require("npmlog"));
const rimraf_1 = __importDefault(require("rimraf"));
const util_1 = require("util");
const primraf = util_1.promisify(rimraf_1.default);
function getMsbuildCmd(sln) {
    return [
        sln,
        '/p:Configuration=Release',
        `/p:Platform=${process.arch === 'x64' ? 'x64' : 'x86'}`
    ];
}
function getRunBuildCmd(ctxt, msbuildExe) {
    if (msbuildExe) {
        return () => __awaiter(this, void 0, void 0, function* () {
            yield utils_1.spawn(`${msbuildExe}`, getMsbuildCmd('./OpenCV.sln'), { cwd: ctxt.opencvBuild });
            yield utils_1.spawn(`${msbuildExe}`, getMsbuildCmd('./INSTALL.vcxproj'), { cwd: ctxt.opencvBuild });
        });
    }
    return () => __awaiter(this, void 0, void 0, function* () {
        yield utils_1.spawn('make', ['install', `-j${env_1.numberOfCoresAvailable()}`], { cwd: ctxt.opencvBuild });
        // revert the strange archiving of libopencv.so going on with make install
        yield utils_1.spawn('make', ['all', `-j${env_1.numberOfCoresAvailable()}`], { cwd: ctxt.opencvBuild });
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
function getSharedCmakeFlags(ctxt) {
    let conditionalFlags = env_1.isWithoutContrib()
        ? []
        : [
            '-DOPENCV_ENABLE_NONFREE=ON',
            `-DOPENCV_EXTRA_MODULES_PATH=${ctxt.opencvContribModules}`
        ];
    if (env_1.buildWithCuda() && utils_1.isCudaAvailable()) {
        npmlog_1.default.info('install', 'Adding CUDA flags...');
        conditionalFlags = conditionalFlags.concat(getCudaCmakeFlags());
    }
    return constants_1.defaultCmakeFlags(ctxt)
        .concat(conditionalFlags)
        .concat(env_1.parseAutoBuildFlags());
    // .concat(['-DCMAKE_SYSTEM_PROCESSOR=arm64', '-DCMAKE_OSX_ARCHITECTURES=arm64']);
}
function getWinCmakeFlags(ctxt, msversion) {
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
    ].concat(getSharedCmakeFlags(ctxt));
}
function getCmakeArgs(ctxt, cmakeFlags) {
    return [ctxt.opencvSrc].concat(cmakeFlags);
}
function getMsbuildIfWin() {
    return __awaiter(this, void 0, void 0, function* () {
        if (utils_1.isWin()) {
            const msbuild = yield findMsBuild_1.findMsBuild();
            npmlog_1.default.info('install', 'using msbuild:', msbuild);
            return msbuild;
        }
        return undefined;
    });
}
function writeAutoBuildFile(ctxt) {
    const autoBuildFile = {
        opencvVersion: ctxt.opencvVersion,
        autoBuildFlags: env_1.autoBuildFlags(),
        modules: _1.getLibs(ctxt.opencvLibDir)
    };
    npmlog_1.default.info('install', 'writing auto-build file into directory: %s', ctxt.autoBuildFile);
    npmlog_1.default.info('install', JSON.stringify(autoBuildFile));
    fs_1.default.writeFileSync(ctxt.autoBuildFile, JSON.stringify(autoBuildFile, null, 4));
    return autoBuildFile;
}
function setupOpencv(ctxt) {
    return __awaiter(this, void 0, void 0, function* () {
        let keepSource = false;
        const { argv } = process;
        if (argv) {
            if (argv.includes('--keepsources') || argv.includes('--keep-sources') || argv.includes('--keepsource') || argv.includes('--keep-source'))
                keepSource = true;
        }
        const msbuild = yield getMsbuildIfWin();
        let cMakeFlags = [];
        let msbuildPath = undefined;
        // Get cmake flags here to check for CUDA early on instead of the start of the building process
        if (utils_1.isWin()) {
            if (!msbuild)
                throw Error('Error getting Ms Build info');
            cMakeFlags = getWinCmakeFlags(ctxt, "" + msbuild.version);
            msbuildPath = msbuild.path;
        }
        else {
            cMakeFlags = getSharedCmakeFlags(ctxt);
        }
        const tag = ctxt.opencvVersion;
        npmlog_1.default.info('install', 'installing opencv version %s into directory: %s', tag, ctxt.opencvRoot);
        yield primraf(ctxt.opencvBuild);
        yield primraf(ctxt.opencvSrc);
        yield primraf(ctxt.opencvContribSrc);
        fs_1.default.mkdirSync(ctxt.opencvBuild, { recursive: true });
        if (env_1.isWithoutContrib()) {
            npmlog_1.default.info('install', 'skipping download of opencv_contrib since OPENCV4NODEJS_AUTOBUILD_WITHOUT_CONTRIB is set');
        }
        else {
            yield utils_1.spawn('git', ['clone', '-b', `${tag}`, '--single-branch', '--depth', '1', '--progress', constants_1.opencvContribRepoUrl], { cwd: ctxt.opencvRoot });
        }
        yield utils_1.spawn('git', ['clone', '-b', `${tag}`, '--single-branch', '--depth', '1', '--progress', constants_1.opencvRepoUrl], { cwd: ctxt.opencvRoot });
        const cmakeArgs = getCmakeArgs(ctxt, cMakeFlags);
        npmlog_1.default.info('install', 'running cmake %s', cmakeArgs);
        yield utils_1.spawn('cmake', cmakeArgs, { cwd: ctxt.opencvBuild });
        npmlog_1.default.info('install', 'starting build...');
        yield getRunBuildCmd(ctxt, msbuildPath)();
        writeAutoBuildFile(ctxt);
        // cmake -D CMAKE_BUILD_TYPE=RELEASE -D ENABLE_NEON=ON 
        // -D ENABLE_TBB=ON -D ENABLE_IPP=ON -D ENABLE_VFVP3=ON -D WITH_OPENMP=ON -D WITH_CSTRIPES=ON -D WITH_OPENCL=ON -D CMAKE_INSTALL_PREFIX=/usr/local
        // -D OPENCV_EXTRA_MODULES_PATH=/root/[username]/opencv_contrib-3.4.0/modules/ ..
        if (!keepSource) {
            /**
             * DELETE TMP build dirs
             */
            try {
                yield primraf(ctxt.opencvSrc);
            }
            catch (err) {
                npmlog_1.default.error('install', 'failed to clean opencv source folder:', err);
                npmlog_1.default.error('install', 'consider removing the folder yourself: %s', ctxt.opencvSrc);
            }
            try {
                yield primraf(ctxt.opencvContribSrc);
            }
            catch (err) {
                npmlog_1.default.error('install', 'failed to clean opencv_contrib source folder:', err);
                npmlog_1.default.error('install', 'consider removing the folder yourself: %s', ctxt.opencvContribSrc);
            }
        }
    });
}
exports.setupOpencv = setupOpencv;
