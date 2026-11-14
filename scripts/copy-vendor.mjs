import { copyFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const outDir = join(root, 'public', 'vendor')
const fromModules = (...parts) => join(root, 'node_modules', ...parts)

mkdirSync(outDir, { recursive: true })
copyFileSync(fromModules('esm-potrace-wasm', 'dist', 'index.min.js'), join(outDir, 'potrace.js'))
copyFileSync(fromModules('svgo', 'dist', 'svgo.browser.js'), join(outDir, 'svgo.js'))
console.log('Copied potrace + svgo browser bundles to public/vendor')
