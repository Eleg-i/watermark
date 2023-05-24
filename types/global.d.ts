export {}

declare global {
  interface Element {
    $watch: (callback: (record: MutationRecord, mutation: MutationObserver) => unknown, opt: object) => () => undefined
    $watchBox: (callback: (record: MutationRecord) => unknown) => () => undefined
  }
}
