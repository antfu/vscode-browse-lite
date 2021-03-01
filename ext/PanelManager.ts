import { commands, workspace } from 'vscode'
import * as EventEmitter from 'eventemitter2'

import { BrowserClient } from './BrowserClient'
import { ExtensionConfiguration } from './types'
import { Panel } from './Panel'

export class PanelManager extends EventEmitter.EventEmitter2 {
  public panels: Set<Panel>
  public current: Panel | undefined
  private browser: BrowserClient
  private defaultConfig: ExtensionConfiguration

  constructor(extensionPath: string) {
    super()
    this.panels = new Set()
    this.defaultConfig = {
      extensionPath,
      startUrl: 'https://github.com/antfu/vscode-browse-lite',
      format: 'png',
      columnNumber: 2,
    }
    this.refreshSettings()

    this.on('windowOpenRequested', (params) => {
      this.create(params.url)
    })
  }

  private refreshSettings() {
    const extensionSettings = workspace.getConfiguration('browse-lite')
    if (extensionSettings) {
      const chromeExecutable = extensionSettings.get<string>('chromeExecutable')
      if (chromeExecutable !== undefined)
        this.defaultConfig.chromeExecutable = chromeExecutable

      const startUrl = extensionSettings.get<string>('startUrl')
      if (startUrl !== undefined)
        this.defaultConfig.startUrl = startUrl

      const isVerboseMode = extensionSettings.get<boolean>('verbose')
      if (isVerboseMode !== undefined)
        this.defaultConfig.isVerboseMode = isVerboseMode

      const format = extensionSettings.get<string>('format')
      if (format !== undefined)
        this.defaultConfig.format = format.includes('png') ? 'png' : 'jpeg'
    }
  }

  public async create(startUrl?: string) {
    this.refreshSettings()
    const config = { ...this.defaultConfig }

    if (!this.browser)
      this.browser = new BrowserClient(config)

    const panel = new Panel(config, this.browser)

    panel.once('disposed', () => {
      this.panels.delete(panel)
      if (this.panels.size === 0) {
        this.browser.dispose()
        this.browser = null
      }

      this.emit('windowDisposed', panel)
    })

    panel.on('windowOpenRequested', (params) => {
      this.emit('windowOpenRequested', params)
    })

    panel.on('focus', () => {
      this.current = panel
      commands.executeCommand('setContext', 'browse-lite-active', true)
    })

    panel.on('blur', () => {
      if (this.current === panel) {
        this.current = undefined
        commands.executeCommand('setContext', 'browse-lite-active', false)
      }
    })

    this.panels.add(panel)

    await panel.launch(startUrl)

    this.emit('windowCreated', panel)

    return panel
  }

  public getDebugPort() {
    return this.browser ? this.browser.remoteDebugPort : null
  }

  public disposeByUrl(url: string) {
    this.panels.forEach((b: Panel) => {
      if (b.config.startUrl === url)
        b.dispose()
    })
  }
}
