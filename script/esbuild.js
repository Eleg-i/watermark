import esbuild from 'esbuild'
import packageJson from '../package.json' assert { type: 'json' }

const { entry, outfile } = packageJson

/**
 * 开始构建
 * @param {String} platform 构建的平台类型
 */
function build(platform) {
  buildInFormat('cjs', platform)
  buildInFormat('esm', platform)
}

/**
 * 根据模块类型构建
 * @param {String} format 构建的模块类型
 * @param {String} platform 构建的平台类型
 */
function buildInFormat(format, platform) {
  esbuild
    .build({
      bundle: true,
      entryPoints: entry,
      format,
      minify: true,
      outfile: `dist/${outfile}.${format}.${platform}.min.js`,
      platform,
      target: 'esnext'
    })
    .catch(() => process.exit(1))
}

// build('node')
build('browser')
