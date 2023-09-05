/* eslint-disable @typescript-eslint/no-var-requires */
const typescript = require('@rollup/plugin-typescript');

module.exports = {
  input: 'src/vite-plugin-deadcodes.ts',
  watch: true,
  output: [
    {
      file: 'dist/vite-plugin-deadcodes.cjs',
      format: 'cjs'
    },
    {
      file: 'dist/vite-plugin-deadcodes.mjs',
      format: 'es'
    }
  ],
  plugins: [
    typescript()
  ]
};
