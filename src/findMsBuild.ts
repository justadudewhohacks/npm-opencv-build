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
      const reg = `${progFile.replace(/\\/g, '/')}/Microsoft Visual Studio/*/*/MSBuild/*/Bin/MSBuild.exe`;
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
    version: Number(m[1]),
  }
  log.silly('find-msbuild', 'using following msbuild:')
  log.silly('find-msbuild', 'version:', build.version)
  log.silly('find-msbuild', 'path:', build.path)
  return build
}

export async function findMsBuild(): Promise<pathVersion> {
  return await findMSBuild()
}