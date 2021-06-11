import { extensions, window } from 'vscode'

export function getUnderlyingDebugType(): string {
    if (!!extensions.getExtension('msjsdiag.debugger-for-chrome')) {
        return 'chrome'
    }
    if (!!extensions.getExtension('msjsdiag.debugger-for-edge')) {
        return 'edge'
    }
    window.showErrorMessage('Install "Debugger for Chrome" or "Debugger for Microsoft Edge" and Reload Window required.')
}
