module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        bugfixes: true,
        corejs: '3.24.1',
        spec: true,
        targets: {
          browsers: 'last 3 versions and >1% and not dead and not ie < 12'
        },
        useBuiltIns: 'usage'
      }
    ],
    '@babel/preset-typescript'
  ],
  plugins: ['@babel/plugin-syntax-import-assertions']
}
