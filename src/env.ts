import { dirname } from "node:path";
import process from "node:process";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * portable env functions
 */

export function getEnv(name: string): string {
  if (!name) {
    return "";
  }
  return process.env[name] || "";
}

export function setEnv(name: string, value: string): void {
  process.env[name] = value;
}

export function getCwd(): string {
  return process.cwd();
}

export function realPathSync(path: string): string {
  return fs.realpathSync(path);
}

export function getDirname(): string {
  // return __dirname if it's a nodejs script
  // if (typeof __dirname !== "undefined") {
  // return __dirname;
  // }
  // return import.meta.url if it's a module
  const __dirname = dirname(fileURLToPath(import.meta.url));
  return __dirname; // new URL(".", import.meta.url).pathname;
}

export class Platfrm {
  public static theOS: string = process.platform;

  public static changeOS(os: "windows" | "linux" | "darwin" | string) {
    Platfrm.theOS = os;
  }
  public static get isWindows(): boolean {
    return Platfrm.theOS.startsWith("win"); //  === 'windows';
  }
  public static get isLinux(): boolean {
    return Platfrm.theOS === "linux";
  }
  public static get isMac(): boolean {
    return Platfrm.theOS === "darwin";
  }
}

export function getArch(): string {
  return process.arch;
}
