import * as path from 'path'
import { Disposable, env, Position, TextDocument, Uri, ViewColumn, window, WebviewPanel, workspace, Selection } from 'vscode'
import * as EventEmitter from 'eventemitter2'

import Browser from './browser'
import BrowserPage from './browserPage'
import { ExtensionConfiguration } from './types'
import ContentProvider from './contentProvider'
const uuidv4 = require('uuid/v4')

export class Panel extends EventEmitter.EventEmitter2 {
  private static readonly viewType = 'browse-lite'
  private _panel: WebviewPanel | null
  private _disposables: Disposable[] = []
  public url = ''
  private state = {}
  private contentProvider: ContentProvider
  public browserPage: BrowserPage | null
  private browser: Browser
  public id: string
  public config: ExtensionConfiguration

  constructor(config: ExtensionConfiguration, browser: Browser, id?: string) {
    super()
    this.config = config
    this._panel = null
    this.browserPage = null
    this.browser = browser
    this.contentProvider = new ContentProvider(this.config)
    this.id = id || uuidv4()
  }

  public async launch(startUrl?: string) {
    try {
      this.browserPage = await this.browser.newPage()
      if (this.browserPage) {
        this.browserPage.else((data: any) => {
          if (this._panel)
            this._panel.webview.postMessage(data)
        })
      }
    }
    catch (err) {
      window.showErrorMessage(err.message)
    }
    // let columnNumber = <number>this.config.columnNumber;
    // var column = <any>ViewColumn[columnNumber];
    const showOptions = {
      viewColumn: ViewColumn.Two,
    }
    this._panel = window.createWebviewPanel(
      Panel.viewType,
      'Browse Lite',
      showOptions,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          Uri.file(path.join(this.config.extensionPath, 'build')),
        ],
      },
    )
    this._panel.webview.html = this.contentProvider.getContent()
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables)
    this._panel.onDidChangeViewState(() => this.emit(this._panel.visible ? 'focus' : 'blur'), null, this._disposables)
    this._panel.webview.onDidReceiveMessage(
      (msg) => {
        if (msg.type === 'extension.updateTitle') {
          if (this._panel) {
            this._panel.title = msg.params.title
            return
          }
        }
        if (msg.type === 'extension.windowOpenRequested') {
          this.emit('windowOpenRequested', { url: msg.params.url })
          this.url = msg.params.url
        }
        if (msg.type === 'extension.openFile')
          this.handleOpenFileRequest(msg.params)

        if (msg.type === 'extension.windowDialogRequested') {
          const { message, type } = msg.params
          if (type == 'alert') {
            window.showInformationMessage(message)
            if (this.browserPage) {
              this.browserPage.send('Page.handleJavaScriptDialog', {
                accept: true,
              })
            }
          }
          else if (type === 'prompt') {
            window
              .showInputBox({ placeHolder: message })
              .then((result) => {
                if (this.browserPage) {
                  this.browserPage.send('Page.handleJavaScriptDialog', {
                    accept: true,
                    promptText: result,
                  })
                }
              })
          }
          else if (type === 'confirm') {
            window.showQuickPick(['Ok', 'Cancel']).then((result) => {
              if (this.browserPage) {
                this.browserPage.send('Page.handleJavaScriptDialog', {
                  accept: result === 'Ok',
                })
              }
            })
          }
        }

        if (msg.type === 'extension.appStateChanged') {
          this.state = msg.params.state
          this.emit('stateChanged')
        }

        if (this.browserPage) {
          try {
            // not sure about this one but this throws later with unhandled
            // 'extension.appStateChanged' message
            if (msg.type !== 'extension.appStateChanged')
              this.browserPage.send(msg.type, msg.params, msg.callbackId)

            this.emit(msg.type, msg.params)
          }
          catch (err) {
            window.showErrorMessage(err)
          }
        }
      },
      null,
      this._disposables,
    )

    if (startUrl) {
      this.config.startUrl = startUrl
      this.url = this.url || startUrl
    }

    this._panel.webview.postMessage({
      method: 'extension.appConfiguration',
      result: this.config,
    })

    this.emit('focus')
  }

  public reload() {
    this.browserPage?.send('Page.reload')
  }

  public goBackward() {
    this.browserPage?.send('Page.goBackward')
  }

  public goForward() {
    this.browserPage?.send('Page.goForward')
  }

  public getState() {
    return this.state
  }

  public openExternal(close = true) {
    if (this.url) {
      env.openExternal(Uri.parse(this.url))
      if (close)
        this.dispose()
    }
  }

  public setViewport(viewport: any) {
    this._panel!.webview.postMessage({
      method: 'extension.viewport',
      result: viewport,
    })
  }

  public show() {
    if (this._panel)
      this._panel.reveal()
  }

  public dispose() {
    if (this._panel)
      this._panel.dispose()

    if (this.browserPage) {
      this.browserPage.dispose()
      this.browserPage = null
    }
    while (this._disposables.length) {
      const x = this._disposables.pop()
      if (x)
        x.dispose()
    }
    this.emit('disposed')
    this.removeAllListeners()
  }

  private handleOpenFileRequest(params: any) {
    const lineNumber = params.lineNumber
    const columnNumber = params.columnNumber | params.charNumber | 0

    const workspacePath = `${workspace.rootPath || ''}/`
    const relativePath = params.fileName.replace(workspacePath, '')

    workspace.findFiles(relativePath, '', 1).then((file) => {
      if (!file || !file.length)
        return

      const firstFile = file[0]

      // Open document
      workspace.openTextDocument(firstFile).then(
        (document: TextDocument) => {
          // Show the document
          window.showTextDocument(document, ViewColumn.One).then(
            (document) => {
              if (lineNumber) {
                // Adjust line position from 1 to zero-based.
                const pos = new Position(-1 + lineNumber, columnNumber)
                document.selection = new Selection(pos, pos)
              }
            },
            (reason) => {
              window.showErrorMessage(`Failed to show file. ${reason}`)
            },
          )
        },
        (err) => {
          window.showErrorMessage(`Failed to open file. ${err}`)
        },
      )
    })
  }
}
