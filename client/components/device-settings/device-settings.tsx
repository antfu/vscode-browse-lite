import React from 'react'

// @ts-expect-error
import devices from 'browser-viewport-device-descriptions'
import './device-settings.css'

class DeviceSettings extends React.Component<any, any> {
  private emulatedDevices: any[]
  private viewportMetadata: any

  constructor(props: any) {
    super(props)

    this.handleWidthChange = this.handleWidthChange.bind(this)
    this.handleHeightChange = this.handleHeightChange.bind(this)
    this.handleDeviceChange = this.handleDeviceChange.bind(this)

    this.emulatedDevices = [
      { name: 'Responsive', userAgent: '', viewport: [] },
      {
        name: 'Macbook 15',
        userAgent: '',
        viewport: {
          width: 1440,
          height: 900,
        },
      },
      {
        name: 'Macbook 13',
        userAgent: '',
        viewport: {
          width: 1280,
          height: 800,
        },
      },
    ]
      .concat(devices)
      .filter((d: any) => !d.viewport.isLandscape)
  }

  public render() {
    this.viewportMetadata = this.props.viewportMetadata

    const selectedDevice = this.viewportMetadata.emulatedDeviceId || ''

    const procentageZoom = Math.round(this.viewportMetadata.screenZoom * 100)
    const zoomLevels = [
      { label: `Fit (${procentageZoom}%)`, value: 'fit' },
      // { label: '50%', value: '0.5' },
      // { label: '75%', value: '0.75' },
      // { label: '100%', value: '1' },
      // { label: '125%', value: '1.25' },
      // { label: '150%', value: '1.50' }
    ]

    const viewportHeight = this.viewportMetadata.height | 0
    const viewportWidth = this.viewportMetadata.width | 0

    // console.log(this.viewportMetadata, selectedDevice)

    return (
      <div className={`device-settings ${this.props.isVisible ? 'active' : ''}`}>
        <select className="device-selector" onChange={this.handleDeviceChange} value={selectedDevice}>
          {this.emulatedDevices.map((device: any) => {
            return (
              <option key={device.name} value={device.name} selected={device.selected}>
                {device.name}
              </option>
            )
          })}
        </select>

        <span className="metadata">
          <input
            className="viewport-size-input"
            type="number"
            min="0"
            value={viewportWidth}
            onChange={this.handleWidthChange}
          />
          <span className="spacer">𝗑</span>
          <input
            className="viewport-size-input"
            type="number"
            min="0"
            value={viewportHeight}
            onChange={this.handleHeightChange}
          />
        </span>

        <select className="device-selector" value="fit">
          {zoomLevels.map((level: any) => {
            return (
              <option key={level.value} value={level.value}>
                {level.label}
              </option>
            )
          })}
        </select>
      </div>
    )
  }

  private handleDeviceChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const deviceName = e.target.value
    const device = this.emulatedDevices.find((d: any) => d.name == deviceName)

    this.props.onDeviceChange(device)
  }

  private handleHeightChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newVal = Number.parseInt(e.target.value)

    this.props.onViewportSizeChange({
      height: newVal,
      width: this.props.width,
    })
  }

  private handleWidthChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newVal = Number.parseInt(e.target.value)

    this.props.onViewportSizeChange({
      width: newVal,
      height: this.props.height,
    })
  }
}

export default DeviceSettings
