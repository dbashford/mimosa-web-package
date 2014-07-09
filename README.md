mimosa-web-package
===========

This is a Mimosa module for packaging web applications. It assumes that the mimosa-server module is also being used.

* For more information regarding Mimosa, see http://mimosa.io
* For information regarding packaging in Mimosa, see http://mimosa.io/commands.html#package

## Usage

Add `web-package` as a string to your list of `modules` in the `mimosa-config`.  When Mimosa starts up, it will install the module for you.

## Functionality

If you are running `mimosa build` with the `--package` flag, mimosa-web-package will:

* Remove the directory at `webPackage.outPath` if it already exists
* Copy your entire project to the `webPackage.outPath` folder, omitting anything you have listed in `webPackage.exclude`
* Re-write the package.json to not include any mimosa packages in the `package.json` `depedencies` array.
* Write the parts of the fully-resolved and blown out `mimosa-config` that pertain to the server to the `webPackage.outPath` as `config.js`.  Will set some config values, like live reload to production level settings.  Will also turn normally absolute `mimosa-config` paths relative.  To accommodate app hosting solutions like Heroku, `config.js` also re-figures the location of public assets.
* Write a simple `app.js` file to `webPackage.outPath`. `app.js` exists to be a starting point for your app when Mimosa is not available to invoke your server. It simply reads the config, and calls your `server.startServer` method passing the config.
* runs NPM install from inside the `webpackage.outPath`. The `--production` flag is used to avoid installing any packages in your package.json `devDependencies`. If your production app actually depends on any packages listed there, they should really be in `dependencies`.
* By default a `.tar.gz` will be created for your packaged application. If `archiveName` is set to a `.zip` file, a `.zip` file will be created instead.

What you get as a result is an application that runs without Mimosa's aid by simply executing `node app.js`, as well as an archive file (`.tar.gz`/`.zip`) of the codebase.

If `tar`/`zip` isn't available as a command line utility on your system, no `tar`/`zip` file will be created.

If your application is using Mimosa's default server rather than a server of your own, web-package will not write an `app.js` and will not execute `npm install`.

## Default Config

```
webPackage:
  archiveName: "app"
  configName: "config"
  useEntireConfig: false
  outPath: "dist"
  exclude: ["README.md","node_modules","mimosa-config.coffee","mimosa-config.js","assets",".git",".gitignore","mimosa-config-documented.coffee",".mimosa"]
  appjs: "app.js"
```

* `archiveName`: a string, the name of the output `.tar.gz`/`.zip` file. No archive will be created if `archiveName` is set to `null`. A `.zip` will only be created if the `archiveName` ends in `.zip`.  Otherwise a tar file is assumed. The following rules only apply to `.tar`s. If the default is changed away from `app`, web-package will use the changed config setting. If the default is left alone, web-package will check the for a `name` property in the `package.json`, and if it exists, it will be used. If the default is left as `app`, and there is no `package.json.name` property, the default is used.
* `configName`: a string, the name of output configuration file without extension; it is also acceptable to define a subdirectory, although the subdirectory must exist and the path separator character ('/' or '\') must be at the beginning (e.g. "config/settings"). The relevant portions of the `mimosa-config` are written to the `outPath` directory as `configName + '.js'`
* `useEntireConfig`: a boolean, this module pulls out specific pieces of the mimosa-config that apply to what you may need with a packaged application. For instance, it does not include a coffeescript config, or a jshint config. If you want it to include the entire resolved mimosa-config flip this flag to true.
* `outPath`: a string, the folder where mimosa-web-package will place your packaged app.  Can be either relative to the root of your project or absolute.
* `exclude`: an array, files, relative to the root of the project, to not include in the package.  If it isn't listed in this array, it will be included in the package.
* `appjs`: name of the output app.js file which bootstraps the application, when set to null, web-package will not output a bootstrap file
