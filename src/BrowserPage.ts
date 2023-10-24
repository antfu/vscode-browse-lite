import EventEmitterEnhancer, { EnhancedEventEmitter } from 'event-emitter-enhancer'
import type { Browser, CDPSession, Page } from 'puppeteer-core'
import { Clipboard } from './Clipboard'
import { isDarkTheme } from './Config'

export class BrowserPage extends EnhancedEventEmitter {
  private client: CDPSession
  private clipboard: Clipboard

  constructor(
    public readonly browser: Browser,
    public readonly page: Page,
  ) {
    super()
    this.clipboard = new Clipboard()
  }

  get id(): string {
    return this.page.mainFrame()._id
  }

  public dispose() {
    this.removeAllElseListeners()
    // @ts-expect-error
    this.removeAllListeners()
    this.client.detach()
    this.page.close()
  }

  public async send(action: string, data: object = {}, callbackId?: number) {
    // console.log('► browserPage.send', action)
    switch (action) {
      case 'Page.goForward':
        await this.page.goForward()
        break
      case 'Page.goBackward':
        await this.page.goBack()
        break
      case 'Clipboard.readText':
        try {
          this.emit({
            callbackId,
            result: await this.clipboard.readText(),
          } as any)
        }
        catch (e) {
          this.emit({
            callbackId,
            error: e.message,
          } as any)
        }
        break
      default:
        this.client
          .send(action as any, data)
          .then((result: any) => {
            this.emit({
              callbackId,
              result,
            } as any)
          })
          .catch((err: any) => {
            this.emit({
              callbackId,
              error: err.message,
            } as any)
          })
    }
  }

  public async launch(): Promise<void> {
    enum InjectEvent {
      EMIT_BROWSER_LITE_COPY = 'EMIT_BROWSER_LITE_COPY',
      EMIT_BROWSER_LITE_PASTE = 'EMIT_BROWSER_LITE_PASTE',
    }

    await this.page.exposeFunction(InjectEvent.EMIT_BROWSER_LITE_COPY, (text: string) => this.clipboard.writeText(text))
    await this.page.exposeFunction(InjectEvent.EMIT_BROWSER_LITE_PASTE, () => this.clipboard.readText())
    // custom embedded devtools
    this.page.evaluateOnNewDocument(() => {
      localStorage.setItem('screencastEnabled', 'false')
      localStorage.setItem('panel-selectedTab', 'console')
      // listen copy event
      document.addEventListener('copy', () => {
        const text = document?.getSelection()?.toString() ?? ''
        window[InjectEvent.EMIT_BROWSER_LITE_COPY]?.(text)
      })
      function legacyCopy(value) {
        const ta = document.createElement('textarea')
        ta.value = value ?? ''
        ta.style.position = 'absolute'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        ta.remove()
      }
      // listen paste event
      document.addEventListener('paste', async () => {
        const text = await window[InjectEvent.EMIT_BROWSER_LITE_PASTE]()
        legacyCopy(text)
      })
    })

    this.page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: isDarkTheme() ? 'dark' : 'light' }])

    this.client = await this.page.target().createCDPSession()

    // @ts-expect-error
    EventEmitterEnhancer.modifyInstance(this.client)

    // @ts-expect-error
    this.client.else((action: string, data: object) => {
      // console.log('◀ browserPage.received', action)
      this.emit({
        method: action,
        result: data,
      } as any)
    })
  }
}
