import { commands, debug, ExtensionContext, Uri, window } from 'vscode'

import { DebugProvider } from './DebugProvider'
import { PanelManager } from './PanelManager'

export function activate(ctx: ExtensionContext) {
  const manager = new PanelManager(ctx)
  const debugProvider = new DebugProvider(manager)

  ctx.subscriptions.push(
    debug.registerDebugConfigurationProvider(
      'browse-lite',
      debugProvider.getProvider(),
    ),

    commands.registerCommand('browse-lite.open', async(url?) => {
      // Handle VS Code URIs
      if (url != null && url instanceof Uri && url.scheme === 'file')
        url = url.toString()

      return await manager.create(url)
    }),

    commands.registerCommand('browse-lite.openActiveFile', () => {
      const activeEditor = window.activeTextEditor
      if (!activeEditor)
        return // no active editor: ignore the command

      // get active url
      const filename = activeEditor.document.fileName

      if (filename)
        manager.create(`file://${filename}`)
    }),

    commands.registerCommand('browse-lite.controls.refresh', () => {
      manager.current?.reload()
    }),

    commands.registerCommand('browse-lite.controls.external', () => {
      manager.current?.openExternal(true)
    }),

    commands.registerCommand('browse-lite.controls.debug', async() => {
      const panel = await manager.current?.createDebugPanel()
      panel?.show()
    }),
  )
}
