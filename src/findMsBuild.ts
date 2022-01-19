import log from 'npmlog';
import { execFile, formatNumber, light } from './utils.js';
import blob from 'glob';
import { promisify } from 'util';

export interface pathVersion {
  version: number;
  path: string;
}

/**
 * @returns take the last MSBuild.exe version in PROGRAMFILES
 */
async function findMSBuild(): Promise<pathVersion> {
  const pblob = promisify(blob)

  const progFiles = new Set([process.env.programfiles, process.env.ProgramW6432, process.env['programfiles(x86)']]);
  const matches: string[] = [];

  for (const progFile of progFiles) {
    if (progFile) {
      const reg = `${progFile}/Microsoft Visual Studio/*/BuildTools/MSBuild/*/Bin/MSBuild.exe`;
      for (const m of await pblob(reg, {}))
        matches.push(m);
    }
  }
  matches.sort();

  if (!matches.length) {
    return Promise.reject('no Microsoft Visual Studio found in program files directorys')
  }
  if (matches.length > 1) {
    log.warn('find-msbuild', `find ${formatNumber('' + matches.length)} MSBuild version: [${matches.map(path => light(path)).join(', ')}]`)
  }

  log.silly('find-msbuild', matches.join(', '));
  const selected = matches[matches.length - 1];
  const txt = await execFile(selected, ['/version']);
  const m = txt.match(/(\d+)\.\d+/)
  if (!m)
    return Promise.reject('fail to get MSBuild.exe version number');
  const build = {
    path: selected,
    version: Number(m[1])
  }
  log.silly('find-msbuild', 'using following msbuild:')
  log.silly('find-msbuild', 'version:', build.version)
  log.silly('find-msbuild', 'path:', build.path)
  return build
}

// function parseMsBuilds(stdout: string): pathVersion[] {
//   let reVers = /ToolsVersions\\([^\\]+)$/i
//     , rePath = /\r\n[ \t]+MSBuildToolsPath[ \t]+REG_SZ[ \t]+([^\r]+)/i
// 
//   let msbuilds: pathVersion[] = []
// 
//   stdout.split('\r\n\r\n').forEach(function (l: any) {
//     if (!l) return
//     l = l.trim()
//     const r1 = reVers.exec(l.substring(0, l.indexOf('\r\n')));
//     if (r1) {
//       var ver = parseFloat(r1[1])
//       if (ver >= 3.5) {
//         const r2 = rePath.exec(l);
//         if (r2) {
//           msbuilds.push({
//             version: ver,
//             path: r2[1]
//           })
//         }
//       }
//     }
//   })
//   return msbuilds
// }

// async function findMsbuildInRegistry(): Promise<pathVersion> {
//   const cmd = `reg query "HKLM\\Software\\Microsoft\\MSBuild\\ToolsVersions" /s${process.arch === 'ia32' ? '' : ' /reg:32'}`
//   log.silly('find-msbuild', 'find msbuild in registry:', cmd)
// 
//   const stdout = await exec(cmd);
//   log.silly('find-msbuild', 'find vs: ', stdout)
// 
//   // use most recent version
//   const msbuilds = parseMsBuilds(stdout)
//     .sort((m1, m2) => m2.version - m1.version)
//     .map(msbuild => Object.assign({}, msbuild, { path: path.resolve(msbuild.path, 'msbuild.exe') }))
// 
//   if (!msbuilds.length) {
//     return Promise.reject('failed to find msbuild in registry')
//   }
// 
//   log.info('find-msbuild', 'trying the following msbuild paths:')
//   msbuilds.forEach((msbuild) => {
//     log.info('find-msbuild', 'version: %s, path: %s', msbuild.version, msbuild.path)
//   })
// 
//   const build = msbuilds.find((msbuild) => {
//     try {
//       return fs.statSync(msbuild.path)
//     } catch (err) {
//       if (err.code == 'ENOENT') {
//         return false
//       }
//       throw err
//     }
//   })
// 
//   if (!build) {
//     return Promise.reject('could not find msbuild.exe from path in registry')
//   }
// 
//   log.silly('find-msbuild', 'using following msbuild:')
//   log.silly('find-msbuild', 'version:', build.version)
//   log.silly('find-msbuild', 'path:', build.path)
//   return Promise.resolve(build)
// }

export async function findMsBuild(): Promise<pathVersion> {
  //try {
  return await findMSBuild()
  //} catch (err) {
  //  log.info('find-msbuild', 'failed to find vs2017 via powershell:', err)
  //  log.info('find-msbuild', 'attempting to find msbuild via registry query...')
  //  return await findMsbuildInRegistry()
  //}
}