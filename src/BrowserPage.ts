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
      HookCopy = 'EMIT_BROWSER_LITE_COPY',
      HookPaste = 'EMIT_BROWSER_LITE_PASTE',
      EnableHookCopyPaste = 'ENABLE_HOOK_COPY_PASTE',
    }

    await Promise.all([
      // TODO setting for enable sync copy and paste
      this.page.exposeFunction(InjectEvent.EnableHookCopyPaste, () => true),
      this.page.exposeFunction(InjectEvent.HookCopy, (text: string) => this.clipboard.writeText(text)),
      this.page.exposeFunction(InjectEvent.HookPaste, () => this.clipboard.readText()),
    ])
    this.page.evaluateOnNewDocument(() => {
      // custom embedded devtools
      localStorage.setItem('screencastEnabled', 'false')
      localStorage.setItem('panel-selectedTab', 'console')

      // sync copy and paste
      if (window[InjectEvent.EnableHookCopyPaste]?.()) {
        const copyHandler = () => { window[InjectEvent.HookCopy]?.(document?.getSelection()?.toString() ?? '') }
        document.addEventListener('copy', copyHandler)
        document.addEventListener('cut', copyHandler)
        document.addEventListener('paste', async (event) => {
          event.preventDefault()
          const text = await window[InjectEvent.HookPaste]?.()
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
