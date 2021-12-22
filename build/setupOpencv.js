"use strict";
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
const primraf = (0, util_1.promisify)(rimraf_1.default);
function getMsbuildCmd(sln) {
    return [
        sln,
        '/p:Configuration=Release',
        `/p:Platform=${process.arch === 'x64' ? 'x64' : 'x86'}`
    ];
}
function getRunBuildCmd(ctxt, msbuildExe) {
    if (msbuildExe) {
        return async () => {
            await (0, utils_1.spawn)(`${msbuildExe}`, getMsbuildCmd('./OpenCV.sln'), { cwd: ctxt.opencvBuild });
            await (0, utils_1.spawn)(`${msbuildExe}`, getMsbuildCmd('./INSTALL.vcxproj'), { cwd: ctxt.opencvBuild });
        };
    }
    return async () => {
        await (0, utils_1.spawn)('make', ['install', `-j${(0, env_1.numberOfCoresAvailable)()}`], { cwd: ctxt.opencvBuild });
        // revert the strange archiving of libopencv.so going on with make install
        await (0, utils_1.spawn)('make', ['all', `-j${(0, env_1.numberOfCoresAvailable)()}`], { cwd: ctxt.opencvBuild });
    };
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
    let conditionalFlags = (0, env_1.isWithoutContrib)()
        ? []
        : [
            '-DOPENCV_ENABLE_NONFREE=ON',
            `-DOPENCV_EXTRA_MODULES_PATH=${ctxt.opencvContribModules}`
        ];
    if ((0, env_1.buildWithCuda)() && (0, utils_1.isCudaAvailable)()) {
        npmlog_1.default.info('install', 'Adding CUDA flags...');
        conditionalFlags = conditionalFlags.concat(getCudaCmakeFlags());
    }
    return (0, constants_1.defaultCmakeFlags)(ctxt)
        .concat(conditionalFlags)
        .concat((0, env_1.parseAutoBuildFlags)());
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
async function getMsbuildIfWin() {
    if ((0, utils_1.isWin)()) {
        const msbuild = await (0, findMsBuild_1.findMsBuild)();
        npmlog_1.default.info('install', 'using msbuild:', msbuild);
        return msbuild;
    }
    return undefined;
}
function writeAutoBuildFile(ctxt) {
    const autoBuildFile = {
        opencvVersion: ctxt.opencvVersion,
        autoBuildFlags: (0, env_1.autoBuildFlags)(),
        modules: (0, _1.getLibs)(ctxt.opencvLibDir)
    };
    npmlog_1.default.info('install', 'writing auto-build file into directory: %s', ctxt.autoBuildFile);
    npmlog_1.default.info('install', JSON.stringify(autoBuildFile));
    fs_1.default.writeFileSync(ctxt.autoBuildFile, JSON.stringify(autoBuildFile, null, 4));
    return autoBuildFile;
}
async function setupOpencv(ctxt) {
    let keepSource = false;
    const { argv } = process;
    if (argv) {
        if (argv.includes('--keepsources') || argv.includes('--keep-sources') || argv.includes('--keepsource') || argv.includes('--keep-source'))
            keepSource = true;
    }
    const msbuild = await getMsbuildIfWin();
    let cMakeFlags = [];
    let msbuildPath = undefined;
    // Get cmake flags here to check for CUDA early on instead of the start of the building process
    if ((0, utils_1.isWin)()) {
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
    await primraf(ctxt.opencvBuild);
    await primraf(ctxt.opencvSrc);
    await primraf(ctxt.opencvContribSrc);
    fs_1.default.mkdirSync(ctxt.opencvBuild, { recursive: true });
    if ((0, env_1.isWithoutContrib)()) {
        npmlog_1.default.info('install', 'skipping download of opencv_contrib since OPENCV4NODEJS_AUTOBUILD_WITHOUT_CONTRIB is set');
    }
    else {
        await (0, utils_1.spawn)('git', ['clone', '-b', `${tag}`, '--single-branch', '--depth', '1', '--progress', constants_1.opencvContribRepoUrl], { cwd: ctxt.opencvRoot });
    }
    await (0, utils_1.spawn)('git', ['clone', '-b', `${tag}`, '--single-branch', '--depth', '1', '--progress', constants_1.opencvRepoUrl], { cwd: ctxt.opencvRoot });
    const cmakeArgs = getCmakeArgs(ctxt, cMakeFlags);
    npmlog_1.default.info('install', 'running cmake %s', cmakeArgs);
    await (0, utils_1.spawn)('cmake', cmakeArgs, { cwd: ctxt.opencvBuild });
    npmlog_1.default.info('install', 'starting build...');
    await getRunBuildCmd(ctxt, msbuildPath)();
    writeAutoBuildFile(ctxt);
    // cmake -D CMAKE_BUILD_TYPE=RELEASE -D ENABLE_NEON=ON 
    // -D ENABLE_TBB=ON -D ENABLE_IPP=ON -D ENABLE_VFVP3=ON -D WITH_OPENMP=ON -D WITH_CSTRIPES=ON -D WITH_OPENCL=ON -D CMAKE_INSTALL_PREFIX=/usr/local
    // -D OPENCV_EXTRA_MODULES_PATH=/root/[username]/opencv_contrib-3.4.0/modules/ ..
    if (!keepSource) {
        /**
         * DELETE TMP build dirs
         */
        try {
            await primraf(ctxt.opencvSrc);
        }
        catch (err) {
            npmlog_1.default.error('install', 'failed to clean opencv source folder:', err);
            npmlog_1.default.error('install', 'consider removing the folder yourself: %s', ctxt.opencvSrc);
        }
        try {
            await primraf(ctxt.opencvContribSrc);
        }
        catch (err) {
            npmlog_1.default.error('install', 'failed to clean opencv_contrib source folder:', err);
            npmlog_1.default.error('install', 'consider removing the folder yourself: %s', ctxt.opencvContribSrc);
        }
    }
}
exports.setupOpencv = setupOpencv;
