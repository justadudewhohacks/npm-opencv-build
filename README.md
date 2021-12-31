# npm-opencv-build

[![Build Status](https://travis-ci.org/justadudewhohacks/npm-opencv-build.svg?branch=master)](http://travis-ci.org/justadudewhohacks/npm-opencv-build)
[![Build status](https://ci.appveyor.com/api/projects/status/uv8n2sruno95rxtq/branch/master?svg=true)](https://ci.appveyor.com/project/justadudewhohacks/npm-opencv-build/branch/master)

A simple script to auto build recent OpenCV + contrib version via npm. This script is used to auto build [*opencv4nodejs*](https://github.com/UrielCh/opencv4nodejs).

## Changes in this fork

- OpenCV build is explecitly build by `./build/main.js` and can take all options as parameters ex: `./build/main.js`
- OpenCV build is not triggered by npm install but by `new OpenCVBuilder().install()`
- OpenCV build can now be configured with `new OpenCVBuilder({autoBuildOpencvVersion: "3.4.16", autoBuildBuildCuda: true, autoBuildWithoutContrib: false }).install()`
- Each OPENCV_VERSION will be build in his own directory.
- Each AUTOBUILD_FLAGS will be build in his own directory. (induce massive time gain during development)
- if MSBuild.exe localisation for VS 2019
- Script output is now colorized.
- Add some usefull log.
- Big code refactor.
- Enfoce typing.
- Add comments and documentations.

## Install

``` bash
npm install opencv-build
```

## Requirements

- cmake

### Windows

for old nodejs

``` bash
npm install --global windows-build-tools
```

## OpenCVBuildEnv options

It's possible to specify build environment variables by passing argument to the builder script 

```bash
node build/main.js --version 4.5.4 --buildRoot ~/openCV
```

```bash
node build/main.js --version 4.5.4 --buildRoot ~/openCV --flags "-DOPENCV_GENERATE_PKGCONFIG=ON -DOPENCV_PC_FILE_NAME=opencv.pc"
```

Or by inserting them into the `package.json` where the dependency is declared an object like:

```json
{
  "opencv4nodejs": {
    "autoBuildFlags": "-DOPENCV_GENERATE_PKGCONFIG=ON -DOPENCV_PC_FILE_NAME=opencv.pc",
    "autoBuildOpencvVersion": "4.5.4"
  }
}
```

By using environement varaibles.

```
export OPENCV4NODEJS_AUTOBUILD_FLAGS="-DOPENCV_GENERATE_PKGCONFIG=ON -DOPENCV_PC_FILE_NAME=opencv.pc"
export OPENCV4NODEJS_AUTOBUILD_OPENCV_VERSION="4.5.4"
export OPENCV_BUILD_ROOT="~/openCV"

node build/main.js
```

### prebuild

the `prebuild` is a smart version selector, to avoid futher re-compilation, accepted values are:
* `"latestBuild"` use the last built version
* `"latestVersion"` use the highest version number built
* `"oldestBuild"` use the olderst built version 
* `"oldestVersion"` use the lowest version number built

the `prebuild` option intend to be use at runtime, so you do not have to keep trak of the version you want to use.

this parameter can only be provide in `OpenCVBuildEnv` constructor options.

### autoBuildOpencvVersion

Choose the openCV version you want to build, default is 3.4.6,

This option value can be provide using:
* The `--version` in build script
* The `autoBuildOpencvVersion` options field provided to `OpenCVBuildEnv` constructor options.
* The `autoBuildOpencvVersion` field in the current package.json `opencv4nodejs` object.
* The `OPENCV4NODEJS_AUTOBUILD_OPENCV_VERSION` environement variable.

### buildRoot

The `buildRoot` is a the directory used to build openCV, Default value is the npm-opencv-build directory.
You may want to use this value to persist your files out of your `node_modules` directory.

This option value can be provide using:
* The `--buildRoot` or `--buildroot` in build script
* The `buildRoot` options field provided to `OpenCVBuildEnv` constructor options.
* The `OPENCV_BUILD_ROOT` environement variable.

### autoBuildBuildCuda

Set any value to enable, the following cMake flag will be added:

- DWITH_CUDA=ON
- DBUILD_opencv_cudacodec=OFF // video codec (NVCUVID) is deprecated in cuda 10, so don't add it
- DCUDA_FAST_MATH=ON // optional
- DWITH_CUBLAS=ON // optional

This option value can be enable using:
* The `--cuda` in build script
* The `autoBuildBuildCuda` options field provided to `OpenCVBuildEnv` constructor options.
* The `autoBuildBuildCuda` field in the current package.json `opencv4nodejs` object.
* The `OPENCV4NODEJS_BUILD_CUDA` environement variable.

### autoBuildFlags

Append option to CMake flags.

This option value can be enable using:
* The `--flags` in build script
* The `autoBuildFlags` options field provided to `OpenCVBuildEnv` constructor options.
* The `autoBuildFlags` field in the current package.json `opencv4nodejs` object.
* The `OPENCV4NODEJS_AUTOBUILD_FLAGS` environement variable.

### autoBuildWithoutContrib

Set any value to enable, this option will skip openCV Contribs.

This option value can be enable using:
* The `--nocontrib` in build script
* The `autoBuildWithoutContrib` options field provided to `OpenCVBuildEnv` constructor options.
* The `autoBuildWithoutContrib` field in the current package.json `opencv4nodejs` object.
* The `OPENCV4NODEJS_AUTOBUILD_WITHOUT_CONTRIB` environement variable.

### disableAutoBuild

Set any value to disable compilation from sources.

This option value can be enable using:
* The `--nobuild` in build script
* The `disableAutoBuild` options field provided to `OpenCVBuildEnv` constructor options.
* The `disableAutoBuild` field in the current package.json `opencv4nodejs` object.
* The `OPENCV4NODEJS_DISABLE_AUTOBUILD` environement variable.

Can be set using the environment variables *OPENCV4NODEJS_DISABLE_AUTOBUILD*

### opencvIncludeDir

Over write the *OPENCV_INCLUDE_DIR* environment variables

### opencvLibDir

Over write the *OPENCV_LIB_DIR* environment variables

### opencvBinDir

Over write the *OPENCV_BIN_DIR* environment variables


## build test

```bash
OPENCV4NODEJS_AUTOBUILD_FLAGS=-DBUILD_LIST=core,imgproc,imgcodecs,videoio,highgui,video,calib3d,features2d,objdetect,dnn,ml,flann,photo,stitching,gapi
npm run build && OPENCV4NODEJS_AUTOBUILD_OPENCV_VERSION=3.4.15 OPENCV4NODEJS_AUTOBUILD_WITHOUT_CONTRIB=1 npm run do-install
```

```bash
npm run build && OPENCV4NODEJS_AUTOBUILD_OPENCV_VERSION=4.5.4 OPENCV4NODEJS_AUTOBUILD_WITHOUT_CONTRIB=1 npm run do-install
```
