'use strict';
var copyDirSyncRecursive, exec, fs, isReallyWindows, langs, logger, moduleConfig, path, registration, _, __generateConfigText, __runNPMInstall, __tarball, __writeApplicationStarter, __writeConfig, __zip, _package;

path = require('path');

fs = require('fs');

exec = require('child_process').exec;

_ = require('lodash');

moduleConfig = require('./config');

logger = null;

isReallyWindows = true;

langs = {
  coffee: "coffee-script",
  js: false,
  ls: "LiveScript",
  iced: "iced-coffee-script"
};

registration = function(config, register) {
  if (config.isPackage) {
    logger = config.log;
    register(['postBuild'], 'package', _package);
    if (process.platform === "win32") {
      return exec('uname', (function(_this) {
        return function(error, stdout, stderr) {
          if (!error) {
            return isReallyWindows = false;
          }
        };
      })(this));
    }
  }
};

__tarball = function(config, done) {
  var altOutputTarFile, err, outputTarFile, pack, tarCommand, tarballName;
  tarballName = config.webPackage.archiveName;
  if (tarballName === moduleConfig.defaults().webPackage.archiveName) {
    try {
      pack = require(path.join(config.root, 'package.json'));
      if (pack.name != null) {
        tarballName = pack.name;
      }
    } catch (_error) {
      err = _error;
      logger.debug("No package.json");
    }
  }
  if (!/\.tar/.test(tarballName)) {
    tarballName = "" + tarballName + ".tar.gz";
  }
  outputTarFile = path.join(config.root, tarballName);
  tarCommand = "tar -czf " + outputTarFile + " .";
  if (process.platform === "win32" && !isReallyWindows) {
    altOutputTarFile = outputTarFile.replace(/(.+):/, "/$1");
    altOutputTarFile = require('slash')(altOutputTarFile);
    tarCommand = "tar -czf " + altOutputTarFile + " .";
  }
  logger.debug("tar command: " + tarCommand);
  return exec(tarCommand, (function(_this) {
    return function(err, sout, serr) {
      if (err) {
        logger.info("Failed to 'tar' file using command [[ " + tarCommand + " ]]");
      } else {
        fs.renameSync(outputTarFile, path.join(config.webPackage.outPath, tarballName));
      }
      return done();
    };
  })(this));
};

__zip = function(config, done) {
  var JSZip, content, outputZipFile, wrench, zip, zipName;
  JSZip = require('jszip');
  wrench = require('wrench');
  zip = new JSZip();
  wrench.readdirSyncRecursive(config.webPackage.outPath).map(function(p) {
    return {
      origPath: p,
      fullPath: path.join(config.webPackage.outPath, p)
    };
  }).forEach(function(p) {
    var stats;
    stats = fs.statSync(p.fullPath, p.origPath);
    if (stats.isFile()) {
      return zip.file(p.origPath.replace(/\\/g, '\/'), fs.readFileSync(p.fullPath));
    }
  });
  zipName = config.webPackage.archiveName;
  outputZipFile = path.join(config.webPackage.outPath, zipName);
  content = zip.generate({
    type: 'nodebuffer',
    compression: 'DEFLATE'
  });
  fs.writeFileSync(outputZipFile, content);
  return done();
};

_package = function(config, options, next) {
  var rimraf, _ref, _ref1;
  logger.info("Beginning web-package");
  if (fs.existsSync(config.webPackage.outPath)) {
    rimraf = require('rimraf');
    logger.debug("Deleting " + config.webPackage.outPath + " ]]");
    rimraf.sync(config.webPackage.outPath);
  }
  logger.debug("Copying [[ " + config.root + " ]] to [[ " + config.webPackage.outPath + " ]]");
  copyDirSyncRecursive(config.root, config.webPackage.outPath, config.webPackage.exclude);
  __writeConfig(config);
  if (((_ref = config.server) != null ? (_ref1 = _ref.defaultServer) != null ? _ref1.enabled : void 0 : void 0) === true) {
    logger.info("Default server being used, not writing app.js or running npm install");
    logger.info("Completed web-package");
    return next();
  } else {
    if (config.webPackage.appjs) {
      __writeApplicationStarter(config);
    }
    return __runNPMInstall(config, next);
  }
};

__runNPMInstall = function(config, next) {
  var currentDir;
  currentDir = process.cwd();
  process.chdir(config.webPackage.outPath);
  logger.debug("Running NPM inside [[ " + config.webPackage.outPath + " ]]");
  return exec("npm install --production", (function(_this) {
    return function(err, sout, serr) {
      var archive, done;
      logger.debug("NPM INSTALL standard out\n" + sout);
      logger.debug("NPM INSTALL standard err\n" + serr);
      done = function() {
        process.chdir(currentDir);
        logger.info("Completed web-package");
        return next();
      };
      if (err) {
        logger.error("Error running NPM Install: " + err);
        return done();
      } else {
        logger.debug("Zip contents of [[ " + config.webPackage.outPath + " ]]");
        if (config.webPackage.archiveName) {
          archive = __tarball;
          if (/\.zip$/.test(config.webPackage.archiveName)) {
            archive = __zip;
          }
          return archive(config, done);
        } else {
          return done();
        }
      }
    };
  })(this));
};

__writeConfig = function(config) {
  var configClone, configOutPath, configText, writeConfig, _ref;
  configClone = _.clone(config, true);
  if (config.webPackage.useEntireConfig) {
    writeConfig = configClone;
    if (writeConfig.liveReload) {
      writeConfig.liveReload.enabled = false;
    }
    ["extensions", "installedModules", "logger", "timer", "helpers", "log"].forEach(function(prop) {
      if (writeConfig[prop]) {
        return delete writeConfig[prop];
      }
    });
  } else {
    writeConfig = {
      watch: configClone.watch,
      liveReload: {
        enabled: false
      },
      isOptimize: configClone.isOptimize
    };
  }
  if (configClone.server) {
    writeConfig.server = configClone.server;
    if (writeConfig.server.path) {
      writeConfig.server.path = path.relative(config.root, writeConfig.server.path).split(path.sep);
    }
    if ((_ref = writeConfig.server.views) != null ? _ref.path : void 0) {
      writeConfig.server.views.path = path.relative(config.root, writeConfig.server.views.path).split(path.sep);
    }
  }
  writeConfig.watch.sourceDir = path.relative(config.root, writeConfig.watch.sourceDir).split(path.sep);
  writeConfig.watch.compiledDir = path.relative(config.root, writeConfig.watch.compiledDir).split(path.sep);
  writeConfig.watch.javascriptDir = path.relative(config.root, writeConfig.watch.javascriptDir).split(path.sep);
  writeConfig.watch.compiledJavascriptDir = path.relative(config.root, writeConfig.watch.compiledJavascriptDir).split(path.sep);
  configOutPath = path.join(config.webPackage.outPath, "" + config.webPackage.configName + ".js");
  logger.debug("Writing mimosa-config to [[ " + configOutPath + " ]]");
  configText = __generateConfigText(writeConfig);
  return fs.writeFileSync(configOutPath, configText, 'ascii');
};

__generateConfigText = function(configText) {
  var compiledHogan, context, hogan, hoganTemplateText;
  hogan = require('hogan.js');
  hoganTemplateText = fs.readFileSync(path.join(__dirname, 'resources', 'config-template.hogan'), 'ascii');
  compiledHogan = hogan.compile(hoganTemplateText);
  context = {
    configJSON: JSON.stringify(configText, null, 2)
  };
  return compiledHogan.render(context).replace(/&quot;/g, "\"").replace(/&#39;/g, "'");
};

__writeApplicationStarter = function(config) {
  var appJsInPath, appJsOutPath, appJsText, chosenLang, coffeeMatch, err, ext, lang, level, pack, prepend, prependLang, rootPathFromAppjs, serverExtension, serverRelPath, _fn, _i, _len, _ref, _ref1;
  appJsInPath = path.join(__dirname, 'resources', 'app.js');
  appJsText = fs.readFileSync(appJsInPath, 'ascii');
  if (((_ref = config.server) != null ? _ref.path : void 0) != null) {
    serverExtension = path.extname(config.server.path).substring(1);
  }
  prependLang = (function() {
    if ((serverExtension != null) && (langs[serverExtension] != null)) {
      if (langs[serverExtension]) {
        logger.debug("Adding require statement to app.js");
        return langs[serverExtension];
      }
    } else {
      try {
        pack = require(path.join(config.root, 'package.json'));
        logger.debug("Looking through package to determine proper language to require in at top of app.js");
        chosenLang = null;
        for (ext in langs) {
          lang = langs[ext];
          if (pack.dependencies[lang] != null) {
            chosenLang = lang;
            break;
          }
        }
        return chosenLang;
      } catch (_error) {
        err = _error;
        return logger.info("Unable to determine language of server file, you might need to address the app.js file to add a require statement for your language of choice");
      }
    }
  })();
  if (prependLang != null) {
    coffeeMatch = /.*?coffee-script/.test(prependLang);
    if (coffeeMatch) {
      prepend = "// with coffeescript 1.7, need to bring in register to have coffeescript compiled on the fly\nvar trans = require('" + prependLang + "');\nif (trans.register) {\n  trans.register();\n}\n";
    } else {
      prepend = "require('" + prependLang + "')\n";
    }
    appJsText = prepend + appJsText;
  }
  rootPathFromAppjs = '';
  serverRelPath = config.server.path.split(config.root)[1].substr(1);
  if (path.dirname(config.webPackage.appjs) !== '.') {
    _ref1 = path.dirname(config.webPackage.appjs).split(path.sep);
    _fn = function() {
      return rootPathFromAppjs += '..' + path.sep;
    };
    for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
      level = _ref1[_i];
      _fn();
    }
  }
  if (rootPathFromAppjs === '') {
    appJsText = appJsText.replace("CONFIG_PATH", "./" + config.webPackage.configName);
    appJsText = appJsText.replace("SERVER_PATH", "./" + serverRelPath);
  } else {
    appJsText = appJsText.replace("CONFIG_PATH", path.join(rootPathFromAppjs, config.webPackage.configName));
    appJsText = appJsText.replace("SERVER_PATH", path.join(rootPathFromAppjs, serverRelPath));
  }
  appJsOutPath = path.join(config.webPackage.outPath, config.webPackage.appjs);
  logger.debug("Writing app.js to [[ " + appJsOutPath + " ]]");
  return fs.writeFileSync(appJsOutPath, appJsText, 'ascii');
};

copyDirSyncRecursive = function(sourceDir, newDirLocation, excludes) {
  var checkDir, files;
  checkDir = fs.statSync(sourceDir);
  fs.mkdirSync(newDirLocation, checkDir.mode);
  files = fs.readdirSync(sourceDir);
  return files.forEach(function(f) {
    var contents, currFile, err, filePath, newFilePath, packageJson, symlinkFull;
    filePath = path.join(sourceDir, f);
    if (excludes.indexOf(filePath) >= 0) {
      return;
    }
    newFilePath = path.join(newDirLocation, f);
    currFile = fs.lstatSync(filePath);
    if (currFile.isDirectory()) {
      return copyDirSyncRecursive(filePath, newFilePath, excludes);
    } else if (currFile.isSymbolicLink()) {
      symlinkFull = fs.readlinkSync(filePath);
      return fs.symlinkSync(symlinkFull, newFilePath);
    } else {
      contents = fs.readFileSync(filePath);
      if (f === "package.json") {
        try {
          packageJson = require(filePath);
          _.keys(packageJson.dependencies).forEach(function(key) {
            if (key.indexOf('mimosa-') === 0) {
              return delete packageJson.dependencies[key];
            }
          });
          contents = JSON.stringify(packageJson, null, 2);
        } catch (_error) {
          err = _error;
          logger.error("Error parsing package.json: " + err);
        }
      }
      return fs.writeFileSync(newFilePath, contents);
    }
  });
};

module.exports = {
  registration: registration,
  defaults: moduleConfig.defaults,
  placeholder: moduleConfig.placeholder,
  validate: moduleConfig.validate
};
