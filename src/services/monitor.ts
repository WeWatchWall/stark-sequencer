import { Monitor as MonitorObject } from "../objectmodels/monitor";

// TODO: Use Utility types: https://www.typescriptlang.org/docs/handbook/utility-types.html
export class Monitor {
  isInit = false;
  static offsetPointer;
  monitors = {};
  index = 0;

  init() {
    if (this.isInit) { return; }
    this.isInit = true;
  }

  add(arg) {
    if (!this.isInit) { return; }

    this.index++;
    arg.stark_index = this.index - 1;

    const monitor = new MonitorObject({ ...arg, ...{ offsetPointer: Monitor.offsetPointer } }, true);
    this.monitors[arg.stark_index] = monitor;

    const self = this;
    monitor.deleteEmitter.on('delete', function () {
      self.delete(arg.stark_index);
    });
    
    return monitor.load();
  }

  delete(index: number) {
    if (!this.isInit) { return; }
    
    this.monitors[index] = undefined;
  }
}