import { extensions } from 'vscode'

export function getUnderlyingDebugType(): string {
  if (extensions.getExtension('msjsdiag.debugger-for-chrome'))
    return 'chrome'
  if (extensions.getExtension('msjsdiag.debugger-for-edge'))
    return 'edge'
  // TODO: support VS Code built-in debugger
  return 'chrome'
}
