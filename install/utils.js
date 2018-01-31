const { exec, execFile, spawn } = require('child_process');

const _exec = function (cmd, options) {
  console.log('executing:', cmd)
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
  console.log('executing:', cmd, args)
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
  console.log('spawning:', cmd, args)
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
  return _exec('git --version').then(stdout => console.log(stdout))
}

exports.requireCmake = function() {
  return _exec('cmake --version').then(stdout => console.log(stdout))
}

exports.isWin = function() {
  return process.platform == 'win32'
}

exports.hasSelfBuild = function() {
  return process.env.OPENCV4NODEJS_DISABLE_AUTOBUILD
}
