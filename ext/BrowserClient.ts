import { EventEmitter } from 'events'
import { platform } from 'os'
import * as edge from '@chiragrupani/karma-chromium-edge-launcher'
import * as chrome from 'karma-chrome-launcher'
import puppeteer, { Browser } from 'puppeteer-core'
import { workspace } from 'vscode'
import { ExtensionConfiguration } from './ExtensionConfiguration'
import { tryPort } from './Config'
import { BrowserPage } from './BrowserPage'

export class BrowserClient extends EventEmitter {
  private browser: Browser

  constructor(private config: ExtensionConfiguration) {
    super()
  }

  private async launchBrowser() {
    let chromePath = this.getChromiumPath()
    const chromeArgs = []

    if (this.config.chromeExecutable)
      chromePath = this.config.chromeExecutable

    this.config.debugPort = await tryPort(this.config.debugPort)

    chromeArgs.push(`--remote-debugging-port=${this.config.debugPort}`)

    if (!chromePath) {
      throw new Error(
        `No Chrome installation found, or no Chrome executable set in the settings - used path ${chromePath}`,
      )
    }

    if (platform() === 'linux')
      chromeArgs.push('--no-sandbox')

    const extensionSettings = workspace.getConfiguration('browse-lite')
    const ignoreHTTPSErrors = extensionSettings.get<boolean>('ignoreHttpsErrors')
    this.browser = await puppeteer.launch({
      executablePath: chromePath,
      args: chromeArgs,
      ignoreHTTPSErrors,
    })

    // close the initial empty page
    ;(await this.browser.pages()).map(i => i.close())
  }

  public async newPage(): Promise<BrowserPage> {
    if (!this.browser)
      await this.launchBrowser()

    const page = new BrowserPage(this.browser, await this.browser.newPage())
    await page.launch()
    return page
  }

  public dispose(): Promise<void> {
    return new Promise((resolve) => {
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
      if (foundPath)
        return
      if (!key.startsWith('launcher'))
        return

      // @ts-ignore
      const info: typeof import('karma-chrome-launcher').example = chrome[key] || edge[key]

      if (!info[1].prototype)
        return
      if (!info[1].prototype.DEFAULT_CMD)
        return

      const possiblePaths = info[1].prototype.DEFAULT_CMD
      const maybeThisPath = possiblePaths[process.platform]
      if (maybeThisPath && typeof maybeThisPath === 'string')
        foundPath = maybeThisPath
    })

    return foundPath
  }
}
