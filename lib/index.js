'use strict';
var copyDirSyncRecursive, exec, fs, hogan, langs, logger, moduleConfig, path, registration, rimraf, _, __generateConfigText, __runNPMInstall, __writeApplicationStarter, __writeConfig, _package;

path = require('path');

fs = require('fs');

exec = require('child_process').exec;

rimraf = require('rimraf');

logger = require('logmimosa');

_ = require('lodash');

hogan = require('hogan.js');

moduleConfig = require('./config');

langs = {
  coffee: "coffee-script",
  js: false,
  ls: "LiveScript",
  iced: "iced-coffee-script"
};

registration = function(config, register) {
  if (config.isPackage) {
    return register(['postBuild'], 'package', _package);
  }
};

_package = function(config, options, next) {
  var _ref, _ref1;

  logger.info("Beginning web-package");
  if (fs.existsSync(config.webPackage.outPath)) {
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
  var currentDir,
    _this = this;

  currentDir = process.cwd();
  process.chdir(config.webPackage.outPath);
  logger.debug("Running NPM inside [[ " + config.webPackage.outPath + " ]]");
  return exec("npm install", function(err, sout, serr) {
    var done, outputTarFile, pack, tarCommand, tarballName;

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
      tarballName = "" + tarballName + ".tar.gz";
      outputTarFile = path.join(config.root, tarballName);
      tarCommand = "tar -czf " + outputTarFile + " .";
      return exec(tarCommand, function(err, sout, serr) {
        if (err) {
          logger.info("Failed to 'tar' file using command: " + tarCommand);
        } else {
          fs.renameSync(outputTarFile, path.join(config.webPackage.outPath, tarballName));
        }
        return done();
      });
    }
  });
};

__writeConfig = function(config) {
  var configClone, configOutPath, configText, writeConfig;

  configClone = _.clone(config, true);
  writeConfig = {
    watch: configClone.watch,
    liveReload: {
      enabled: false
    },
    isOptimize: configClone.isOptimize
  };
  if (configClone.server) {
    writeConfig.server = configClone.server;
    writeConfig.server.path = path.relative(config.root, writeConfig.server.path).split(path.sep);
    writeConfig.server.views.path = path.relative(config.root, writeConfig.server.views.path).split(path.sep);
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
  var compiledHogan, context, hoganTemplateText;

  hoganTemplateText = fs.readFileSync(path.join(__dirname, 'resources', 'config-template.hogan'), 'ascii');
  compiledHogan = hogan.compile(hoganTemplateText);
  context = {
    configJSON: JSON.stringify(configText, null, 2)
  };
  return compiledHogan.render(context).replace(/&quot;/g, "\"");
};

__writeApplicationStarter = function(config) {
  var appJsInPath, appJsOutPath, appJsText, chosenLang, err, ext, lang, pack, prepend, prependLang, serverExtension, _ref;

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
    prepend = "require('" + prependLang + "')\n";
    appJsText = prepend + appJsText;
  }
  appJsText = appJsText.replace("NAME", config.webPackage.configName);
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
