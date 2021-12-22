"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isCudaAvailable = exports.isUnix = exports.isOSX = exports.isWin = exports.requireCmake = exports.requireGit = exports.spawn = exports.execFile = exports.exec = void 0;
const child_process_1 = __importDefault(require("child_process"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const npmlog_1 = __importDefault(require("npmlog"));
function exec(cmd, options) {
    npmlog_1.default.silly('install', 'executing:', cmd);
    return new Promise(function (resolve, reject) {
        child_process_1.default.exec(cmd, options, function (err, stdout, stderr) {
            const _err = err || stderr;
            if (_err)
                return reject(_err);
            return resolve(stdout.toString());
        });
    });
}
exports.exec = exec;
function execFile(cmd, args, options) {
    npmlog_1.default.silly('install', 'executing:', cmd, args);
    return new Promise(function (resolve, reject) {
        const child = child_process_1.default.execFile(cmd, args, options, function (err, stdout, stderr) {
            const _err = err || stderr;
            if (_err)
                return reject(_err);
            return resolve(stdout.toString());
        });
        child.stdin && child.stdin.end();
    });
}
exports.execFile = execFile;
function spawn(cmd, args, options) {
    npmlog_1.default.silly('install', 'spawning:', cmd, args);
    return new Promise(function (resolve, reject) {
        try {
            const child = child_process_1.default.spawn(cmd, args, { stdio: 'inherit', ...options });
            child.on('exit', function (code) {
                if (typeof code !== 'number') {
                    code = null;
                }
                const msg = 'child process exited with code ' + code + ' (for more info, set \'--loglevel silly\')';
                if (code !== 0) {
                    return reject(msg);
                }
                return resolve(msg);
            });
        }
        catch (err) {
            return reject(err);
        }
    });
}
exports.spawn = spawn;
async function requireCmd(cmd, hint) {
    npmlog_1.default.info('install', `executing: ${cmd}`);
    try {
        const stdout = await exec(cmd);
        npmlog_1.default.info('install', `${cmd}: ${stdout}`);
    }
    catch (err) {
        const errMessage = `failed to execute ${cmd}, ${hint}, error is: ${err.toString()}`;
        throw new Error(errMessage);
    }
}
async function requireGit() {
    await requireCmd('git --version', 'git is required');
}
exports.requireGit = requireGit;
async function requireCmake() {
    await requireCmd('cmake --version', 'cmake is required to build opencv');
}
exports.requireCmake = requireCmake;
function isWin() {
    return process.platform == 'win32';
}
exports.isWin = isWin;
function isOSX() {
    return process.platform == 'darwin';
}
exports.isOSX = isOSX;
function isUnix() {
    return !isWin() && !isOSX();
}
exports.isUnix = isUnix;
async function isCudaAvailable() {
    npmlog_1.default.info('install', 'Check if CUDA is available & what version...');
    if (isWin()) {
        try {
            await requireCmd('nvcc --version', 'CUDA availability check');
            return true;
        }
        catch (err) {
            npmlog_1.default.info('install', 'Seems like CUDA is not installed.');
            return false;
        }
    }
    // Because NVCC is not installed by default & requires an extra install step,
    // this is work around that always works
    const cudaVersionFilePath = path_1.default.resolve('/usr/local/cuda/version.txt');
    if (fs_1.default.existsSync(cudaVersionFilePath)) {
        const content = fs_1.default.readFileSync(cudaVersionFilePath, 'utf8');
        npmlog_1.default.info('install', content);
        return true;
    }
    else {
        npmlog_1.default.info('install', 'CUDA version file could not be found.');
        return false;
    }
}
exports.isCudaAvailable = isCudaAvailable;
