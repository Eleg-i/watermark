import packageJson from '../package.json' assert { type: 'json' }
import esbuild from 'esbuild'

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
 * @param {Stirng} format 构建的模块类型
 * @param {String} platform 构建的平台类型
 */
function buildInFormat(format, platform) {
  esbuild
    .build({
      entryPoints: entry,
      bundle: true,
      outfile: `dist/${outfile}.${format}.${platform}.min.js`,
      platform,
      minify: false,
      format,
      watch: {
        onRebuild(error, result) {
          if (error) console.error('watch build failed:', error)
          // eslint-disable-next-line no-console
          else console.log('watch build succeeded:', result)
        }
      }
    })
    .catch(() => process.exit(1))
}

// build('node')
build('browser')
