// rollup.config.js
import fs from "fs";
import path from "path";
import vue from "rollup-plugin-vue";
import svg from "rollup-plugin-vue-inline-svg";
import sass from "rollup-plugin-sass";
import scss from "rollup-plugin-scss";
// import vueSvg from "rollup-plugin-vue-svg";
import alias from "@rollup/plugin-alias";
import commonjs from "@rollup/plugin-commonjs";
import resolve from "@rollup/plugin-node-resolve";
import replace from "@rollup/plugin-replace";
import babel from "@rollup/plugin-babel";
import { terser } from "rollup-plugin-terser";
import minimist from "minimist";

// Get browserslist config and remove ie from es build targets
const esbrowserslist = fs
  .readFileSync("./.browserslistrc")
  .toString()
  .split("\n")
  .filter(entry => entry && entry.substring(0, 2) !== "ie");

// Extract babel preset-env config, to combine with esbrowserslist
const babelPresetEnvConfig = require("../babel.config").presets.filter(
  entry => entry[0] === "@babel/preset-env"
)[0][1];

const argv = minimist(process.argv.slice(2));

const projectRoot = path.resolve(__dirname, "..");

const baseConfig = {
  input: "src/entry.js",
  plugins: {
    preVue: [
      alias({
        // entries: {
        //   ["@"]: path.resolve(projectRoot, "src"),
        //   ["@@"]: path.resolve(projectRoot, "src/stories")
        // }
        // "@": path.resolve(__dirname, "../src"),
        // "@@": path.resolve(__dirname, "../src/stories")
        entries: [
          {
            find: "@",
            replacement: `${path.resolve(projectRoot, "src")}`
          }
          // {
          //   find: "@@",
          //   replacement: `${path.resolve(projectRoot, "src/stories")}`
          // }
        ]
      })
    ],
    replace: {
      "process.env.NODE_ENV": JSON.stringify("production"),
      preventAssignment: true
    },
    vue: {
      css: true,
      template: {
        isProduction: true
      }
    },
    postVue: [
      resolve({
        extensions: [
          ".js",
          ".jsx",
          ".ts",
          ".tsx",
          ".vue",
          ".svg",
          ".sass",
          ".scss"
        ]
      }),
      commonjs()
    ],
    babel: {
      exclude: "node_modules/**",
      extensions: [
        ".js",
        ".jsx",
        ".ts",
        ".tsx",
        ".vue",
        ".svg",
        ".sass",
        ".scss"
      ],
      babelHelpers: "bundled"
    }
  }
};

// ESM/UMD/IIFE shared settings: externals
// Refer to https://rollupjs.org/guide/en/#warning-treating-module-as-external-dependency
const external = [
  // list external dependencies, exactly the way it is written in the import statement.
  // eg. 'jquery'
  "vue",
  "vuetify"
];

// UMD/IIFE shared settings: output.globals
// Refer to https://rollupjs.org/guide/en#output-globals for details
const globals = {
  // Provide global variable names to replace your external imports
  // eg. jquery: '$'
  vue: "Vue"
};

// Customize configs for individual targets
const buildFormats = [];
if (!argv.format || argv.format === "es") {
  const esConfig = {
    ...baseConfig,
    input: "src/entry.esm.js",
    external,
    output: {
      file: "dist/alchera-component-lib.esm.js",
      format: "esm",
      exports: "named"
    },
    plugins: [
      svg(baseConfig),
      sass(),
      scss(),
      replace(baseConfig.plugins.replace),
      ...baseConfig.plugins.preVue,
      vue(baseConfig.plugins.vue),
      ...baseConfig.plugins.postVue,
      babel({
        ...baseConfig.plugins.babel,
        presets: [
          [
            "@babel/preset-env",
            {
              ...babelPresetEnvConfig,
              targets: esbrowserslist
            }
          ]
        ]
      })
    ]
  };
  buildFormats.push(esConfig);
}

if (!argv.format || argv.format === "cjs") {
  const umdConfig = {
    ...baseConfig,
    external,
    output: {
      compact: true,
      file: "dist/alchera-component-lib.ssr.js",
      format: "cjs",
      name: "AlcheraComponentLib",
      exports: "auto",
      globals
    },
    plugins: [
      svg(baseConfig),
      sass(),
      scss(),
      replace(baseConfig.plugins.replace),
      ...baseConfig.plugins.preVue,
      vue({
        ...baseConfig.plugins.vue,
        template: {
          ...baseConfig.plugins.vue.template,
          optimizeSSR: true
        }
      }),
      ...baseConfig.plugins.postVue,
      babel(baseConfig.plugins.babel)
    ]
  };
  buildFormats.push(umdConfig);
}

if (!argv.format || argv.format === "iife") {
  const unpkgConfig = {
    ...baseConfig,
    external,
    output: {
      compact: true,
      file: "dist/alchera-component-lib.min.js",
      format: "iife",
      name: "AlcheraComponentLib",
      exports: "auto",
      globals
    },
    plugins: [
      svg(baseConfig),
      sass(),
      scss(),
      replace(baseConfig.plugins.replace),
      ...baseConfig.plugins.preVue,
      vue(baseConfig.plugins.vue),
      ...baseConfig.plugins.postVue,
      babel(baseConfig.plugins.babel),
      terser({
        output: {
          ecma: 5
        }
      })
    ]
  };
  buildFormats.push(unpkgConfig);
}

// Export config
export default buildFormats;
