import dotenv from "dotenv";
dotenv.config();

import Logger from "./logger";

import { fork } from "child_process";

const log = new Logger("test");

fork(__dirname + "/database_handler/database_handler.js");

import DatabaseHandlerInterface from "./database_handler/database_handler_interface";


setTimeout(() => {
  const d = new DatabaseHandlerInterface(log);

  setTimeout(async () => {
    const id = "some_id";
    await d.DeleteGuild(id)

  }, 1000);

}, 5000);