import child_process from 'child_process';
import fs from 'fs';
import { EOL } from 'os';
import path from 'path';
import log from 'npmlog';
import pc from 'picocolors'

export const protect = (txt: string): string => { if (txt.includes(' ')) { return `"${txt}"` } else { return txt } }

export function toExecCmd(bin: string, args: string[]) {
  return `${protect(bin)} ${args.map(protect).join(' ')}`;
}

export function highlight(text: string): string {
  return pc.bold(pc.yellow(text));
}

export function light(text: string): string {
  return pc.yellow(text);
}

export function formatNumber(text: string): string {
  return pc.bold(pc.green(text));
}

export function exec(cmd: string, options?: child_process.ExecOptions): Promise<string> {
  log.silly('install', 'executing: %s', protect(cmd))
  return new Promise(function (resolve, reject) {
    child_process.exec(cmd, options, function (err, stdout, stderr) {
      const _err = err || stderr
      if (_err) return reject(_err)
      return resolve(stdout.toString())
    })
  })
}

/**
 * only used by findVs2017
 */
export function execFile(cmd: string, args: string[], options?: child_process.ExecOptions): Promise<string> {
  log.silly('install', 'executing: %s %s', protect(cmd), args.map(protect).join(' '))
  return new Promise(function (resolve, reject) {
    const child = child_process.execFile(cmd, args, options, function (err, stdout, stderr) {
      const _err = err || stderr
      if (_err) return reject(_err)
      return resolve(stdout.toString())
    })
    child.stdin && child.stdin.end()
  })
}

export function spawn(cmd: string, args: string[], options: child_process.ExecOptions): Promise<string> {
  log.silly('install', 'spawning:', protect(cmd), args.map(protect).join(' '))
  return new Promise(function (resolve, reject) {
    try {
      const child = child_process.spawn(cmd, args, { stdio: 'inherit', ...options })

      child.on('exit', function (code) {
        if (typeof code !== 'number') {
          code = null
        }
        const msg = `running: ${protect(cmd)} ${args.map(protect).join(' ')}${EOL}in ${options.cwd as string} exited with code ${code} (for more info, set \'--loglevel silly\')'`
        if (code !== 0) {
          return reject(msg)
        }
        return resolve(msg)
      })
    } catch (err) {
      return reject(err)
    }
  })
}

async function requireCmd(cmd: string, hint: string): Promise<string> {
  log.info('install', `executing: ${pc.cyan('%s')}`, cmd)
  try {
    const stdout = await exec(cmd)
    log.verbose('install', `${cmd}: ${stdout.trim()}`)
    return stdout;
  } catch (err) {
    const errMessage = `failed to execute ${cmd}, ${hint}, error is: ${err.toString()}`
    throw new Error(errMessage)
  }
}

export async function requireGit() {
  const out = await requireCmd('git --version', 'git is required')
  const version = out.match(/version ([\d.\w]+)/)
  if (version) {
    log.info('install', `git Version ${formatNumber("%s")} found`, version[1]);
  }
}

export async function requireCmake() {
  const out = await requireCmd('cmake --version', 'cmake is required to build opencv')
  const version = out.match(/version ([\d.\w]+)/)
  if (version) {
    log.info('install', `cmake Version ${formatNumber("%s")} found`, version[1]);
  }
}

/**
 * looks for cuda lib
 * @returns 
 */
export async function isCudaAvailable() {
  log.info('install', 'Check if CUDA is available & what version...');

  if (process.platform == 'win32') {
    try {
      await requireCmd('nvcc --version', 'CUDA availability check');
      return true;
    } catch (err) {
      log.info('install', 'Seems like CUDA is not installed.');
      return false;
    }
  }

  // Because NVCC is not installed by default & requires an extra install step,
  // this is work around that always works
  const cudeFileTxt = '/usr/local/cuda/version.txt';
  const cudeFileJson = '/usr/local/cuda/version.json';
  const cudaVersionFilePathTxt = path.resolve(cudeFileTxt);
  const cudaVersionFilePathJson = path.resolve(cudeFileJson);

  if (fs.existsSync(cudaVersionFilePathTxt)) {
    const content = fs.readFileSync(cudaVersionFilePathTxt, 'utf8');
    log.info('install', content);
    return true;
  }

  if (fs.existsSync(cudaVersionFilePathJson)) {
    const content = fs.readFileSync(cudaVersionFilePathJson, 'utf8');
    log.info('install', content);
    return true;
  }

  log.info('install', `CUDA version file could not be found in /usr/local/cuda/version.{txt,json}.`);
  return false;

}
