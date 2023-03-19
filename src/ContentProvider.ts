import { join } from 'path'
import fs from 'fs'
import { Uri } from 'vscode'
import type { ExtensionConfiguration } from './ExtensionConfiguration'

export class ContentProvider {
  constructor(private config: ExtensionConfiguration) { }

  getContent() {
    const root = join(this.config.extensionPath, 'dist/client')
    const indexHTML = fs.readFileSync(join(root, 'index.html'), 'utf-8')

    return indexHTML.replace(
      /(src|href)="(.*?)"/g,
      (_, tag, url) => `${tag}="${Uri.file(join(root, url.slice(1))).with({ scheme: 'vscode-resource' })}"`,
    )
  }
}
