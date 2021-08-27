# Soft Sequencer in TypeScript 

[![Build and test status](https://github.com/WeWatchWall/stark-sequencer/workflows/Lint%20and%20test/badge.svg)](https://github.com/WeWatchWall/stark-sequencer/actions?query=workflow%3A%22Lint+and+test%22)

Library that allows users to schedule a list of changes to a Vuex(v.3) store's state. Can optionally sync with a server that is running [timesync](https://www.npmjs.com/package/timesync). An esm module written in TypeScript, tested in the browser but it should also run on the server.

## Getting Started

```bash
npm install stark-sequencer
```

## Usage and Options

```typescript
import { StarkSequencer } from "stark-sequencer";

// Default options. Will sync from the page's URL/timesync by default.
let options = {
    isSync: false,
    host: "",
    path: "timesync"
  };
StarkSequencer.init({options});


// Monitor a time-based process like a movie or audio track.
let mockTrackTime = 0;
let monitor = StarkSequencer.monitor({
    length: 30e3,  // Used for automatic destruction at the end.
    pollCallback: () => mockTrackTime,
    pollInterval: 2e2,  // In milliseconds
    diffInterval: 30,  // In milliseconds
    isForceUpdate: true,  // Update the store's time even if the polled time matches the monitored time.
    isRepeat: false  // Control for looping.
  });

// Execute mutations on the Vuex store.
let executor = StarkSequencer.execute({
    init: {x: 0, y: 0},
    events: [
      {time: 200, value: {x: 20, y: 0}},
      {time: 400, value: {x: 20, y: 40}},
      {time: 600, value: {x: 40, y: 40}},
      ...etc
    ],
    pollInterval: 2e2,
    isRepeat: true
  });
  
// Watch for changes, can use a framework like Vue.
let currentTime = Date.now();

monitor.subscribe((mutation, state) => {
  mockTrackTime = state.time;  // This would scrub the media in a real use case.

  console.log(`Time: ${state.updateTime - currentTime}, Value: ${mockTrackTime}`);
});

executor.subscribe((mutation, state) => {
  console.log(`Time: ${state.updateTime - currentTime}, Value: ${state.value}`);
});
```