import { workspace } from 'vscode'

export function getConfig<T>(key: string, v?: T) {
  return workspace.getConfiguration().get<T>(key, v)
}

export function isDarkTheme() {
  const theme = getConfig('workbench.colorTheme', '').toLowerCase()

  // must be dark
  if (theme.match(/dark|black/i) != null)
    return true

  // must be light
  if (theme.match(/light/i) != null)
    return false

  // IDK, maybe dark
  return true
}
