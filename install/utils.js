const { exec, execFile, spawn } = require('child_process');
const log = require('npmlog')

const _exec = function (cmd, options) {
  log.silly('install', 'executing:', cmd)
  return new Promise(function(resolve, reject) {
    exec(cmd, options, function(err, stdout, stderr) {
      const _err = err || stderr
      if (_err) return reject(_err)
      return resolve(stdout)
    })
  })
}

exports.exec = _exec

exports.execFile = function (cmd, args, options) {
  log.silly('install', 'executing:', cmd, args)
  return new Promise(function(resolve, reject) {
    var child = execFile(cmd, args, options, function(err, stdout, stderr) {
      const _err = err || stderr
      if (_err) return reject(_err)
      return resolve(stdout)
    })
    child.stdin.end()
  })
}

exports.spawn = function (cmd, args, opts) {
  log.silly('install', 'spawning:', cmd, args)
  return new Promise(function(resolve, reject) {
    try {
      const child = spawn(cmd, args, Object.assign({}, { stdio: 'inherit' }, opts))

      child.on('exit', function (code) {
        const msg = 'child process exited with code ' + code.toString()
        if (code !== 0) {
          return reject(msg)
        }
        return resolve(msg)
      })
    } catch(err) {
      return reject(err)
    }
  })
}

exports.requireGit = function() {
  return _exec('git --version').then(stdout => log.silly('install', stdout))
}

exports.requireCmake = function() {
  return _exec('cmake --version').then(stdout => log.silly('install', stdout))
}

function isWin () {
  return process.platform == 'win32'
}

exports.isWin = isWin

function isOSX() {
  return process.platform == 'darwin'
}

exports.isOSX = isOSX

exports.isUnix = function() {
  return !isWin() && !isOSX()
}

exports.isAutoBuildDisabled = function() {
  return !!process.env.OPENCV4NODEJS_DISABLE_AUTOBUILD
}
