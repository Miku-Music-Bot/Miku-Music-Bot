import path from "path";
import { fork } from "child_process";
import EventEmitter from "events";
import TypedEventEmitter from "typed-emitter";

import Logger from "./logger/logger";

class Component {
  private events_ = new EventEmitter as TypedEventEmitter<{ ready: () => void }>;
  get events() { return this.events_; }

  private component_name_: string;
  private js_file_location_: string;

  private log_: Logger;

  constructor(component_name: string, js_file_location: string, logger: Logger) {
    this.component_name_ = component_name;
    this.js_file_location_ = js_file_location;
    this.log_ = logger;
    this.StartComponent();
  }

  StartComponent() {
    this.log_.info(`Starting component ${this.component_name_}`);
    const component = fork(this.js_file_location_);

    component.on("message", (message) => {
      if (message === "ready") {
        this.log_.info(`Component ${this.component_name_} is ready`);
        this.events_.emit("ready");
      }
    });

    component.on("error", (error) => {
      this.log_.error(`Component at {location:${this.js_file_location_}} named {component_name:${this.component_name_}} encountered an error`, error);
    });

    component.on("exit", (code) => {
      this.log_.debug(`Component at {location:${this.js_file_location_}} named {component_name:${this.component_name_}} exited with {code:${code}}, restarting it`);
      component.removeAllListeners();
      this.StartComponent();
    });
  }
}

const logger = new Logger("Component-Manager");
const components: Array<{ name: string, location: string }> = [];

export default function StartComponents(index?: number): Promise<void> {
  if (!index) index = 0;
  if (index === components.length) return Promise.resolve();

  return new Promise((resolve) => {
    const component = new Component(components[index].name, components[index].location, logger);
    component.events.once("ready", () => {
      logger.debug("hi");
      logger.debug("hi");
      logger.debug("hi");
      logger.debug("hi");
      logger.debug("hi");
      logger.debug("hi");
      logger.debug("hi");
      logger.debug("hi");
      logger.debug("hi");

      resolve(StartComponents(index + 1));
    });
  });
}