import { window, CancellationToken, commands, debug, DebugConfiguration, DebugConfigurationProvider, DebugSession, ProviderResult, WorkspaceFolder } from 'vscode'

export default class DebugProvider {
  private windowManager: any

  constructor(windowManager: any) {
    this.windowManager = windowManager

    debug.onDidTerminateDebugSession((e: DebugSession) => {
      if (e.name === 'Browse Lite: Launch' && e.configuration.urlFilter) {
        // TODO: Improve this with some unique ID per browser window instead of url, to avoid closing multiple instances
        this.windowManager.disposeByUrl(e.configuration.urlFilter)
      }
    })
  }

  getProvider(): DebugConfigurationProvider {
    const manager = this.windowManager

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
        // @ts-ignore
      ): ProviderResult<DebugConfiguration> {
        const debugConfig = {
          name: 'Browse Lite',
          type: 'chrome',
          request: 'attach',
          webRoot: config.webRoot,
          pathMapping: config.pathMapping,
          trace: config.trace,
          sourceMapPathOverrides: config.sourceMapPathOverrides,
          urlFilter: '',
          url: '',
          port: null,
        }

        if (config && config.type === 'browse-lite') {
          if (config.request && config.request === 'attach') {
            debugConfig.name = 'Browse Lite: Attach'
            debugConfig.port = manager.getDebugPort()

            if (debugConfig.port === null) {
              window.showErrorMessage(
                'No Browse Lite window was found. Open a Browse Lite window or use the "launch" request type.',
              )
            }
            else {
              debug.startDebugging(folder, debugConfig)
            }
          }
          else if (config.request && config.request === 'launch') {
            debugConfig.name = 'Browse Lite: Launch'
            debugConfig.urlFilter = config.url

            // Launch new preview tab, set url filter, then attach
            const launch = commands.executeCommand(
              'browse-lite.open',
              config.url,
            )

            launch.then(() => {
              setTimeout(() => {
                debugConfig.port = manager.getDebugPort()
                debug.startDebugging(folder, debugConfig)
              }, 1000)
            })
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
