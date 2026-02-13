import child_process from "node:child_process";
import fs from "node:fs";
import { EOL } from "node:os";
import path from "node:path";
import pc from "picocolors";
import { getEnv, Platfrm } from "./env.ts";
import Log from "./Log.ts";

/**
 * excape spaces for shell execution
 * @param txt text to escape
 * @returns a shell no spaced parameter
 */
export const protect = (txt: string): string => {
  if (txt.includes(" ")) return `"${txt}"`;
  else return txt;
};

export function toExecCmd(bin: string, args: string[]) {
  return `${protect(bin)} ${args.map(protect).join(" ")}`;
}

export function highlight(text: string): string {
  return pc.bold(pc.yellow(String(text)));
}

export function light(text: string): string {
  return pc.yellow(String(text));
}

export function formatRed(text: string): string {
  return pc.red(String(text));
}

export function formatNumber(text: string | number): string {
  return pc.bold(pc.green(String(text)));
}

export function exec(
  cmd: string,
  options?: child_process.ExecOptions,
): Promise<string> {
  Log.log("silly", "install", "executing: %s", protect(cmd));
  return new Promise(function (resolve, reject) {
    child_process.exec(cmd, options, function (err, stdout, stderr) {
      const _err = err || stderr;
      if (_err) return reject(_err);
      return resolve(stdout.toString());
    });
  });
}

export function execSync(
  cmd: string,
  options?: child_process.ExecSyncOptionsWithStringEncoding,
): string {
  Log.log("silly", "install", "executing: %s", protect(cmd));
  const stdout = child_process.execSync(cmd, options);
  return stdout.toString();
}

/**
 * only used by findVs2017
 */
export function execFile(
  cmd: string,
  args: string[],
  options?: child_process.ExecOptions,
): Promise<string> {
  Log.log(
    "silly",
    "install",
    "executing: %s %s",
    protect(cmd),
    args.map(protect).join(" "),
  );
  return new Promise(function (resolve, reject) {
    const child = child_process.execFile(
      cmd,
      args,
      options,
      function (err, stdout, stderr) {
        const _err = err || stderr;
        if (_err) return reject(_err);
        return resolve(stdout.toString());
      },
    );
    child.stdin && child.stdin.end();
  });
}

export function spawn(
  cmd: string,
  args: string[],
  options: child_process.ExecOptions,
  filters?: {
    err?: (data: Uint8Array) => Uint8Array | null;
    out?: (data: Uint8Array) => Uint8Array | null;
  },
): Promise<string> {
  filters = filters || {};
  const filterStdout = (data: Uint8Array) => {
    if (filters && filters.out) {
      data = filters.out(data) as Uint8Array;
      if (!data) {
        return;
      }
    }
    // process.stdout.write(data);
    Deno.stdout.write(data);
  };

  const filterStderr = (data: Uint8Array) => {
    if (filters && filters.err) {
      data = filters.err(data) as Uint8Array;
      if (!data) {
        return;
      }
    }
    // process.stderr.write(data);
    Deno.stdout.write(data);
  };

  Log.log(
    "silly",
    "install",
    "spawning:",
    protect(cmd),
    args.map(protect).join(" "),
  );
  return new Promise(function (resolve, reject) {
    try {
      const child = child_process.spawn(cmd, args, {
        stdio: ["inherit", "pipe", "pipe"],
        ...options,
      });
      child.stderr.on("data", filterStderr);
      child.stdout.on("data", filterStdout);
      child.on("exit", function (code) {
        if (typeof code !== "number") {
          code = null;
        }
        const msg = `running: ${protect(cmd)} ${
          args.map(protect).join(" ")
        }${EOL}in ${options
          .cwd as string} exited with code ${code} (for more info, set '--loglevel silly')'`;
        // if (code !== 0)
        //   console.log(`End of spawn ${cmd} ${args.join(' ')} RET:`, code);
        if (code !== 0) {
          return reject(msg);
        }
        return resolve(msg);
      });
    } catch (err) {
      return reject(err);
    }
  });
}

async function requireCmd(cmd: string, hint: string): Promise<string> {
  Log.log("silly", "install", `executing: ${pc.cyan("%s")}`, cmd);
  try {
    const stdout = await exec(cmd);
    Log.log("verbose", "install", `${cmd}: ${stdout.trim()}`);
    return stdout;
  } catch (err) {
    let errMessage = `failed to execute ${cmd}, ${hint}, error is: `;
    if (err instanceof Error) {
      errMessage += err.toString();
    } else {
      errMessage += JSON.stringify(err);
    }
    throw new Error(errMessage);
  }
}

function requireCmdSync(cmd: string, hint: string): string {
  Log.log("info", "install", `executing: ${pc.cyan("%s")}`, cmd);
  try {
    const stdout = execSync(cmd);
    Log.log("verbose", "install", `${cmd}: ${stdout.trim()}`);
    return stdout;
  } catch (err) {
    let errMessage = `failed to execute ${cmd}, ${hint}, error is: `;
    if (err instanceof Error) {
      errMessage += err.toString();
    } else {
      errMessage += JSON.stringify(err);
    }
    throw new Error(errMessage);
  }
}

export async function requireGit() {
  const out = await requireCmd("git --version", "git is required");
  const version = out.match(/version ([\d.\w]+)/);
  if (version) {
    Log.log(
      "info",
      "install",
      `git Version ${formatNumber("%s")} found`,
      version[1],
    );
  }
}

export async function requireCmake() {
  const out = await requireCmd(
    "cmake --version",
    "cmake is required to build opencv",
  );
  const version = out.match(/version ([\d.\w]+)/);
  if (version) {
    Log.log(
      "info",
      "install",
      `cmake Version ${formatNumber("%s")} found`,
      version[1],
    );
  }
}

let cached_cuda: null | boolean = null;
/**
 * looks for cuda lib
 * @returns
 */
export function isCudaAvailable(): boolean {
  if (cached_cuda != null) {
    return cached_cuda;
  }
  Log.log("info", "install", "Check if CUDA is available & what version...");
  if (Platfrm.isWindows) {
    try {
      requireCmdSync("nvcc --version", "CUDA availability check");
      // return true;
    } catch (_err) {
      Log.log(
        "info",
        "install",
        "Seems like CUDA is not installed; nvcc --version call failed",
      );
      return false;
    }
  }
  // Because NVCC is not installed by default & requires an extra install step,
  // this is work around that always works
  const CUDA_PATH = getEnv("CUDA_PATH");
  for (const cudaPath of [CUDA_PATH, "/usr/local/cuda/"]) {
    if (!cudaPath) {
      continue;
    }
    if (!fs.existsSync(cudaPath)) {
      continue;
    }
    for (const file of ["version.txt", "version.json"]) {
      const realpath = path.resolve(cudaPath, file);
      if (fs.existsSync(realpath)) {
        const content = fs.readFileSync(realpath, "utf8");
        Log.log("info", "install", content);
        cached_cuda = true;
        return true;
      }
    }
  }
  Log.log(
    "info",
    "install",
    `CUDA version file could not be found in {/usr/local/cuda/,CUDA_PATH}version.{txt,json}`,
  );
  cached_cuda = false;
  return false;
}
