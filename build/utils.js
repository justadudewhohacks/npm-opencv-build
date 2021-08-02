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
exports.isCudaAvailable = exports.isUnix = exports.isOSX = exports.isWin = exports.requireCmake = exports.requireGit = exports.spawn = exports.execFile = exports.exec = void 0;
const child_process = require("child_process");
const fs = require("fs");
const path = require("path");
const log = require("npmlog");
function exec(cmd, options) {
    log.silly('install', 'executing:', cmd);
    return new Promise(function (resolve, reject) {
        child_process.exec(cmd, options, function (err, stdout, stderr) {
            const _err = err || stderr;
            if (_err)
                return reject(_err);
            return resolve(stdout.toString());
        });
    });
}
exports.exec = exec;
function execFile(cmd, args, options) {
    log.silly('install', 'executing:', cmd, args);
    return new Promise(function (resolve, reject) {
        const child = child_process.execFile(cmd, args, options, function (err, stdout, stderr) {
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
    log.silly('install', 'spawning:', cmd, args);
    return new Promise(function (resolve, reject) {
        try {
            const child = child_process.spawn(cmd, args, Object.assign({ stdio: 'inherit' }, options));
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
function requireCmd(cmd, hint) {
    return __awaiter(this, void 0, void 0, function* () {
        log.info('install', `executing: ${cmd}`);
        try {
            const stdout = yield exec(cmd);
            log.info('install', `${cmd}: ${stdout}`);
        }
        catch (err) {
            const errMessage = `failed to execute ${cmd}, ${hint}, error is: ${err.toString()}`;
            throw new Error(errMessage);
        }
    });
}
function requireGit() {
    return __awaiter(this, void 0, void 0, function* () {
        yield requireCmd('git --version', 'git is required');
    });
}
exports.requireGit = requireGit;
function requireCmake() {
    return __awaiter(this, void 0, void 0, function* () {
        yield requireCmd('cmake --version', 'cmake is required to build opencv');
    });
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
function isCudaAvailable() {
    return __awaiter(this, void 0, void 0, function* () {
        log.info('install', 'Check if CUDA is available & what version...');
        if (isWin()) {
            try {
                yield requireCmd('nvcc --version', 'CUDA availability check');
                return true;
            }
            catch (err) {
                log.info('install', 'Seems like CUDA is not installed.');
                return false;
            }
        }
        // Because NVCC is not installed by default & requires an extra install step,
        // this is work around that always works
        const cudaVersionFilePath = path.resolve('/usr/local/cuda/version.txt');
        if (fs.existsSync(cudaVersionFilePath)) {
            const content = fs.readFileSync(cudaVersionFilePath, 'utf8');
            log.info('install', content);
            return true;
        }
        else {
            log.info('install', 'CUDA version file could not be found.');
            return false;
        }
    });
}
exports.isCudaAvailable = isCudaAvailable;
