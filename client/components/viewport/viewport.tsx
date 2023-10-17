import React from 'react'
import './viewport.css'

import { Resizable } from 're-resizable'
import debounce from 'lodash/debounce'
import Loading from '../loading-bar/loading-bar'
import Screencast from '../screencast/screencast'
import { ErrorPage } from '../error-page/error-page'

class Viewport extends React.Component<any, any> {
  private viewportRef: React.RefObject<HTMLDivElement>
  private debouncedResizeHandler: any
  private viewportPadding: any
  private onActionInvoked: any

  constructor(props: any) {
    super(props)
    this.viewportRef = React.createRef()
    this.viewportPadding = {
      top: 70,
      left: 30,
      right: 30,
      bottom: 30,
    }

    this.debouncedResizeHandler = debounce(this.handleViewportResize.bind(this), 50)
    this.handleInspectElement = this.handleInspectElement.bind(this)
    this.handleInspectHighlightRequested = this.handleInspectHighlightRequested.bind(this)
    this.handleScreencastInteraction = this.handleScreencastInteraction.bind(this)
    this.handleResizeStop = this.handleResizeStop.bind(this)
    this.handleMouseMoved = this.handleMouseMoved.bind(this)
    this.onActionInvoked = this.props.onActionInvoked.bind(this)
  }

  public componentDidMount() {
    this.debouncedResizeHandler()
    window.addEventListener('resize', this.debouncedResizeHandler)
  }

  public componentWillUnmount() {
    window.removeEventListener('resize', this.debouncedResizeHandler)
  }

  public render() {
    const viewport = this.props.viewport

    const width = Math.round(viewport.width * viewport.screenZoom)
    const height = Math.round(viewport.height * viewport.screenZoom)

    let resizableEnableOptions = {
      top: false,
      right: false,
      bottom: false,
      left: false,
      topRight: false,
      bottomRight: false,
      bottomLeft: false,
      topLeft: false,
    }

    if (viewport.isResizable) {
      resizableEnableOptions = {
        top: true,
        topRight: true,
        topLeft: true,
        bottom: true,
        bottomRight: true,
        bottomLeft: true,
        left: true,
        right: true,
      }
    }

    return (
      <div
        className={`viewport ${this.props.isDeviceEmulationEnabled ? 'viewport-resizable' : ''}`}
        ref={this.viewportRef}
      >
        <Loading percent={viewport.loadingPercent} />
        {
          this.props.errorText
            ? (
              <ErrorPage
                errorText={this.props.errorText}
                onActionInvoked={this.onActionInvoked}
              />
              )
            : (
              <Resizable
                className="viewport-resizable-wrap"
                size={{
                  width,
                  height,
                }}
                onResizeStop={this.handleResizeStop}
                enable={resizableEnableOptions}
                handleClasses={{
                  bottom: 'viewport-resizer resizer-bottom',
                  bottomRight: 'viewport-resizer resizer-bottom-right',
                  bottomLeft: 'viewport-resizer resizer-bottom-left',
                  left: 'viewport-resizer resizer-left',
                  right: 'viewport-resizer resizer-right',
                  top: 'viewport-resizer resizer-top',
                  topRight: 'viewport-resizer resizer-top-right',
                  topLeft: 'viewport-resizer resizer-top-left',
                }}
              >
                <Screencast
                  height={height}
                  width={width}
                  frame={this.props.frame}
                  format={this.props.format}
                  viewportMetadata={viewport}
                  isInspectEnabled={this.props.isInspectEnabled}
                  onInspectElement={this.handleInspectElement}
                  onInspectHighlightRequested={this.handleInspectHighlightRequested}
                  onInteraction={this.handleScreencastInteraction}
                  onMouseMoved={this.handleMouseMoved}
                />
              </Resizable>
              )
        }
      </div>
    )
  }

  public calculateViewport() {
    // console.log('viewport.calculateViewport')
    this.calculateViewportSize()
    this.calculateViewportZoom()
  }

  private calculateViewportZoom() {
    let screenZoom = 1

    const viewport = this.props.viewport

    if (viewport.isFixedZoom)
      return

    if (viewport.isFixedSize) {
      const screenViewportDimensions = {
        height: window.innerHeight - 38, // TODO: Remove hardcoded toolbar height
        width: window.innerWidth,
      }

      if (this.props.isDeviceEmulationEnabled) {
        // Add padding to enable space for resizers
        screenViewportDimensions.width
          = screenViewportDimensions.width - this.viewportPadding.left - this.viewportPadding.right
        screenViewportDimensions.height
          = screenViewportDimensions.height - this.viewportPadding.bottom - this.viewportPadding.top
      }

      screenZoom = Math.min(
        screenViewportDimensions.width / viewport.width,
        screenViewportDimensions.height / viewport.height,
      )
    }

    if (screenZoom === viewport.screenZoom)
      return

    // console.log('viewport.calculateViewportZoom.emitChange')

    this.emitViewportChanges({ screenZoom })
  }

  private calculateViewportSize() {
    const viewport = this.props.viewport

    if (viewport.isFixedSize)
      return

    if (this.viewportRef.current) {
      const dim = this.viewportRef.current.getBoundingClientRect()

      let viewportWidth = dim.width
      let viewportHeight = dim.height

      if (this.props.isDeviceEmulationEnabled) {
        // Add padding to enable space for resizers
        viewportWidth = viewportWidth - this.viewportPadding.left - this.viewportPadding.right
        viewportHeight = viewportHeight - this.viewportPadding.bottom - this.viewportPadding.top
      }

      viewportHeight = Math.floor(viewportHeight)
      viewportWidth = Math.floor(viewportWidth)

      if (
        viewportWidth === Math.floor(viewport.width)
        && viewportHeight === Math.floor(viewport.height)
      )
        return

      // console.log('viewport.calculateViewportSize.emitChange')

      this.emitViewportChanges({
        width: viewportWidth,
        height: viewportHeight,
      })
    }
  }

  private handleViewportResize() {
    // console.log('viewport.handleViewportResize')
    this.calculateViewport()
  }

  private handleResizeStop(e: any, direction: any, ref: any, delta: any) {
    const viewport = this.props.viewport

    this.emitViewportChanges({
      width: viewport.width + delta.width,
      height: viewport.height + delta.height,
      isFixedSize: true,
    })
  }

  private handleInspectElement(params: object) {
    this.props.onViewportChanged('inspectElement', {
      params,
    })
  }

  private handleInspectHighlightRequested(params: object) {
    this.props.onViewportChanged('inspectHighlightRequested', {
      params,
    })
  }

  private handleScreencastInteraction(action: string, params: object) {
    this.props.onViewportChanged('interaction', {
      action,
      params,
    })
  }

  private handleMouseMoved(params: object) {
    this.props.onViewportChanged('hoverElementChanged', {
      params,
    })
  }

  private emitViewportChanges(newViewport: any) {
    this.props.onViewportChanged('size', newViewport)
  }
}

export default Viewport
