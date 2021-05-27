
/// <reference lib="webworker" />

declare module '*/worker.ts' {
  /**
   * Worker class
   */
  class WebpackWorker extends Worker {
    constructor();
  }

  export default WebpackWorker;
}
