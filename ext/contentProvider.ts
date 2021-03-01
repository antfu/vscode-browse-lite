/* eslint-disable no-restricted-syntax */
/* eslint-disable @typescript-eslint/no-var-requires */
import * as path from 'path'
import { Uri } from 'vscode'

export default class ContentProvider {
  private config: any

  constructor(config: any) {
    this.config = config
  }

  getContent() {
    const manifest = require(path.join(
      this.config.extensionPath,
      'build',
      'asset-manifest.json',
    )).files
    const mainScript = manifest['main.js']
    const mainStyle = manifest['main.css']
    const runtimeScript = manifest['runtime-main.js']

    // finding potential list of js chunk files
    const chunkScriptsUri = []
    for (const key of Object.keys(manifest)) {
      if (key.endsWith('.chunk.js')) {
        // finding their paths on the disk
        const chunkScriptUri = Uri.file(
          path.join(this.config.extensionPath, 'build', manifest[key]),
        ).with({
          scheme: 'vscode-resource',
        })
        // push the chunk Uri to the list of chunks
        chunkScriptsUri.push(chunkScriptUri)
      }
    }

    const runtimescriptPathOnDisk = Uri.file(
      path.join(this.config.extensionPath, 'build', runtimeScript),
    )
    const runtimescriptUri = runtimescriptPathOnDisk.with({
      scheme: 'vscode-resource',
    })
    const mainScriptPathOnDisk = Uri.file(
      path.join(this.config.extensionPath, 'build', mainScript),
    )
    const mainScriptUri = mainScriptPathOnDisk.with({ scheme: 'vscode-resource' })

    const stylePathOnDisk = Uri.file(
      path.join(this.config.extensionPath, 'build', mainStyle),
    )
    const styleUri = stylePathOnDisk.with({ scheme: 'vscode-resource' })
    const base = Uri.file(path.join(this.config.extensionPath, 'build')).with({ scheme: 'vscode-resource' })
    const scripts = chunkScriptsUri.map(item => `<script src="${item}"></script>`)

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
    ${scripts}
    <script src="${mainScriptUri}"></script>
</body>
</html>`
  }
}
