import nodeResolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import babel from '@rollup/plugin-babel';
import replace from '@rollup/plugin-replace';
import terser from "@rollup/plugin-terser";
// import license from 'rollup-plugin-license';
// import path from 'path';

const VERSION = process.env.VERSION || 'snapshot'; // default snapshot
const FILE = process.env.FILE;
const SOURCEMAPS = process.env.SOURCEMAPS === 'true'; // default false
const BABEL = process.env.BABEL !== 'false'; // default true
const NODE_ENV = process.env.NODE_ENV === 'development' ? 'development' : 'production'; // default prod

const input = './src/index.js';

const name = 'varnajs';

const envVariables = {
  'process.env.VERSION': JSON.stringify(VERSION),
  'process.env.NODE_ENV': JSON.stringify(NODE_ENV)
};

const getBabelOptions = () => ({
  exclude: '**/node_modules/**'
});

// Ignore all node_modules dependencies
const isExternal = id => !id.startsWith('\0') && !id.startsWith('.') && !id.startsWith('/');

// const licenseHeaderOptions = {
//   sourceMap: true,
//   banner: {
//     content: {
//       file: path.join(__dirname, 'LICENSE')
//     }
//   }
// };

const configs = [
  {
    input,
    output: {
      file: 'build/varna.umd.js',
      format: 'umd',
      name,
      sourceMap: SOURCEMAPS ? 'inline' : false
    },
    plugins: [
      nodeResolve(),
      commonjs({ include: '**/node_modules/**' }),
      BABEL ? babel(getBabelOptions()) : {},
      replace(envVariables),
      // license(licenseHeaderOptions)
    ]
  },

  {
    input,
    output: {
      file: 'build/varna.min.js',
      format: 'umd',
      name
    },
    plugins: [
      nodeResolve(),
      commonjs({ include: '**/node_modules/**' }),
      BABEL ? babel(getBabelOptions()) : {},
      replace(envVariables),
      terser({
        sourceMap: false
      }),
      // license(licenseHeaderOptions)
    ]
  },

  {
    input,
    output: {
      file: 'build/varna.esm.min.mjs',
      format: 'es'
    },
    plugins: [
      nodeResolve(),
      commonjs({ include: '**/node_modules/**' }),
      BABEL ? babel(getBabelOptions()) : {},
      replace(envVariables),
      // license(licenseHeaderOptions),
      terser()
    ]
  },

  {
    input,
    output: { file: 'build/varna.cjs.js', format: 'cjs' },
    plugins: [
      nodeResolve(),
      commonjs({ include: '**/node_modules/**' }),
      BABEL ? babel(getBabelOptions()) : {},
      replace(envVariables),
      // license(licenseHeaderOptions)
    ]
  },

  {
    input,
    output: { file: 'build/varna.esm.mjs', format: 'es' },
    plugins: [
      nodeResolve(),
      commonjs({ include: '**/node_modules/**' }),
      BABEL ? babel(getBabelOptions()) : {},
      replace(envVariables),
      // license(licenseHeaderOptions)
    ]
  }
];

export default FILE
  ? configs.filter(config => config.output.file.endsWith(FILE + '.js') || config.output.file.endsWith(FILE + '.mjs'))
  : configs;
