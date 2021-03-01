import { workspace } from 'vscode'

export function getConfig<T>(key: string) {
  return workspace.getConfiguration().get<T>(key)
}

export function isDarkTheme() {
  const theme = (getConfig<string>('workbench.colorTheme') || '').toLowerCase()

  // must be dark
  if (theme.match(/dark|black/i) != null)
    return true

  // must be light
  if (theme.match(/light/i) != null)
    return false

  // IDK, maybe dark
  return true
}
