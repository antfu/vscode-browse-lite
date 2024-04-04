import React from 'react'
import './App.css'

import { resolve as getElementSourceMetadata } from 'element-to-source'
import type { ExtensionConfiguration } from '../src/ExtensionConfiguration'
import Toolbar from './components/toolbar/toolbar'
import Viewport from './components/viewport/viewport'
import Connection from './connection'
import { CDPHelper } from './utils/cdpHelper'

interface ElementSource {
  charNumber: number
  columnNumber: number
  fileName: string
  lineNumber: string
}

interface IState {
  format: 'jpeg' | 'png'
  frame: object | null
  url: string
  quality: number
  errorText: string | undefined
  everyNthFrame: number
  isDebug: boolean
  isVerboseMode: boolean
  isInspectEnabled: boolean
  isDeviceEmulationEnabled: boolean
  viewportMetadata: IViewport
  history: {
    canGoBack: boolean
    canGoForward: boolean
  }
}

interface IViewport {
  height: number | null
  width: number | null
  cursor: string | null
  emulatedDeviceId: string | null
  isLoading: boolean
  isFixedSize: boolean
  isFixedZoom: boolean
  isResizable: boolean
  loadingPercent: number
  highlightNode: {
    nodeId: string
    sourceMetadata: ElementSource | null
  } | null
  highlightInfo: object | null
  deviceSizeRatio: number
  screenZoom: number
  scrollOffsetX: number
  scrollOffsetY: number
}

class App extends React.Component<any, IState> {
  private connection: Connection
  private viewport: Viewport = undefined!
  private cdpHelper: CDPHelper
  private nextViewportSize: { width: number; height: number } | undefined

  constructor(props: any) {
    super(props)
    this.state = {
      frame: null,
      format: 'png',
      url: 'about:blank',
      quality: 100,
      everyNthFrame: 1,
      isVerboseMode: false,
      isDebug: false,
      errorText: undefined,
      isInspectEnabled: false,
      isDeviceEmulationEnabled: false,
      history: {
        canGoBack: false,
        canGoForward: false,
      },
      viewportMetadata: {
        cursor: null,
        deviceSizeRatio: 1,
        height: null,
        width: null,
        highlightNode: null,
        highlightInfo: null,
        emulatedDeviceId: 'Responsive',
        isLoading: false,
        isFixedSize: false,
        isFixedZoom: false,
        isResizable: false,
        loadingPercent: 0.0,
        screenZoom: 1,
        scrollOffsetX: 0,
        scrollOffsetY: 0,
      },
    }

    this.connection = new Connection()
    this.onToolbarActionInvoked = this.onToolbarActionInvoked.bind(this)
    this.onViewportChanged = this.onViewportChanged.bind(this)

    this.connection.enableVerboseLogging(this.state.isVerboseMode)

    this.connection.on('Page.navigatedWithinDocument', (result: any) => {
      this.requestNavigationHistory()
    })

    this.connection.on('extension.appConfiguration', (v) => {
      this.updateState(v)
    })

    this.connection.on('Page.frameNavigated', (result: any) => {
      const { frame } = result
      const isMainFrame = !frame.parentId

      if (isMainFrame) {
        this.requestNavigationHistory()
        this.updateState({
          viewportMetadata: {
            ...this.state.viewportMetadata,
            isLoading: true,
            loadingPercent: 0.1,
          },
          errorText: frame.unreachableUrl
            ? `Failed to reach ${frame.unreachableUrl}`
            : undefined,
        })
      }
    })

    this.connection.on('Page.loadEventFired', (result: any) => {
      this.updateState({
        viewportMetadata: {
          ...this.state.viewportMetadata,
          loadingPercent: 1.0,
        },
      })

      setTimeout(() => {
        this.updateState({
          viewportMetadata: {
            ...this.state.viewportMetadata,
            isLoading: false,
            loadingPercent: 0,
          },
        })
      }, 500)
    })

    this.connection.on('Page.screencastFrame', (result: any) => {
      this.handleScreencastFrame(result)
    })

    this.connection.on('Page.windowOpen', (result: any) => {
      this.connection.send('extension.windowOpenRequested', {
        url: result.url,
      })
    })

    this.connection.on('Page.frameRequestedNavigation', (result: any) => {
      if (String(result.url).trim().startsWith('vscode:')) {
        this.connection.send('extension.openVSCodeUri', {
          url: result.url,
        })
      }
    })

    this.connection.on('Page.javascriptDialogOpening', (result: any) => {
      const { url, message, type } = result

      this.connection.send('extension.windowDialogRequested', {
        url,
        message,
        type,
      })
    })

    this.connection.on('Page.frameResized', (result: any) => {
      this.stopCasting()
      this.startCasting()
    })

    this.connection.on(
      'extension.appConfiguration',
      (payload: ExtensionConfiguration) => {
        if (!payload)
          return

        this.stopCasting()
        this.startCasting()

        if (payload.startUrl)
          this.handleNavigate(payload.startUrl)
      },
    )

    this.connection.on(
      'extension.navigateTo',
      ({ url }: { url: string }) => {
        this.handleNavigate(url)
      },
    )

    this.connection.on('extension.viewport', (viewport: IViewport) => {
      this.handleViewportSizeChange(viewport)
      // this.enableViewportDeviceEmulation('Live Share')
      // TODO: Scroll the page
    })

    // Initialize
    this.connection.send('Page.enable')
    this.connection.send('DOM.enable')
    this.connection.send('CSS.enable')
    this.connection.send('Overlay.enable')

    this.requestNavigationHistory()
    this.startCasting()

    this.cdpHelper = new CDPHelper(this.connection)
  }

  private async handleScreencastFrame(result: any) {
    const { sessionId, data, metadata } = result
    this.connection.send('Page.screencastFrameAck', { sessionId })

    this.requestNodeHighlighting()

    await this.updateState({
      frame: {
        base64Data: data,
        metadata,
      },
      viewportMetadata: {
        ...this.state.viewportMetadata,
        ...this.nextViewportSize,
        scrollOffsetX: metadata.scrollOffsetX,
        scrollOffsetY: metadata.scrollOffsetY,
      },
    })

    this.nextViewportSize = undefined
  }

  public componentDidUpdate() {
    const { isVerboseMode } = this.state

    this.connection.enableVerboseLogging(isVerboseMode)
  }

  public render() {
    return (
      <div className="App">
        {
          // hide navbar for devtools
          this.state.isDebug
            ? null
            : (
              <Toolbar
                url={this.state.url}
                viewport={this.state.viewportMetadata}
                onActionInvoked={this.onToolbarActionInvoked}
                canGoBack={this.state.history.canGoBack}
                canGoForward={this.state.history.canGoForward}
                isInspectEnabled={this.state.isInspectEnabled}
                isDeviceEmulationEnabled={this.state.isDeviceEmulationEnabled}
              />
              )
        }
        <Viewport
          viewport={this.state.viewportMetadata}
          isInspectEnabled={this.state.isInspectEnabled}
          isDeviceEmulationEnabled={this.state.isDeviceEmulationEnabled}
          frame={this.state.frame}
          format={this.state.format}
          url={this.state.url}
          onActionInvoked={this.onToolbarActionInvoked}
          errorText={this.state.errorText}
          onViewportChanged={this.onViewportChanged}
          ref={c => this.viewport = c!}
        />
      </div>
    )
  }

  public stopCasting() {
    this.connection.send('Page.stopScreencast')
  }

  public startCasting() {
    const params = {
      quality: this.state.quality,
      format: this.state.format,
      everyNthFrame: this.state.everyNthFrame,
    }

    this.connection.send('Page.startScreencast', params)
  }

  private async requestNavigationHistory() {
    const history: any = await this.connection.send(
      'Page.getNavigationHistory',
    )

    if (!history)
      return

    const historyIndex = history.currentIndex
    const historyEntries = history.entries
    const currentEntry = historyEntries[historyIndex]
    const url = currentEntry.url

    this.updateState({
      url,
      history: {
        canGoBack: historyIndex === 0,
        canGoForward: historyIndex === historyEntries.length - 1,
      },
    })

    const panelTitle = currentEntry.title || currentEntry.url

    this.connection.send('extension.updateTitle', {
      title: panelTitle,
    })
  }

  private async onViewportChanged(action: string, data: any) {
    switch (action) {
      case 'inspectHighlightRequested':
        this.handleInspectHighlightRequested(data)
        break
      case 'inspectElement':
        await this.handleInspectElementRequest(data)
        this.handleToggleInspect()
        break
      case 'hoverElementChanged':
        await this.handleElementChanged(data)
        break
      case 'interaction':
        this.connection.send(data.action, data.params)
        break

      case 'deviceChange':
        await this.updateState({
          viewportMetadata: {
            ...this.state.viewportMetadata,
            ...data,
          },
        })
        this.viewport.calculateViewport()
        break
      case 'size':
        if (data.height !== undefined && data.width !== undefined) {
          this.connection.send('Page.setDeviceMetricsOverride', {
            deviceScaleFactor: window.devicePixelRatio || 1,
            mobile: false,
            height: Math.floor(data.height),
            width: Math.floor(data.width),
          })
          this.nextViewportSize = {
            height: data.height,
            width: data.width,
          }
        }

        break
    }
  }

  private async updateState(newState: Partial<IState>) {
    return new Promise<void>((resolve) => {
      this.setState(newState as any, resolve)
    })
  }

  private async handleInspectHighlightRequested(data: any) {
    const highlightNodeInfo: any = await this.connection.send(
      'DOM.getNodeForLocation',
      {
        x: data.params.position.x,
        y: data.params.position.y,
      },
    )

    if (highlightNodeInfo) {
      let nodeId = highlightNodeInfo.nodeId

      if (!highlightNodeInfo.nodeId && highlightNodeInfo.backendNodeId) {
        nodeId = await this.cdpHelper.getNodeIdFromBackendId(
          highlightNodeInfo.backendNodeId,
        )
      }

      this.setState({
        viewportMetadata: {
          ...this.state.viewportMetadata,
          highlightNode: {
            nodeId,
            sourceMetadata: null,
          },
        },
      })

      // await this.handleHighlightNodeClickType();

      this.requestNodeHighlighting()
    }
  }

  private async resolveHighlightNodeSourceMetadata() {
    if (!this.state.viewportMetadata.highlightNode)
      return

    const nodeId = this.state.viewportMetadata.highlightNode.nodeId
    const nodeDetails: any = await this.connection.send('DOM.resolveNode', {
      nodeId,
    })

    if (nodeDetails.object) {
      const objectId = nodeDetails.object.objectId
      const nodeProperties = await this.cdpHelper.resolveElementProperties(
        objectId,
        3,
      )

      if (nodeProperties) {
        const sourceMetadata = getElementSourceMetadata(nodeProperties)

        if (!sourceMetadata.fileName)
          return

        this.setState({
          viewportMetadata: {
            ...this.state.viewportMetadata,
            highlightNode: {
              ...this.state.viewportMetadata.highlightNode,
              sourceMetadata: {
                fileName: sourceMetadata.fileName,
                columnNumber: sourceMetadata.columnNumber,
                lineNumber: sourceMetadata.lineNumber,
                charNumber: sourceMetadata.charNumber,
              },
            },
          },
        })
      }
    }
  }

  private async handleInspectElementRequest(data: any) {
    if (!this.state.viewportMetadata.highlightNode)
      return

    await this.resolveHighlightNodeSourceMetadata()

    const nodeId = this.state.viewportMetadata.highlightNode.nodeId

    // Trigger CDP request to enable DOM explorer
    // TODO: No sure this works.
    this.connection.send('Overlay.inspectNodeRequested', {
      nodeId,
    })

    const sourceMetadata = this.state.viewportMetadata.highlightNode
      .sourceMetadata

    if (sourceMetadata) {
      this.connection.send('extension.openFile', {
        fileName: sourceMetadata.fileName,
        lineNumber: sourceMetadata.lineNumber,
        columnNumber: sourceMetadata.columnNumber,
        charNumber: sourceMetadata.charNumber,
      })
    }
  }

  private onToolbarActionInvoked(action: string, data: any): Promise<any> {
    switch (action) {
      case 'forward':
        this.connection.send('Page.goForward')
        break
      case 'backward':
        this.connection.send('Page.goBackward')
        break
      case 'refresh':
        this.connection.send('Page.reload')
        break
      case 'inspect':
        this.handleToggleInspect()
        break
      case 'emulateDevice':
        this.handleToggleDeviceEmulation()
        break
      case 'urlChange':
        this.handleNavigate(data.url)
        break
      case 'readClipboard':
        return this.connection.send('Clipboard.readText')
      case 'writeClipboard':
        this.handleClipboardWrite(data)
        break
      case 'viewportSizeChange':
        this.handleViewportSizeChange(data)
        break
      case 'viewportDeviceChange':
        this.handleViewportDeviceChange(data)
        break
    }
    // return an empty promise
    return Promise.resolve()
  }

  private handleToggleInspect() {
    if (this.state.isInspectEnabled) {
      // Hide browser highlight
      this.connection.send('Overlay.hideHighlight')

      // Hide local highlight
      this.updateState({
        isInspectEnabled: false,
        viewportMetadata: {
          ...this.state.viewportMetadata,
          highlightInfo: null,
          highlightNode: null,
        },
      })
    }
    else {
      this.updateState({
        isInspectEnabled: true,
      })
    }
  }

  private async handleNavigate(url: string) {
    await this.handleSetUserAgent()
    const data: any = await this.connection.send('Page.navigate', { url })
    this.setState({ url, errorText: data.errorText })
  }

  private async handleSetUserAgent(userAgent: string = navigator.userAgent) {
    return this.connection.send('Network.setUserAgentOverride', { userAgent })
  }

  private handleViewportSizeChange(data: any) {
    this.onViewportChanged('size', {
      width: data.width,
      height: data.height,
    })
  }

  private handleViewportDeviceChange(data: any) {
    const isResizable = data.device.name === 'Responsive'
    const isFixedSize = data.device.name !== 'Responsive'
    const isFixedZoom = data.device.name === 'Responsive'
    const screenZoom = 1

    this.onViewportChanged('deviceChange', {
      emulatedDeviceId: data.device.name,
      isResizable,
      isFixedSize,
      isFixedZoom,
      screenZoom,
    })

    if (data.device.viewport) {
      this.onViewportChanged('size', {
        width: data.device.viewport.width,
        height: data.device.viewport.height,
      })
    }

    this.handleSetUserAgent(data.device.userAgent)
  }

  private handleToggleDeviceEmulation() {
    if (this.state.isDeviceEmulationEnabled)
      this.disableViewportDeviceEmulation()
    else
      this.enableViewportDeviceEmulation()
  }

  private disableViewportDeviceEmulation() {
    // console.log('app.disableViewportDeviceEmulation')
    this.handleViewportDeviceChange({
      device: {
        name: 'Responsive',
        viewport: {
          width: this.state.viewportMetadata.width,
          height: this.state.viewportMetadata.height,
        },
      },
    })
    this.updateState({
      isDeviceEmulationEnabled: false,
    })
  }

  private enableViewportDeviceEmulation(deviceName = 'Responsive') {
    // console.log('app.enableViewportDeviceEmulation')
    this.handleViewportDeviceChange({
      device: {
        name: deviceName,
        viewport: {
          width: this.state.viewportMetadata.width,
          height: this.state.viewportMetadata.height,
        },
      },
    })
    this.updateState({
      isDeviceEmulationEnabled: true,
    })
  }

  private handleClipboardWrite(data: any) {
    // overwrite the clipboard only if there is a valid value
    if (data && (data as any).value)
      return this.connection.send('Clipboard.writeText', data)
  }

  private async handleElementChanged(data: any) {
    const nodeInfo: any = await this.connection.send('DOM.getNodeForLocation', {
      x: data.params.position.x,
      y: data.params.position.y,
    })

    const cursor = await this.cdpHelper.getCursorForNode(nodeInfo)

    this.setState({
      viewportMetadata: {
        ...this.state.viewportMetadata,
        cursor,
      },
    })
  }

  private async requestNodeHighlighting() {
    if (this.state.viewportMetadata.highlightNode) {
      const nodeId = this.state.viewportMetadata.highlightNode.nodeId
      const highlightBoxModel: any = await this.connection.send(
        'DOM.getBoxModel',
        {
          nodeId,
        },
      )

      // Trigger hightlight in regular browser.
      await this.connection.send('Overlay.highlightNode', {
        nodeId,
        highlightConfig: {
          showInfo: true,
          showStyles: true,
          showRulers: true,
          showExtensionLines: true,
        },
      })

      if (highlightBoxModel && highlightBoxModel.model) {
        this.setState({
          viewportMetadata: {
            ...this.state.viewportMetadata,
            highlightInfo: highlightBoxModel.model,
          },
        })
      }
    }
  }
}

export default App
