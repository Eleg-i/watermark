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
      minify: false,
      outfile: `dist/${outfile}.${format}.${platform}.js`,
      platform,
      target: 'es2022',
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
