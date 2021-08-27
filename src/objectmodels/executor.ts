import FlatPromise from "flat-promise";
import EventEmitter from "events";
import { ArrayModel, ObjectModel } from "objectmodel";
import _ from 'lodash';

import Vue from 'vue';
import Vuex from 'vuex';
Vue.use(Vuex);

import QuickSortInPlace from '../algorithms/quickSortInPlace';
import binarySearch from '../algorithms/binarySearch';

const minPoll = 15;
const maxPoll = 150;

export class Executor {
  arg: any;
  argValid: any;
  validate: boolean;
  
  state: any;
  startTime: number;
  interval;
  deleteEmitter = new EventEmitter();

  string: string;

  promises = [];
  eventsIndex = 0;
  promisesIndex;
  private static compareCallback = (a, b) => {
    if (a.time === b.time) {
      return 0;
    }
    return a.time < b.time ? -1 : 1;
  };

  constructor(arg,  validate = false) {
    this.arg = arg;
    this.validate = validate;
    this.init();
  }

  parse(arg: string) {
    this.arg = JSON.parse(arg);
    this.validateNew();
  }

  init() {
    const sorter = new QuickSortInPlace({
      compareCallback: Executor.compareCallback
    });
    sorter.sort(this.arg.events);

    this.validateNew();
    this.startTime = this.argValid.start || Date.now() + this.arg.offsetPointer.offset;

    if (this.argValid.pollInterval < minPoll) { this.argValid.pollInterval = minPoll; }
    else if (!this.argValid.pollInterval) {
      let minTimespan = maxPoll;
      this.arg.events.reduce(
        (prevEvent, currEvent) => {
          minTimespan = Math.min(minTimespan, currEvent.time - prevEvent.time);
          return currEvent;
        },
        { time: 0 }
      );
  
      this.argValid.pollInterval = Math.min(maxPoll, Math.max(minPoll, Math.round(minTimespan / 2)));
    }

    var self = this;
    this.state = new Vuex.Store({
      state: {
        value: this.argValid.initial,
        startTime: this.startTime,
        updateTime: this.startTime,
        isEnd: false
      },
      mutations: {
        update(state, newValue) {
          state.value = { ...state.value, ...newValue};
          state.updateTime = Date.now() + self.arg.offsetPointer.offset;
        },
        delete(state) {
          state.isEnd = true;
        }
      }
    });
    
    this.state.watch(function (state) {
      return state.isEnd;
    }, function (newVal) {
      if (newVal) { self.delete(); }
    });

    this.validateState();
  }

  load() {
    var self = this;

    this.loadPromises();
    let poll = _.throttle(function () {
      let currentTime = Date.now() + self.arg.offsetPointer.offset;
      let time = Math.floor(currentTime - self.startTime);

      if (time < 0) { return; }

      let newIndex = binarySearch(self.promises, { time }, Executor.compareCallback) + 1;
      for (let index = self.promisesIndex; index < newIndex; index++) {
        self.promises[index].promise.resolve();
      }
      
      self.promisesIndex = newIndex;

      if (self.promisesIndex > Math.floor(self.promises.length * 0.9)) {
        self.promises = self.promises.slice(newIndex - 1);
        self.loadPromises();
      }

    }, this.argValid.pollInterval / 2);

    this.interval = setInterval(poll, this.argValid.pollInterval);

    return this.state;
  }

  loadPromises() {
    var self = this;
    this.promisesIndex = 0;
    let newIndex = Math.min(this.arg.events.length, this.eventsIndex + this.argValid.buffer);

    for (let index = this.eventsIndex; index < newIndex; index++) {
      let event = this.arg.events[index];
      let queued = new FlatPromise();

      this.promises.push({
        time: event.time,
        promise: queued
      });

      let asyncFunction;
      if (index === this.arg.events.length - 1) {
        asyncFunction = this.argValid.isRepeat ? async function () {
          await queued.promise;
          self.save(event.value);
          
          self.eventsIndex = 0;
          self.loadPromises();
          self.startTime = Date.now();
        } : async function () {
          await queued.promise;
          self.save(event.value);
          self.delete();
        };
      } else {
        asyncFunction = async function () {
          await queued.promise;
          self.save(event.value);
        };
      }
      asyncFunction();
    }

    this.eventsIndex = newIndex;
  }

  save(value) {
    this.state.commit('update', value);
  }

  toString() { this.string = JSON.stringify(this.state); }

  delete() {
    this.state.commit('delete');
    clearInterval(this.interval);
    this.deleteEmitter.emit('delete');
    this.deleteEmitter.removeAllListeners();
  }

  private newExecutorModel = ObjectModel({
    initial: Object,
    events: ArrayModel(ObjectModel({
      time: Number,
      value: Object
    })),
    offsetPointer: ObjectModel({
      offset: Number,
      numSamples: Number
    }),
    start: [Number],
    pollInterval: [Number],
    isRepeat: Boolean,
    buffer: Number
  }).defaultTo({
    initial: {},
    isRepeat: false,
    buffer: 100
  });

  private validateNew() {
    this.argValid = this.validate ? new this.newExecutorModel(this.arg) : this.arg;
  }

  private stateExecutorModel = ObjectModel({
    value: Object,
    startTime: Number,
    updateTime: Number,
    isEnd: Boolean
  });

  private validateState() {
    new this.stateExecutorModel(this.state.state);
  }

}