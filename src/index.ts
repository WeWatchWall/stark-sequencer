import timesync from 'timesync';
import config from '../config';

import { Executor as ExecutorService } from "./services/executor";
import { Monitor as MonitorService } from "./services/monitor";

export class StarkSequencer {
  static offsetPointer = { offset: 0, numSamples: 0 };
  static readonly executorService = new ExecutorService();
  static readonly monitorService = new MonitorService();

  static init(arg) {
    config.isSync = config.isSync === 'true';
    const configArg = { ...config, ...arg };

    ExecutorService.offsetPointer = StarkSequencer.offsetPointer;
    MonitorService.offsetPointer = StarkSequencer.offsetPointer;
    
    StarkSequencer.executorService.init();
    StarkSequencer.monitorService.init();

    if (!configArg.isSync) { return; }

    const timeSync = timesync.create({
      server: `${configArg.host}/${configArg.path}`,
      interval: 10000,
      delay: 500
    });

    timeSync.on('change', function (offset) {
      if (!StarkSequencer.offsetPointer.numSamples) {
        StarkSequencer.offsetPointer.numSamples = 1;
        StarkSequencer.offsetPointer.offset = offset;
        return;
      } else if (StarkSequencer.offsetPointer.numSamples === 4) {
        StarkSequencer.offsetPointer.numSamples++;
        StarkSequencer.offsetPointer.offset = offset;
        return;
      }

      let newVal =  StarkSequencer.offsetPointer.offset * StarkSequencer.offsetPointer.numSamples + offset;
      StarkSequencer.offsetPointer.numSamples++;
      newVal = Math.round(newVal / StarkSequencer.offsetPointer.numSamples);
      StarkSequencer.offsetPointer.offset = newVal;
      
      if (StarkSequencer.offsetPointer.numSamples > 10) {
        timeSync.destroy();
      }
    });
  }

  // Execute - managing the events based on time
  // Returns: store object that can be polled, 
  //   notified with changes, or bound to a Vue instance.
  //
  // Inputs:
  // pollInterval: number - WARNING: small enough resolution for
  //   your events. Default: 15ms < half the smallest difference between events < 150ms.
  // events: {time: number, state: {}}
  // isForceUpdate: boolean - Update the store regardless
  //   of whether there were activating events and the internal pollCallback returns false.
  // isRepeat: recycle the events.
  // Outputs:
  // updateTime: last time the model was updated.
  // isEnd: flag to indicate the stop of execution.
  static execute(arg) {
    return StarkSequencer.executorService.add(arg); // No await on purpose.
  }

  
  // Monitor - updating the time for a sequencer
  // Returns: store object that can be polled, 
  //   notified with changes, or bound to a Vue instance.
  //
  // Inputs:
  // pollInterval: number
  // pollCallback: boolean
  // updateCallback: void
  // isForceUpdate: boolean - Update the store regardless
  //   of whether the pollCallback returns false.
  // isRepeat: recycle the events.
  // Outputs:
  // updateTime: last time the model was updated.
  // isEnd: flag to indicate the stop of execution.
  static monitor(arg) {
    return StarkSequencer.monitorService.add(arg); // No await on purpose.
  }
}

