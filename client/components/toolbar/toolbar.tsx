import React from 'react'
import './toolbar.css'

import UrlInput from '../url-input/url-input'
import DeviceSettings from '../device-settings/device-settings'

export function CarbonArrowLeft(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="1em" height="1em" viewBox="0 0 32 32" {...props}><path d="M14 26l1.41-1.41L7.83 17H28v-2H7.83l7.58-7.59L14 6L4 16l10 10z" fill="currentColor"></path></svg>
  )
}

export function CarbonArrowRight(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="1em" height="1em" viewBox="0 0 32 32" {...props}><path d="M18 6l-1.43 1.393L24.15 15H4v2h20.15l-7.58 7.573L18 26l10-10L18 6z" fill="currentColor"></path></svg>
  )
}

export function CarbonRenew(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="1em" height="1em" viewBox="0 0 32 32" {...props}>
      <path d="M12 10H6.78A11 11 0 0 1 27 16h2A13 13 0 0 0 6 7.68V4H4v8h8z" fill="currentColor"></path>
      <path d="M20 22h5.22A11 11 0 0 1 5 16H3a13 13 0 0 0 23 8.32V28h2v-8h-8z" fill="currentColor"></path>
    </svg>
  )
}

export function CarbonDevices(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="1em" height="1em" viewBox="0 0 32 32" {...props}>
      <path d="M10 30H4a2 2 0 0 1-2-2V16a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2zM4 16v12h6V16z" fill="currentColor"></path>
      <path d="M28 4H6a2 2 0 0 0-2 2v6h2V6h22v14H14v2h2v4h-2v2h9v-2h-5v-4h10a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" fill="currentColor"></path>
    </svg>
  )
}

interface IToolbarProps {
  canGoBack: boolean
  canGoForward: boolean
  isInspectEnabled: boolean
  isDeviceEmulationEnabled: boolean
  url: string
  viewport: any
  onActionInvoked: (action: string, data?: object) => Promise<any>
}

class Toolbar extends React.Component<IToolbarProps, any> {
  private viewportMetadata: any

  constructor(props: any) {
    super(props)

    this.handleBack = this.handleBack.bind(this)
    this.handleForward = this.handleForward.bind(this)
    this.handleRefresh = this.handleRefresh.bind(this)
    this.handleUrlChange = this.handleUrlChange.bind(this)
    this.handleInspect = this.handleInspect.bind(this)
    this.handleEmulateDevice = this.handleEmulateDevice.bind(this)
    this.handleDeviceChange = this.handleDeviceChange.bind(this)
    this.handleViewportSizeChange = this.handleViewportSizeChange.bind(this)
  }

  public render() {
    this.viewportMetadata = this.props.viewport

    return (
      <div className="toolbar">
        <div className="inner">
          {/* <button
            className={`inspect ${this.props.isInspectEnabled ? 'active' : ''}`}
            style={iconInspectStyle}
            onClick={this.handleInspect}
          >
            Inspect
          </button> */}
          <button
            className="backward"
            onClick={this.handleBack}
            disabled={this.props.canGoBack}
          >
            <CarbonArrowLeft />
          </button>
          <button
            className="forward"
            onClick={this.handleForward}
            disabled={this.props.canGoForward}
          >
            <CarbonArrowRight />
          </button>
          <button
            className="refresh"
            onClick={this.handleRefresh}
          >
            <CarbonRenew />
          </button>
          <UrlInput
            url={this.props.url}
            onUrlChanged={this.handleUrlChange}
            onActionInvoked={this.props.onActionInvoked}
          />
          <button
            className={`device ${this.props.isDeviceEmulationEnabled ? 'active' : ''}`}
            title="Emulate device"
            onClick={this.handleEmulateDevice}
          >
            <CarbonDevices />
          </button>
        </div>
        <DeviceSettings
          viewportMetadata={this.viewportMetadata}
          isVisible={this.props.isDeviceEmulationEnabled}
          onDeviceChange={this.handleDeviceChange}
          onViewportSizeChange={this.handleViewportSizeChange}
        />
      </div>
    )
  }

  private handleUrlChange(url: string) {
    this.props.onActionInvoked('urlChange', { url })
  }

  private handleBack() {
    this.props.onActionInvoked('backward', {})
  }

  private handleForward() {
    this.props.onActionInvoked('forward', {})
  }

  private handleRefresh() {
    this.props.onActionInvoked('refresh', {})
  }

  private handleInspect() {
    this.props.onActionInvoked('inspect', {})
  }

  private handleEmulateDevice() {
    this.props.onActionInvoked('emulateDevice', {})
  }

  private handleViewportSizeChange(viewportSize: any) {
    this.props.onActionInvoked('viewportSizeChange', {
      height: viewportSize.height,
      width: viewportSize.width,
    })
  }

  private handleDeviceChange(device: any) {
    this.props.onActionInvoked('viewportDeviceChange', {
      device,
    })
  }
}

export default Toolbar
