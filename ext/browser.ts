'use strict'

import { EventEmitter } from 'events'
import * as os from 'os'
import * as vscode from 'vscode'
import * as edge from '@chiragrupani/karma-chromium-edge-launcher'
import * as chrome from 'karma-chrome-launcher'
import puppeteer from 'puppeteer-core'
import getPort from 'get-port'
import { ExtensionConfiguration } from './types'
import BrowserPage from './browserPage'

export default class Browser extends EventEmitter {
  private browser: puppeteer.Browser
  public remoteDebugPort = 0

  constructor(private config: ExtensionConfiguration) {
    super()
  }

  private async launchBrowser() {
    let chromePath = this.getChromiumPath()
    const chromeArgs = []
    const platform = os.platform()

    if (this.config.chromeExecutable)
      chromePath = this.config.chromeExecutable

    // Detect remote debugging port
    this.remoteDebugPort = await getPort({ port: 9222, host: '127.0.0.1' })
    chromeArgs.push(`--remote-debugging-port=${this.remoteDebugPort}`)

    if (!chromePath) {
      throw new Error(
        `No Chrome installation found, or no Chrome executable set in the settings - used path ${chromePath}`,
      )
    }

    if (platform === 'linux')
      chromeArgs.push('--no-sandbox')

    const extensionSettings = vscode.workspace.getConfiguration('browse-lite')
    const ignoreHTTPSErrors = extensionSettings.get<boolean>('ignoreHttpsErrors')
    this.browser = await puppeteer.launch({
      executablePath: chromePath,
      args: chromeArgs,
      ignoreHTTPSErrors,
    })
  }

  public async newPage(): Promise<BrowserPage> {
    if (!this.browser)
      await this.launchBrowser()

    const page = new BrowserPage(this.browser)
    await page.launch()
    return page
  }

  public dispose(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.browser) {
        this.browser.close()
        this.browser = null
      }
      resolve()
    })
  }

  public getChromiumPath(): string | undefined {
    let foundPath: string | undefined
    const knownChromiums = [...Object.keys(chrome), ...Object.keys(edge)]

    knownChromiums.forEach((key) => {
      if (foundPath) return
      if (!key.startsWith('launcher')) return

      // @ts-ignore
      const info: typeof import('karma-chrome-launcher').example = chrome[key] || edge[key]

      if (!info[1].prototype) return
      if (!info[1].prototype.DEFAULT_CMD) return

      const possiblePaths = info[1].prototype.DEFAULT_CMD
      const maybeThisPath = possiblePaths[process.platform]
      if (maybeThisPath && typeof maybeThisPath === 'string')
        foundPath = maybeThisPath
    })

    return foundPath
  }
}
