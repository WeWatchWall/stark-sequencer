import { Executor as ExecutorObject } from "../objectmodels/executor";

// TODO: Use Utility types: https://www.typescriptlang.org/docs/handbook/utility-types.html
export class Executor {
  isInit = false;
  static offsetPointer;
  executors = {};
  index = 0;

  init() {
    if (this.isInit) { return; }
    this.isInit = true;
  }

  add(arg) {
    if (!this.isInit) { return; }

    this.index++;
    arg.stark_index = this.index - 1;

    const executor = new ExecutorObject({ ...arg, ...{ offsetPointer: Executor.offsetPointer } }, true);
    this.executors[arg.stark_index] = executor;

    const self = this;
    executor.deleteEmitter.on('delete', function () {
      self.delete(arg.stark_index);
    });
    
    return executor.load();
  }

  delete(index: number) {
    if (!this.isInit) { return; }
    
    this.executors[index] = undefined;
  }
}