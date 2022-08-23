import { Renderer } from "@nodegui/react-nodegui";
import React from "react";
import App from "./app";

try {
  process.title = "My NodeGui App";
  Renderer.render(<App />);
// This is for hot reloading (this will be stripped off in production by webpack)
  if (module.hot) {
    module.hot.accept(["./app"], function() {
      Renderer.forceUpdate();
    });
  }
} catch (err) {
  console.log("Caught major error:", err);
}

process
  .on("unhandledRejection", (reason, p) => {
    console.log("Unhandled rejection!");
    console.error(reason, "Unhandled Rejection at Promise", p);
  })
  .on("uncaughtException", err => {
    console.log("Uncaught exception!");
    console.error(err, "Uncaught Exception thrown");
    process.exit(1);
  });
