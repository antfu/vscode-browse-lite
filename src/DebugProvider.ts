import type { CancellationToken, DebugAdapterTracker, DebugConfiguration, DebugConfigurationProvider, DebugSession, ProviderResult, WorkspaceFolder } from 'vscode'
import { debug, window } from 'vscode'
import type { PanelManager } from './PanelManager'
import { getUnderlyingDebugType } from './UnderlyingDebugAdapter'

export class DebugProvider {
  private readonly underlyingDebugType = getUnderlyingDebugType()

  constructor(private manager: PanelManager) {
    debug.onDidTerminateDebugSession((e: DebugSession) => {
      if (e.name === 'Browse Lite: Launch' && e.configuration.urlFilter) {
        // TODO: Improve this with some unique ID per browser window instead of url, to avoid closing multiple instances
        this.manager.disposeByUrl(e.configuration.urlFilter)
      }
    })

    debug.registerDebugAdapterTrackerFactory(
      this.underlyingDebugType,
      {
        createDebugAdapterTracker(session: DebugSession): ProviderResult<DebugAdapterTracker> {
          const config = session.configuration
          if (!config._browseLite || !config._browseLiteLaunch)
            return undefined

          return manager.create(config._browseLiteLaunch).then(() => undefined)
        },
      },
    )
  }

  getProvider(): DebugConfigurationProvider {
    const manager = this.manager
    const debugType = this.underlyingDebugType

    return {
      provideDebugConfigurations(
        folder: WorkspaceFolder | undefined,
        token?: CancellationToken,
      ): ProviderResult<DebugConfiguration[]> {
        return Promise.resolve([
          {
            type: 'browse-lite',
            name: 'Browse Lite: Attach',
            request: 'attach',
          },
          {
            type: 'browse-lite',
            request: 'launch',
            name: 'Browse Lite: Launch',
            url: 'http://localhost:3000',
          },
        ])
      },
      resolveDebugConfiguration(
        folder: WorkspaceFolder | undefined,
        config: DebugConfiguration,
        token?: CancellationToken,
        // @ts-expect-error
      ): ProviderResult<DebugConfiguration> {
        if (!config || config.type !== 'browse-lite')
          return null

        config.type = debugType
        config._browseLite = true

        if (config.request === 'launch') {
          config.name = 'Browse Lite: Launch'
          config.port = manager.config.debugPort
          config.request = 'attach'
          config.urlFilter = config.url
          config._browseLiteLaunch = config.url

          if (config.port === null) {
            window.showErrorMessage(
              'Could not launch Browse Lite window',
            )
          }
          else {
            return config
          }
        }
        else if (config.request === 'attach') {
          config.name = 'Browse Lite: Attach'
          config.port = manager.config.debugPort

          if (config.port === null) {
            window.showErrorMessage(
              'No Browse Lite window was found. Open a Browse Lite window or use the "launch" request type.',
            )
          }
          else {
            return config
          }
        }
        else {
          window.showErrorMessage(
            'No supported launch config was found.',
          )
        }
      },
    }
  }
}
