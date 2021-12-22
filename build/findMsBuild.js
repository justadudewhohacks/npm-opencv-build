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
exports.findMsBuild = void 0;
const log = __importStar(require("npmlog"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const utils_1 = require("./utils");
/* this codesnippet is partly taken from the node-gyp source: https://github.com/nodejs/node-gyp */
async function findVs2017() {
    const ps = path.join(process.env.SystemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
    const args = ['-ExecutionPolicy', 'Unrestricted', '-Command',
        '&{Add-Type -Path \'' + path.join(__dirname, '../Find-VS2017.cs') +
            '\'; [VisualStudioConfiguration.Main]::Query()}'];
    log.silly('find-msbuild', 'find vs2017 via powershell:', ps, args);
    //  default is {  encoding: 'utf8' })
    const stdout = await (0, utils_1.execFile)(ps, args);
    log.silly('find-msbuild', 'find vs2017: ', stdout);
    const vsSetup = JSON.parse(stdout);
    if (!vsSetup || !vsSetup.path || !vsSetup.sdk) {
        return Promise.reject('unexpected powershell output');
    }
    log.silly('find-msbuild', 'found vs2017');
    log.silly('find-msbuild', 'path', vsSetup.path);
    log.silly('find-msbuild', 'sdk', vsSetup.sdk);
    const build = {
        path: path.join(vsSetup.path, 'MSBuild', '15.0', 'Bin', 'MSBuild.exe'),
        version: 15
    };
    log.silly('find-msbuild', 'using following msbuild:');
    log.silly('find-msbuild', 'version:', build.version);
    log.silly('find-msbuild', 'path:', build.path);
    return build;
}
function parseMsBuilds(stdout) {
    let reVers = /ToolsVersions\\([^\\]+)$/i, rePath = /\r\n[ \t]+MSBuildToolsPath[ \t]+REG_SZ[ \t]+([^\r]+)/i;
    let msbuilds = [];
    stdout.split('\r\n\r\n').forEach(function (l) {
        if (!l)
            return;
        l = l.trim();
        const r1 = reVers.exec(l.substring(0, l.indexOf('\r\n')));
        if (r1) {
            var ver = parseFloat(r1[1]);
            if (ver >= 3.5) {
                const r2 = rePath.exec(l);
                if (r2) {
                    msbuilds.push({
                        version: ver,
                        path: r2[1]
                    });
                }
            }
        }
    });
    return msbuilds;
}
async function findMsbuildInRegistry() {
    const cmd = `reg query "HKLM\\Software\\Microsoft\\MSBuild\\ToolsVersions" /s${process.arch === 'ia32' ? '' : ' /reg:32'}`;
    log.silly('find-msbuild', 'find msbuild in registry:', cmd);
    const stdout = await (0, utils_1.exec)(cmd);
    log.silly('find-msbuild', 'find vs: ', stdout);
    // use most recent version
    const msbuilds = parseMsBuilds(stdout)
        .sort((m1, m2) => m2.version - m1.version)
        .map(msbuild => Object.assign({}, msbuild, { path: path.resolve(msbuild.path, 'msbuild.exe') }));
    if (!msbuilds.length) {
        return Promise.reject('failed to find msbuild in registry');
    }
    log.info('find-msbuild', 'trying the following msbuild paths:');
    msbuilds.forEach((msbuild) => {
        log.info('find-msbuild', 'version: %s, path: %s', msbuild.version, msbuild.path);
    });
    const build = msbuilds.find((msbuild) => {
        try {
            return fs.statSync(msbuild.path);
        }
        catch (err) {
            if (err.code == 'ENOENT') {
                return false;
            }
            throw err;
        }
    });
    if (!build) {
        return Promise.reject('could not find msbuild.exe from path in registry');
    }
    log.silly('find-msbuild', 'using following msbuild:');
    log.silly('find-msbuild', 'version:', build.version);
    log.silly('find-msbuild', 'path:', build.path);
    return Promise.resolve(build);
}
async function findMsBuild() {
    try {
        return await findVs2017();
    }
    catch (err) {
        log.info('find-msbuild', 'failed to find vs2017 via powershell:', err);
        log.info('find-msbuild', 'attempting to find msbuild via registry query...');
        return await findMsbuildInRegistry();
    }
}
exports.findMsBuild = findMsBuild;
