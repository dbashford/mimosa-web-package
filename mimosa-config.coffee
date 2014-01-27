exports.config =
  modules: ["jshint", "copy", "coffeescript"]
  coffeescript:
    options:
      sourceMap: false
  watch:
    sourceDir: "src"
    compiledDir: "lib"
    javascriptDir: null
  jshint:
    rules:
      node: true
  copy:
    extensions:["js","hogan"]