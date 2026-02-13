import path from "node:path";
import { globSync } from "glob";
import Log from "./Log.ts";
import { execFile, formatNumber, highlight, light } from "./utils.ts";
import { getEnv } from "./env.ts";

export interface PathVersion {
  version: number;
  path: string;
}

/**
 * @returns all MSBuild.exe version in PROGRAM FILES most recent first.
 */
export async function findMSBuild(): Promise<PathVersion[]> {
  const progFiles = new Set([
    getEnv("programfiles"),
    getEnv("ProgramW6432"),
    getEnv("programfiles(x86)"),
  ]);
  const matches: string[] = [];

  for (const progFile of progFiles) {
    if (progFile) {
      const reg = `${
        progFile.replace(/\\/g, "/")
      }/Microsoft Visual Studio/*/*/MSBuild/*/Bin/MSBuild.exe`;
      for (const m of globSync(reg)) {
        matches.push(path.resolve(m));
      }
    }
  }
  matches.sort();
  if (!matches.length) {
    return Promise.reject(
      "no Microsoft Visual Studio found in program files directorys",
    );
  }
  if (matches.length > 1) {
    Log.log(
      "warn",
      "find-msbuild",
      `find ${formatNumber(matches.length)} MSBuild version: [${
        matches.map((path) => light(path)).join(", ")
      }]`,
    );
  }
  const pbuilds = matches.map(async (selected: string) => {
    Log.log("silly", "find-msbuild", matches.join(", "));
    // const selected = matches[matches.length - 1];
    const txt = await execFile(selected, ["/version"]);
    const m = txt.match(/(\d+)\.\d+/);
    if (!m) {
      Log.log(
        "warn",
        "find-msbuild",
        `${selected} is not a valid msbuild path, can not find it's versdion`,
      );
      return {
        path: selected,
        version: 0,
      };
    }
    //   return Promise.reject('fail to get MSBuild.exe version number');
    Log.log(
      "info",
      "find-msbuild",
      `discover msbuild v${formatNumber("%s")} in ${highlight("%s")}`,
      m[1],
      selected,
    );
    return {
      path: selected,
      version: Number(m[1]),
    };
  });
  const builds = await Promise.all(pbuilds);
  // drop versionnumber = 0;
  return builds.filter((a) => a.version).reverse();
}
