import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { getDirname, getEnv, setEnv, getCwd, realPathSync } from "./env.ts";
import type { OpenCVBuildEnvParams } from "./misc.ts";
import * as detector from "./helper/detect.ts";
import type { AutoBuildFile } from "./types.ts";
import Log from "./Log.ts";
import { highlight } from "./utils.ts";

export interface BuildDesc {
  autobuild: string;
  buildInfo: AutoBuildFile;
  dir: string;
  hash: string;
  date: Date;
}

class StaticTools {
  private readEnvsFromPackageJsonLog = 0;

  /**
   * Find the proper root dir, this directory will contains all openCV source code and a subfolder per build
   * @param opts
   * @returns
   */
  public getBuildDir(opts = {} as OpenCVBuildEnvParams): string {
    let buildRoot = opts.buildRoot || getEnv("OPENCV_BUILD_ROOT") ||
      path.join(getDirname(), "..");
    if (buildRoot[0] === "~") {
      buildRoot = path.join(os.homedir(), buildRoot.slice(1));
    }
    return buildRoot;
  }

  public getPackageJson(opts = {} as OpenCVBuildEnvParams): string {
    const packageRoot = opts.rootcwd || getEnv("INIT_CWD") || getCwd();
    const absPath = path.resolve(packageRoot, "package.json");
    if (fs.existsSync(absPath)) {
      return realPathSync(absPath);
    }
    return absPath;
  }

  /**
   * autodetect path using common values.
   * @return number of updated env variable from 0 to 3
   */
  public autoLocatePrebuild(): { changes: number; summery: string[] } {
    let changes = 0;
    const summery = [] as string[];
    if (!getEnv("OPENCV_BIN_DIR")) {
      const candidate = detector.detectBinDir();
      if (candidate) {
        setEnv("OPENCV_BIN_DIR", candidate);
        changes++;
      }
    }
    if (!getEnv("OPENCV_LIB_DIR")) {
      const candidate = detector.detectLibDir();
      if (candidate) {
        setEnv("OPENCV_LIB_DIR", candidate);
        changes++;
      }
    }
    if (!getEnv("OPENCV_INCLUDE_DIR")) {
      const candidate = detector.detectIncludeDir();
      if (candidate) {
        setEnv("OPENCV_INCLUDE_DIR", candidate);
        changes++;
      }
    }
    return { changes, summery };
  }

  /**
   * list existing build in the diven directory
   * @param rootDir build directory
   * @returns builds list
   */
  public listBuild(rootDir: string): Array<BuildDesc> {
    let workFolderContent: string[] = [];
    try {
      workFolderContent = fs.readdirSync(rootDir);
    } catch (err) {
      throw new Error(
        "Failed to list directory: " + rootDir +
          " Check environement variable OPENCV_BUILD_ROOT, " + err,
      );
    }
    const versions = workFolderContent
      .filter((n) => n.startsWith("opencv-"))
      .map((dir) => {
        const autobuild = path.join(rootDir, dir, "auto-build.json");
        try {
          const stats = fs.statSync(autobuild);
          const hash = dir.replace(/^opencv-.+-/, "-");
          const buildInfo = this.readAutoBuildFile(
            autobuild,
            true,
          ) as AutoBuildFile;
          return { autobuild, dir, hash, buildInfo, date: stats.mtime };
        } catch (_err) {
          return {
            autobuild,
            dir,
            hash: "",
            buildInfo: null,
            date: 0,
          } as unknown as BuildDesc;
        }
      })
      .filter((n) => n.buildInfo);
    return versions;
  }

  /**
   * Read a parse an existing autoBuildFile
   * @param autoBuildFile file path
   * @returns
   */
  public readAutoBuildFile(
    autoBuildFile: string,
    quiet?: boolean,
  ): AutoBuildFile | undefined {
    try {
      const fileExists = fs.existsSync(autoBuildFile);
      if (fileExists) {
        const autoBuildFileData = JSON.parse(
          fs.readFileSync(autoBuildFile).toString(),
        ) as AutoBuildFile;
        if (
          !autoBuildFileData.opencvVersion ||
          !("autoBuildFlags" in autoBuildFileData) ||
          !Array.isArray(autoBuildFileData.modules)
        ) {
          // if (quiet) return undefined;
          throw new Error(
            `auto-build.json has invalid contents, please delete the file: ${autoBuildFile}`,
          );
        }
        return autoBuildFileData;
      }
      if (!quiet) {
        Log.log(
          "info",
          "readAutoBuildFile",
          "file does not exists: %s",
          autoBuildFile,
        );
      }
    } catch (err) {
      //if (!quiet)
      if (err instanceof Error) {
        Log.log(
          "error",
          "readAutoBuildFile",
          "failed to read auto-build.json from: %s, with error: %s",
          autoBuildFile,
          err.toString(),
        );
      } else {
        Log.log(
          "error",
          "readAutoBuildFile",
          "failed to read auto-build.json from: %s, with error: %s",
          autoBuildFile,
          JSON.stringify(err),
        );
      }
    }
    return undefined;
  }

  /**
   * extract opencv4nodejs section from package.json if available
   */
  private parsePackageJson(opts = {} as OpenCVBuildEnvParams): {
    file: string;
    data: { opencv4nodejs?: { [key: string]: string | boolean | number } };
  } | null {
    const absPath = this.getPackageJson(opts);
    if (!fs.existsSync(absPath)) {
      return null;
    }
    const data = JSON.parse(fs.readFileSync(absPath).toString());
    return { file: absPath, data };
  }

  /**
   * get opencv4nodejs section from package.json if available
   * @returns opencv4nodejs customs
   */
  public readEnvsFromPackageJson(opts = {} as OpenCVBuildEnvParams): {
    [key: string]: string | boolean | number;
  } | null {
    const rootPackageJSON = this.parsePackageJson(opts);
    if (!rootPackageJSON) {
      return null;
    }

    if (!rootPackageJSON.data) {
      if (!this.readEnvsFromPackageJsonLog++) {
        Log.log(
          "info",
          "config",
          `looking for opencv4nodejs option from ${highlight("%s")}`,
          rootPackageJSON.file,
        );
      }
      return {};
    }
    if (!rootPackageJSON.data.opencv4nodejs) {
      if (!this.readEnvsFromPackageJsonLog++) {
        Log.log(
          "info",
          "config",
          `no opencv4nodejs section found in ${highlight("%s")}`,
          rootPackageJSON.file,
        );
      }
      return {};
    }
    if (!this.readEnvsFromPackageJsonLog++) {
      Log.log(
        "info",
        "config",
        `found opencv4nodejs section in ${highlight("%s")}`,
        rootPackageJSON.file,
      );
    }
    return rootPackageJSON.data.opencv4nodejs;
  }
}

const singleton: StaticTools = new StaticTools();
export default singleton;
