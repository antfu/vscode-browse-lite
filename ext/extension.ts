import * as vscode from 'vscode'

import DebugProvider from './debugProvider'
import { PanelManager } from './PanelManager'

export function activate(context: vscode.ExtensionContext) {
  const windowManager = new PanelManager(context.extensionPath)
  const debugProvider = new DebugProvider(windowManager)

  vscode.debug.registerDebugConfigurationProvider(
    'browse-lite',
    debugProvider.getProvider(),
  )

  context.subscriptions.push(
    vscode.commands.registerCommand('browse-lite.open', (url?) => {
      // Handle VS Code URIs
      if (url != null && url instanceof vscode.Uri && url.scheme === 'file')
        url = url.toString()

      windowManager.create(url)
    }),

    vscode.commands.registerCommand('browse-lite.openActiveFile', () => {
      const activeEditor = vscode.window.activeTextEditor
      if (!activeEditor)
        return // no active editor: ignore the command

      // get active url
      const filename = activeEditor.document.fileName

      if (filename)
        windowManager.create(`file://${filename}`)
    }),

    vscode.commands.registerCommand('browse-lite.controls.refresh', () => {
      windowManager.current?.reload()
    }),

    vscode.commands.registerCommand('browse-lite.controls.external', () => {
      windowManager.current?.openExternal(true)
    }),
  )
}
