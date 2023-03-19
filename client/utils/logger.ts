export default class Logger {
  private enabled = false

  public enable() {
    this.enabled = true
  }

  public disable() {
    this.enabled = false
  }

  public log(...messages: any[]) {
    if (!this.enabled)
      return
    // eslint-disable-next-line no-console
    console.log(...messages)
  }
}
