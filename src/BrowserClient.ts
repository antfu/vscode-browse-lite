import { EventEmitter } from 'events'
import { platform } from 'os'
import { existsSync } from 'fs'
import edge from '@chiragrupani/karma-chromium-edge-launcher'
import chrome from 'karma-chrome-launcher'
import puppeteer, { Browser } from 'puppeteer-core'
import { workspace, window, ExtensionContext } from 'vscode'
import { ExtensionConfiguration } from './ExtensionConfiguration'
import { tryPort } from './Config'
import { BrowserPage } from './BrowserPage'
import { join } from 'path'

export class BrowserClient extends EventEmitter {
  private browser: Browser

  constructor(private config: ExtensionConfiguration, private ctx: ExtensionContext) {
    super()
  }

  private async launchBrowser() {
    const chromeArgs = []

    this.config.debugPort = await tryPort(this.config.debugPort)

    chromeArgs.push(`--remote-debugging-port=${this.config.debugPort}`)

    chromeArgs.push(`--allow-file-access-from-files`)

    chromeArgs.push(`--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36`)

    const chromePath = this.config.chromeExecutable || this.getChromiumPath()

    if (!chromePath) {
      window.showErrorMessage(
        'No Chrome installation found, or no Chrome executable set in the settings',
      )
      return
    }

    if (platform() === 'linux')
      chromeArgs.push('--no-sandbox')

    const extensionSettings = workspace.getConfiguration('browse-lite')
    const ignoreHTTPSErrors = extensionSettings.get<boolean>('ignoreHttpsErrors')
    
    let userDataDir;
    if (this.config.storeUserData){
      userDataDir = join(this.ctx.globalStorageUri.fsPath, 'UserData');
    }

    this.browser = await puppeteer.launch({
      executablePath: chromePath,
      args: chromeArgs,
      ignoreHTTPSErrors,
      ignoreDefaultArgs: ['--mute-audio'],
      userDataDir,
    })

      // close the initial empty page
      ; (await this.browser.pages()).map(i => i.close())
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
    const knownChromiums = [...Object.entries(chrome), ...Object.entries(edge)]

    for (const [key, info] of knownChromiums) {
      if (!key.startsWith('launcher'))
        continue

      const path = info?.[1]?.prototype?.DEFAULT_CMD?.[process.platform]
      if (path && typeof path === 'string' && existsSync(path))
        return path
    }

    return undefined
  }
}
