# npm-opencv-build

[![Build Status](https://travis-ci.org/justadudewhohacks/npm-opencv-build.svg?branch=master)](http://travis-ci.org/justadudewhohacks/npm-opencv-build)
[![Build status](https://ci.appveyor.com/api/projects/status/uv8n2sruno95rxtq/branch/master?svg=true)](https://ci.appveyor.com/project/justadudewhohacks/npm-opencv-build/branch/master)

A simple script to auto build recent OpenCV + contrib version via npm. This script is used to auto build [*opencv4nodejs*](https://github.com/UrielCh/opencv4nodejs).

## Changes in this fork

- OpenCV build is not triggered by npm install but by `new OpenCVBuilder().install()`
- OpenCV build can now be configured with `new OpenCVBuilder(new OpenCVBuildEnv({version: "3.4.16", autoBuildBuildCuda: true, autoBuildWithoutContrib: false, })).install()`
- Each OPENCV_VERSION will be build in his own directory.
- Each AUTOBUILD_FLAGS will be build in his own directory. (induce massive time gain during development)
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

## Environment Variables

It's possible to specify build environment variables by inserting them into the `package.json` where the dependency is declared an object like:

```json
{
  "opencv4nodejs": {
    "autoBuildFlags": "-DOPENCV_GENERATE_PKGCONFIG=ON -DOPENCV_PC_FILE_NAME=opencv.pc",
    "autoBuildOpencvVersion": "4.5.4"
  }
}
```

The following opencv4nodejs parameters can be passed:

### autoBuildBuildCuda

Can be set using the environment variables *OPENCV4NODEJS_BUILD_CUDA*

set any value to enable, the following cMake flag will be added:

- DWITH_CUDA=ON
- DBUILD_opencv_cudacodec=OFF // video codec (NVCUVID) is deprecated in cuda 10, so don't add it
- DCUDA_FAST_MATH=ON // optional
- DWITH_CUBLAS=ON // optional

### autoBuildFlags

Can be set using the environment variables *OPENCV4NODEJS_AUTOBUILD_FLAGS*

Append option to CMake flags.

### autoBuildOpencvVersion

Can be set using the environment variables *OPENCV4NODEJS_AUTOBUILD_OPENCV_VERSION*

Choose the openCV version you want to build default value is `3.4.16`.

### autoBuildWithoutContrib

Can be set using the environment variables *OPENCV4NODEJS_AUTOBUILD_WITHOUT_CONTRIB*

Set any value to enable, this option will skip openCV Contribs.

### disableAutoBuild

Can be set using the environment variables *OPENCV4NODEJS_DISABLE_AUTOBUILD*

Set any value to disable compilation from sources.

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
