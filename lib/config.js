"use strict";
var path;

path = require('path');

exports.defaults = function() {
  return {
    webPackage: {
      archiveName: "app",
      outPath: "dist",
      configName: "config",
      useEntireConfig: false,
      exclude: ["README.md", "node_modules", "mimosa-config.coffee", "mimosa-config-documented.coffee", "mimosa-config.js", "assets", ".git", ".gitignore", ".travis.yml", ".mimosa", "bower.json"],
      appjs: "app.js"
    }
  };
};

exports.placeholder = function() {
  return "\t\n\n  ###\n  The webPackage module works hand in hand with the mimosa-server module to package web\n  applications\n  ###\n  webPackage:                 # Configration for packaging of web applications\n    archiveName: \"app\"        # a string, the name of the output .tar.gz/.zip file. No\n                              # archive will be created if archiveName is set to null.\n                              # A .zip will only be created if the archiveName ends in\n                              # .zip.  Otherwise a tar file is assumed.  If the default is\n                              # changed away from app, web-package will use the changed config\n                              # setting.  If the default is left alone (only .tar),\n                              # web-package will check the for a name property in the\n                              # package.json, and if it exists, it will be used. If the default\n                              # is left as app, and there is no package.json.name property,\n                              # the default is used.\n    outPath:\"dist\"            # Output path for assets to package, should be relative to the\n                              # root of the project (location of mimosa-config) or be absolute\n    configName:\"config\"       # the name of the config file, will be placed in outPath and have\n                              # a .json extension. it is also acceptable to define a subdirectory\n    useEntireConfig: false    # this module pulls out specific pieces of the mimosa-config that\n                              # apply to  what you may need with a packaged application. For\n                              # instance, it does not include a coffeescript config, or a jshint\n                              # config. If you want it to include the entire resolved mimosa-config\n                              # flip this flag to true.\n    ###\n    Exclude is a list of files/folders relative to the root of the app to not copy to the outPath\n    as part of a package.  By default the watch.sourceDir is added to this list during processing.\n    ###\n    exclude:[\"README.md\",\"node_modules\",\"mimosa-config.coffee\",\"mimosa-config-documented.coffee\", \"mimosa-config.js\",\"assets\",\".git\",\".gitignore\",\".travis.yml\",\".mimosa\",\"bower.json\"]\n    appjs: \"app.js\"           # name of the output app.js file which bootstraps the application,\n                              # when set to null, web-package will not output a bootstrap file\n";
};

exports.validate = function(config, validators) {
  var errors, ex, fullPathExcludes, _i, _len, _ref;
  errors = [];
  if (validators.ifExistsIsObject(errors, "webPackage config", config.webPackage)) {
    if (config.webPackage.outPath != null) {
      if (typeof config.webPackage.outPath === "string") {
        config.webPackage.outPath = validators.determinePath(config.webPackage.outPath, config.root);
      } else {
        errors.push("webPackage.outPath must be a string.");
      }
    }
    validators.ifExistsIsString(errors, "webPackage.configName", config.webPackage.configName);
    validators.ifExistsIsString(errors, "webPackage.archiveName", config.webPackage.archiveName);
    validators.ifExistsIsBoolean(errors, "webPackage.useEntireConfig", config.webPackage.useEntireConfig);
    if (validators.ifExistsIsArray(errors, "webPackage.exclude", config.webPackage.exclude)) {
      fullPathExcludes = [];
      _ref = config.webPackage.exclude;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        ex = _ref[_i];
        if (typeof ex === "string") {
          fullPathExcludes.push(path.join(config.root, ex));
        } else {
          errors.push("webPackage.exclude must be an array of strings");
          break;
        }
      }
      config.webPackage.exclude = fullPathExcludes;
      config.webPackage.exclude.push(config.webPackage.outPath);
    }
    validators.ifExistsIsString(errors, "webPackage.appjs", config.webPackage.appjs);
    if (!config.server || !config.server.path) {
      config.webPackage.appjs = void 0;
    }
  }
  return errors;
};
