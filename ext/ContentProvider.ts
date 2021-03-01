import { join } from 'path'
import { Uri } from 'vscode'
import { ExtensionConfiguration } from './types'

export class ContentProvider {
  constructor(private config: ExtensionConfiguration) { }

  getContent() {
    const root = join(this.config.extensionPath, 'build')
    const manifest = require(join(root, 'asset-manifest.json')).files
    const mainScript = manifest['main.js']
    const mainStyle = manifest['main.css']
    const runtimeScript = manifest['runtime-main.js']

    function getUri(path?: string) {
      return Uri.file(path ? join(root, path) : root).with({ scheme: 'vscode-resource' })
    }

    const base = getUri()
    const runtimescriptUri = getUri(runtimeScript)
    const mainScriptUri = getUri(mainScript)
    const styleUri = getUri(mainStyle)

    const chunks = Object.keys(manifest)
      .filter(key => key.endsWith('.chunk.js'))
      .map(key => getUri(manifest[key]))
      .map(item => `<script src="${item}"></script>`)

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <link rel="stylesheet" type="text/css" href="${styleUri}">
    <base href="${base}/">
</head>

<body>
    <div id="root"></div>
    <script src="${runtimescriptUri}"></script>
    ${chunks}
    <script src="${mainScriptUri}"></script>
</body>
</html>`
  }
}
