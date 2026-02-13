# @u4/opencv-build

[![NPM Version](https://img.shields.io/npm/v/@u4/opencv-build.svg?style=flat)](https://www.npmjs.org/package/@u4/opencv-build)

A simple script to auto build recent OpenCV + contrib version via npm. This
script is used to auto build
[_opencv4nodejs_](https://github.com/UrielCh/opencv4nodejs).

## Main changes from the original project

- OpenCV is explicitly built with `opencv-build-npm` and accepting parameters
  see `opencv-build-npm --help`
- OpenCV build can now be configured with
  `new OpenCVBuilder({autoBuildOpencvVersion: "4.10.0", autoBuildBuildCuda: true, autoBuildWithoutContrib: false }).install()`
- Each OPENCV_VERSION will be build in his own directory.
- Each AUTOBUILD_FLAGS will be build in his own directory. (induce massive time
  gain during development)
- All build can now be build outside node_modules using `OPENCV_BUILD_ROOT`
  environement variable.
- New MSBuild.exe localisation, also works with VS 2019, 2022+
- Script output is now colorized.
- Add some useful log.
- Big code refactor.
- Enforce typing.
- Add comments and documentations.

Each OpenCV build will take around 2Gb on your drive, so I recommend you to
define the `OPENCV_BUILD_ROOT` environment variable to avoid duplicate builds
and avoid node_modules auto flushes.

## Install

```bash
npm install opencv-build
```

## usage

```bash
opencv-build-npm usage:
   --version <value>    OpenCV version                           (OPENCV4NODEJS_AUTOBUILD_OPENCV_VERSION env variable)
   --flags <value>      OpenCV cMake Build flags                 (OPENCV4NODEJS_AUTOBUILD_FLAGS env variable)
   --root <value>       OpenCV-build root directory (deprecated) (INIT_CWD env variable)
   --buildRoot <value>  OpenCV build directory                   (OPENCV_BUILD_ROOT env variable)
   --cuda               Enable cuda in OpenCV build              (OPENCV4NODEJS_BUILD_CUDA env variable)
   --cudaArch <value>   Specify the cuda arch will drastically reduce build time, see https://en.wikipedia.org/wiki/CUDA,
                        ex if you have a RTX 3080 use --cudaArch=8.6, if you have also a RTX 2080 --cudaArch=7.5,8.6
                                                                 (OPENCV4NODEJS_BUILD_CUDA_ARCH env variable)
   --nocontrib          Do not compile Contrib modules           (OPENCV4NODEJS_AUTOBUILD_WITHOUT_CONTRIB env variable)
   --nobuild            Disable OpenCV auto build                (OPENCV4NODEJS_DISABLE_AUTOBUILD env variable)
   --incDir <value>     OpenCV include directory                 (OPENCV_INCLUDE_DIR env variable)
   --libDir <value>     OpenCV library directory                 (OPENCV_LIB_DIR env variable)
   --binDir <value>     OpenCV bin directory                     (OPENCV_BIN_DIR env variable)
   --keepsources        Keep sources OpenCV source after build
   --dry-run            Display command line use to build library
   --git-cache          Reduce Bandwidth usage, by keeping a local git source in the buildRoot (OPENCV_GIT_CACHE env variable)
   --json               Output build configuration in JSON format (N-API support)
```

## Requirements

- cmake

### Windows

for nodejs <= 12

```bash
npm install --global windows-build-tools
```

## OpenCVBuildEnv options

It's possible to specify build environment variables by passing argument to the
builder script

```bash
node lib/main.js --version 4.5.5 --buildRoot ~/openCV
```

with flags, do not forget the quotes `"`

```bash
node lib/main.js --version 4.5.5 --buildRoot ~/openCV --flags "-DOPENCV_GENERATE_PKGCONFIG=ON -DOPENCV_PC_FILE_NAME=opencv.pc"
```

Using the bin alias

```bash
opencv-build-npm --version 4.5.5
```

Or by inserting them into the `package.json` where the dependency is declared an
object like:

```json
{
  "opencv4nodejs": {
    "autoBuildFlags": "-DOPENCV_GENERATE_PKGCONFIG=ON -DOPENCV_PC_FILE_NAME=opencv.pc",
    "autoBuildOpencvVersion": "4.6.0"
  }
}
```

By using environment variables.

```bash
export OPENCV4NODEJS_AUTOBUILD_FLAGS="-DOPENCV_GENERATE_PKGCONFIG=ON -DOPENCV_PC_FILE_NAME=opencv.pc"
export OPENCV4NODEJS_AUTOBUILD_OPENCV_VERSION="4.10.0"
export OPENCV_BUILD_ROOT="~/openCV"

node build/main.js
```

### prebuild

The `prebuild` is a smart version selector, to avoid futher re-compilation,
accepted values are:

- `"latestBuild"` use the last built version
- `"latestVersion"` use the highest version number built
- `"oldestBuild"` use the olderst built version
- `"oldestVersion"` use the lowest version number built

the `prebuild` option intends to be used at runtime, so you do not have to keep
track of the version you want to use.

- this parameter can only be provided in `OpenCVBuildEnv` constructor options.
- `prebuild` is ignored if OPENCV4NODEJS_DISABLE_AUTOBUILD env variable is set,
  or disableAutoBuild is set in package.json

### autoBuildOpencvVersion

Choose the openCV version you want to build, default is 4.10.0,

This option value can be provide using:

- The `--version` in build script
- The `autoBuildOpencvVersion` options field provided to `OpenCVBuildEnv`
  constructor options.
- The `autoBuildOpencvVersion` field in the current package.json `opencv4nodejs`
  object.
- The `OPENCV4NODEJS_AUTOBUILD_OPENCV_VERSION` environment variable.

The `buildRoot` is the most important parameter, it defines the directory used
to build openCV, Default value is the npm-opencv-build directory. You generally
want to use this value to persist your build files out of your `node_modules`
directory, and by doing some sharing openCV built between your project.

This option value can be provide using:

- The `--buildRoot` in build script
- The `buildRoot` options field provided to `OpenCVBuildEnv` constructor
  options.
- The `OPENCV_BUILD_ROOT` environment variable.

The `git-cache` reduces git clone data transfer, git data will be cached in your
`buildRoot`, so you will only download all git files once.

This option value can be provide using:

- The `--git-cache` in build script
- The `git-cache` options field provided to `OpenCVBuildEnv` constructor
  options.
- The `OPENCV_GIT_CACHE` environment variable.

### autoBuildBuildCuda

Set any value to enable, the following cMake flag will be added:

- DWITH_CUDA=ON
- DBUILD_opencv_cudacodec=OFF // video codec (NVCUVID) is deprecated in cuda 10,
  so don't add it
- DCUDA_FAST_MATH=ON // optional
- DWITH_CUBLAS=ON // optional

This option value can be enable using:

- The `--cuda` in build script
- The `autoBuildBuildCuda` options field provided to `OpenCVBuildEnv`
  constructor options.
- The `autoBuildBuildCuda` field in the current package.json `opencv4nodejs`
  object.
- The `OPENCV4NODEJS_BUILD_CUDA` environment variable.

### autoBuildFlags

Append option to CMake flags.

This option value can be enable using:

- The `--flags` in build script
- The `autoBuildFlags` options field provided to `OpenCVBuildEnv` constructor
  options.
- The `autoBuildFlags` field in the current package.json `opencv4nodejs` object.
- The `OPENCV4NODEJS_AUTOBUILD_FLAGS` environment variable.

### autoBuildWithoutContrib

Set any value to enable, this option will skip openCV Contribs.

This option value can be enable using:

- The `--nocontrib` in build script
- The `autoBuildWithoutContrib` options field provided to `OpenCVBuildEnv`
  constructor options.
- The `autoBuildWithoutContrib` field in the current package.json
  `opencv4nodejs` object.
- The `OPENCV4NODEJS_AUTOBUILD_WITHOUT_CONTRIB` environment variable.

### disableAutoBuild

Set any value to disable compilation from sources.

This option value can be enable using:

- The `--nobuild` in build script
- The `disableAutoBuild` options field provided to `OpenCVBuildEnv` constructor
  options.
- The `disableAutoBuild` field in the current package.json `opencv4nodejs`
  object.
- The `OPENCV4NODEJS_DISABLE_AUTOBUILD` environment variable.

Generally you should prefer using the environment variables
_OPENCV4NODEJS_DISABLE_AUTOBUILD_

### opencvIncludeDir

Overwrite the _OPENCV_INCLUDE_DIR_ environment variables

### opencvLibDir

Overwrite the _OPENCV_LIB_DIR_ environment variables

### opencvBinDir

Overwrite the _OPENCV_BIN_DIR_ environment variables

## N-API Support (--json)

The `--json` flag allows you to output the entire build configuration in a
machine-readable JSON format. This is particularly useful for N-API based
projects that need to programmatically access OpenCV's include paths, library
directories, and linked modules.

When using `--json`, the script will NOT perform an installation/build but will
instead output the `OpenCVBuildInfo` object:

```bash
opencv-build-npm --json
```

Example output:

```json
{
  "opencvVersion": "4.10.0",
  "buildWithCuda": false,
  "isWithoutContrib": false,
  "isAutoBuildDisabled": false,
  "buildRoot": "/path/to/build",
  "modules": [
    { "opencvModule": "core", "libPath": "..." },
    ...
  ],
  "libs": [
    "/path/to/lib/libopencv_core.so",
    ...
  ]
}
```

## build test

```bash
opencv-build-npm --flags="-DBUILD_LIST=core,imgproc,imgcodecs,videoio,highgui,video,calib3d,features2d,objdetect,dnn,ml,flann,photo,stitching,gapi" --version=3.4.15 --nocontrib
```

```bash
opencv-build-npm --version=4.10.0 --nocontrib
```
