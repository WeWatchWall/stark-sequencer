import EventEmitter from "events";
import { FunctionModel, ObjectModel } from "objectmodel";
import _ from "lodash"

import Vue from 'vue';
import Vuex from 'vuex';
Vue.use(Vuex);

const minPoll = 15;

export class Monitor {
  arg: any;
  argValid: any;
  validate: boolean;
  
  state: any;
  startTime: number;
  interval;
  deleteEmitter = new EventEmitter();

  string: string;
  
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
    this.validateNew();
    this.startTime = this.argValid.start || Date.now() + this.arg.offsetPointer.offset;

    if (this.argValid.pollInterval < minPoll) { this.argValid.pollInterval = minPoll; }

    const self = this;
    this.state = new Vuex.Store({
      state: {
        time: 0,
        startTime: this.startTime,
        updateTime: this.startTime,
        isEnd: false
      },
      mutations: {
        update(state, newTime) {
          state.time = newTime;
          state.updateTime = Date.now() + self.arg.offsetPointer.offset;
        },
        delete(state) {
          state.isEnd = true;
        }
      }
    });

    this.validateState();
  }

  load() {
    const self = this;
    const loadInternal = _.throttle(function () {
      const currentTime = Date.now() + self.arg.offsetPointer.offset;
      
      if (currentTime - self.startTime < 0) { return; }
      
      const polledTime = self.argValid.pollCallback();
      
      if (self.state.state.isEnd) { self.delete(); return; }
  
      if (self.argValid.isForceUpdate) { self.save(); }
      else if (
        self.argValid.isRepeat &&
        Math.abs(((currentTime - self.startTime) % self.argValid.length) - polledTime) > self.argValid.diffInterval
      ) {
        self.save();
      }
      else if (!self.argValid.isRepeat && Math.abs(currentTime - self.startTime - polledTime) > self.argValid.diffInterval) {
        self.save();
      }
    }, self.argValid.pollInterval / 2);

    this.interval = setInterval(loadInternal, this.argValid.pollInterval);
    
    return this;
  }

  save() {
    const currentTime = Date.now() + this.arg.offsetPointer.offset;
    let time = currentTime - this.startTime;
    if (this.argValid.isRepeat) { time = time % this.argValid.length; }

    if (time > this.argValid.length) {
      this.delete();
      return;
    }

    this.state.commit('update', time);
  }

  toString() {
    this.string = JSON.stringify(this.state);
  }

  delete() {
    this.state.commit('delete');
    clearInterval(this.interval);
    this.deleteEmitter.emit('delete');
    this.deleteEmitter.removeAllListeners();
  }

  private newMonitorModel = ObjectModel({
    length: Number,
    pollCallback: FunctionModel().return(Number),
    offsetPointer: ObjectModel({
      offset: Number,
      numSamples: Number
    }),
    start: [Number],
    pollInterval: Number,
    diffInterval: Number,
    isForceUpdate: Boolean,
    isRepeat: Boolean
  }).defaultTo({
    length: 600e3,
    pollInterval: 100,
    diffInterval: 100,
    isForceUpdate: false,
    isRepeat: false
  });

  private validateNew() {
    this.argValid = this.validate ? new this.newMonitorModel(this.arg) : this.arg;
  }

  private stateMonitorModel = ObjectModel({
    time: Number,
    startTime: Number,
    updateTime: Number,
    isEnd: Boolean
  });

  private validateState() {
    new this.stateMonitorModel(this.state.state);
  }
  
}