import EventEmitterEnhancer, { EnhancedEventEmitter } from 'event-emitter-enhancer'
import type { Browser, CDPSession, Page } from 'puppeteer-core'
import { Clipboard } from './Clipboard'
import { isDarkTheme } from './Config'

enum ExposedFunc {
  EmitCopy = 'EMIT_BROWSER_LITE_ON_COPY',
  GetPaste = 'EMIT_BROWSER_LITE_GET_PASTE',
  EnableCopyPaste = 'ENABLE_BROWSER_LITE_HOOK_COPY_PASTE',
}

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
    Promise.allSettled([
      this.page.removeExposedFunction(ExposedFunc.EnableCopyPaste),
      this.page.removeExposedFunction(ExposedFunc.EmitCopy),
      this.page.removeExposedFunction(ExposedFunc.GetPaste),
    ]).then(() => {
      this.page.close()
    })
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
    await Promise.allSettled([
      // TODO setting for enable sync copy and paste
      this.page.exposeFunction(ExposedFunc.EnableCopyPaste, () => true),
      this.page.exposeFunction(ExposedFunc.EmitCopy, (text: string) => this.clipboard.writeText(text)),
      this.page.exposeFunction(ExposedFunc.GetPaste, () => this.clipboard.readText()),
    ])
    this.page.evaluateOnNewDocument(() => {
      // custom embedded devtools
      localStorage.setItem('screencastEnabled', 'false')
      localStorage.setItem('panel-selectedTab', 'console')

      // sync copy and paste
      if (window[ExposedFunc.EnableCopyPaste]?.()) {
        const copyHandler = (event: ClipboardEvent) => {
          const text = event.clipboardData?.getData('text/plain') || document.getSelection()?.toString()
          text && window[ExposedFunc.EmitCopy]?.(text)
        }
        document.addEventListener('copy', copyHandler)
        document.addEventListener('cut', copyHandler)
        document.addEventListener('paste', async (event) => {
          event.preventDefault()
          const text = await window[ExposedFunc.GetPaste]?.()
          text && document.execCommand('insertText', false, text)
        })
      }
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
