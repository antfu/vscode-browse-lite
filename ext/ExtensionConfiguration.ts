export interface ExtensionConfiguration {
  chromeExecutable?: string
  extensionPath: string
  format: 'jpeg' | 'png'
  isVerboseMode: boolean
  startUrl: string
  columnNumber: number
  isDebug?: boolean
  debugHost: string
  debugPort: number
}