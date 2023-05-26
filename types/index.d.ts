// Path: watermark\types\index.d.ts

export {}

declare global {
  interface Element {
    $watch?: (callback: (record: MutationRecord, mutation: MutationObserver) => unknown, opt: object) => () => undefined
    $watchBox?: (callback: (record: MutationRecord) => unknown, opt?: object) => () => undefined
  }
}
