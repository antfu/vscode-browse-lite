import { env } from 'vscode'

export class Clipboard {
  writeText(value: string): Thenable<void> {
    return env.clipboard.writeText(value)
  }

  readText(): Thenable<string> {
    return env.clipboard.readText()
  }
}
