# Changelog

## V 0.7.6
- fix parameter separator detection by piercus

## V 0.7.5
- improve autoBuildFlags support

## V 0.7.4
- force world module detection

## V 0.7.3
- change default build module list, remove world module
- add a symlink named latest pointing to the latest build

## V 0.7.2
- restore previous compiled module list from v 0.6.3

## V 0.7.1
- world module do not exclude other modules in auto-build.json (fix img_hash modules)

## V 0.7.0
- Rollback ESM to CJS first (ESM build is still available)
- modules in cMakeflags are now sort in alphabetic order to keep build hash consistante.
- build module list is now an up to date set
- img_hash is now enabled by default
- all cuda module (except cudalegacy) are now enabled once cuda is enabled 
- auto-build.json now contains list of enabled modules.

## V 0.6.3
- CJS First
- enforce opencv version check durring version detection

## V 0.6.2
- CJS + ESM build

## V 0.6.1
- improve OpenCVBuildEnv, exposing new static methods

## V 0.6.0
- Improve cuda builds
- add --cudaArch
- generate build-cmd.bat/sh in build directory
- more log
- fix error logs
- force keep previous hash build once loaded.
- fix V 0.5.13 regression on boolean flags.

## V 0.5.13
- improve configuration boolean flag parsing, "0", "false", "off", "disable" and "disabled" are mean false

## V 0.5.12
- less tiny-glob usage

## V 0.5.11
- improve OpenCVBuildEnv.autoLocatePrebuild() add verbose output

## V 0.5.10
- add public static OpenCVBuildEnv.autoLocatePrebuild()

## V 0.5.9
- findMSBuild now return all MsBuild version
- force resolve absolute path for msbuild binary
- improve logs

## V 0.5.8
- bump @u4/tiny-glob to ignore walking on non existing directories.

## V 0.5.7
- fork tiny-glob to fix windows build support. [issue47](https://github.com/UrielCh/opencv4nodejs/issues/47)
- accept PR3 (fix for when /opt/homebrew/Cellar/opencv does not exist)
- accept PR4 (Update script do-install bin\main.js in package.json)

## V 0.5.6
- fix path interversion lib <-> include for Linux and MacOs

## V 0.5.5
- fix tiny-glob usage.

## V 0.5.4
- add autodetection mode for chocolatey on windows, brew on macos, and debian-base distrib
- remove glob in favor of tiny-glob 10 times smaller

## V 0.5.3
- fix prebuild openCV usage.

## V 0.5.2
- fix regression in agument parsing bis

## V 0.5.1
- fix regression in agument parsing
- fix cuda detection code

## V 0.5.0
 - fix -h alias from --help
 - remove build log at runtime.
 - re-write cmake parameter handle
 - disable buy default some opencv modules
 - add -DBUILD_ZLIB=OFF by default, fix MacOs X build error
 - default openCV version build is now 4.5.5
 - OpenCVBuilder.env can be modifyed immediately after his instanciation to enable/disable openCV modules.
 - add --git-cache or OPENCV_GIT_CACHE env variabe cache git data on local disk

## V 0.4.7
 - add --dry-run parameter to debug openCV build failure.
 - do not build module wechat_qrcode
 - improve output text readability

## V 0.4.6
 - add static methods in OpenCVBuildEnv.

## V 0.4.5
 - fix OPENCV4NODEJS_DISABLE_AUTOBUILD

## V 0.4.4
 - fix disable autobuid

## V 0.4.3
 - allow usage of all Microsoft buildtools editions. [issue 7](https://github.com/UrielCh/opencv4nodejs/issues/7)
 - dump dependencies versions

## V 0.4.2
 - Change Typescript build target to ES2017 so it works with electron

## V 0.4.1
 - drop old findVs2017 script
 - fix findMSBuild (was locked to vs 2019)
 - add WARNING if multiple MSBuild are available

## V 0.4.0
 - Main release