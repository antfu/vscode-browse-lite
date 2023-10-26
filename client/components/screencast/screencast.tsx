import React from 'react'
import './screencast.css'

// This implementation is heavily inspired by https://cs.chromium.org/chromium/src/third_party/blink/renderer/devtools/front_end/screencast/ScreencastView.js

class Screencast extends React.Component<any, any> {
  private canvasRef: React.RefObject<HTMLCanvasElement>
  private imageRef: React.RefObject<HTMLImageElement>
  private frameId: number | null

  constructor(props: any) {
    super(props)
    this.canvasRef = React.createRef()
    this.imageRef = React.createRef()
    this.frameId = null

    this.handleMouseEvent = this.handleMouseEvent.bind(this)
    this.handleKeyEvent = this.handleKeyEvent.bind(this)
    this.renderLoop = this.renderLoop.bind(this)

    this.state = {
      imageZoom: 1,
      screenOffsetTop: 0,
    }
  }

  static getDerivedStateFromProps(nextProps: any, prevState: any) {
    if (nextProps.frame !== prevState.frame) {
      return {
        frame: nextProps.frame,
      }
    }
    else { return null }
  }

  public componentDidMount() {
    this.startLoop()
  }

  public componentWillUnmount() {
    this.stopLoop()
  }

  public startLoop() {
    if (!this.frameId)
      this.frameId = window.requestAnimationFrame(this.renderLoop)
  }

  public stopLoop() {
    if (this.frameId)
      window.cancelAnimationFrame(this.frameId)
  }

  public renderLoop() {
    this.frameId = window.requestAnimationFrame(this.renderLoop) // Set up next iteration of the loop
  }

  public render() {
    const canvasStyle = {
      cursor: this.props.viewportMetadata?.cursor || 'auto',
    }
    const base64Data = this.props.frame?.base64Data
    const format = this.props.format

    return (
      <img
        className="screencast"
        src={`data:image/${format};base64,${base64Data}`}
        ref={this.imageRef}
        style={canvasStyle}
        width={this.props.width}
        draggable="false"
        onMouseDown={this.handleMouseEvent}
        onMouseUp={this.handleMouseEvent}
        onMouseMove={this.handleMouseEvent}
        onClick={this.handleMouseEvent}
        onWheel={this.handleMouseEvent}
        onKeyDown={this.handleKeyEvent}
        onKeyUp={this.handleKeyEvent}
        onKeyPress={this.handleKeyEvent}
        onContextMenu={this.handleContextMenu}
        tabIndex={0}
      />
    )
  }

  private handleContextMenu(event: React.MouseEvent<HTMLImageElement>) {
    event.preventDefault()
  }

  private handleMouseEvent(event: React.MouseEvent<HTMLImageElement>) {
    event.stopPropagation()
    if (this.props.isInspectEnabled) {
      if (event.type === 'click') {
        const position = this.convertIntoScreenSpace(event, this.state)
        this.props.onInspectElement({
          position,
        })
      }
      else if (event.type === 'mousemove') {
        const position = this.convertIntoScreenSpace(event, this.state)
        this.props.onInspectHighlightRequested({
          position,
        })
      }
    }
    else {
      this.dispatchMouseEvent(event.nativeEvent)
    }

    if (event.type === 'mousemove') {
      const position = this.convertIntoScreenSpace(event, this.state)
      this.props.onMouseMoved({
        position,
      })
    }

    if (event.type === 'mousedown') {
      if (this.canvasRef.current)
        this.canvasRef.current.focus()
    }
  }

  private convertIntoScreenSpace(event: any, state: any) {
    let screenOffsetTop = 0
    if (this.canvasRef && this.canvasRef.current)
      screenOffsetTop = this.canvasRef.current.getBoundingClientRect().top

    const { screenZoom } = this.props.viewportMetadata
    const { scrollOffsetX, scrollOffsetY } = this.props.frame.metadata

    return {
      x: Math.round(event.clientX / screenZoom + scrollOffsetX),
      y: Math.round(event.clientY / screenZoom - screenOffsetTop + scrollOffsetY),
    }
  }

  private handleKeyEvent(event: React.KeyboardEvent<HTMLImageElement>) {
    // Prevents events from penetrating into toolbar input
    event.stopPropagation()
    this.emitKeyEvent(event.nativeEvent)

    if (event.key === 'Tab')
      event.preventDefault()

    if (this.canvasRef.current)
      this.canvasRef.current.focus()
  }

  private modifiersForEvent(event: any) {
    return (event.altKey ? 1 : 0) | (event.ctrlKey ? 2 : 0) | (event.metaKey ? 4 : 0) | (event.shiftKey ? 8 : 0)
  }

  private readonly isMac: boolean = /macintosh|mac os x/i.test(navigator.userAgent)

  private readonly clipboardMockMap = new Map([
    ['KeyC', 'document.dispatchEvent(new ClipboardEvent("copy"))'],
    ['KeyX', 'document.execCommand("cut")'], // 'document.dispatchEvent(new ClipboardEvent("cut"))',
    ['KeyV', 'document.dispatchEvent(new ClipboardEvent("paste"))'],
  ])

  private emitKeyEvent(event: any) {
    // HACK Simulate macos keyboard event.
    if (this.isMac && event.metaKey && this.clipboardMockMap.has(event.code)) {
      this.props.onInteraction('Runtime.evaluate', { expression: this.clipboardMockMap.get(event.code) })
      return
    }

    let type
    switch (event.type) {
      case 'keydown':
        type = 'keyDown'
        break
      case 'keyup':
        type = 'keyUp'
        break
      case 'keypress':
        type = 'char'
        break
      default:
        return
    }

    const text = event.type === 'keypress' ? String.fromCharCode(event.charCode) : undefined
    const params = {
      type,
      modifiers: this.modifiersForEvent(event),
      text,
      unmodifiedText: text ? text.toLowerCase() : undefined,
      keyIdentifier: event.keyIdentifier,
      code: event.code,
      key: event.key,
      windowsVirtualKeyCode: event.keyCode,
      nativeVirtualKeyCode: event.keyCode,
      autoRepeat: false,
      isKeypad: false,
      isSystemKey: false,
    }

    this.props.onInteraction('Input.dispatchKeyEvent', params)
  }

  private dispatchMouseEvent(event: any) {
    let clickCount = 0
    const buttons = { 0: 'none', 1: 'left', 2: 'middle', 3: 'right' }
    const types = {
      mousedown: 'mousePressed',
      mouseup: 'mouseReleased',
      mousemove: 'mouseMoved',
      wheel: 'mouseWheel',
    }

    if (!(event.type in types))
      return

    const { screenZoom } = this.props.viewportMetadata

    const x = Math.round(event.offsetX / screenZoom)
    const y = Math.round(event.offsetY / screenZoom)

    const type = (types as any)[event.type]

    if (type == 'mousePressed' || type == 'mouseReleased')
      clickCount = 1

    const params = {
      type,
      x,
      y,
      modifiers: this.modifiersForEvent(event),
      button: (buttons as any)[event.which],
      clickCount,
      deltaX: 0,
      deltaY: 0,
    }

    if (type === 'mouseWheel') {
      params.deltaX = event.deltaX / screenZoom
      params.deltaY = event.deltaY / screenZoom
    }

    this.props.onInteraction('Input.dispatchMouseEvent', params)
  }
}

export default Screencast
