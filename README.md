# Project Overview

This repository contains a variety of JavaScript and web development examples and implementations. Below is a brief description of each:

- [File Upload](./playground/file-upload): Implementation of large file upload using chunking.
- Toy Browser: A simplified browser simulation.
  - [Client.js](./src/browser/client.js): Simulates the browser client, including HTTP message parsing and page rendering.
  - [Server.js](./src/browser/server.js): Simulates the server side, handling request responses.
  - [Render.js](./src/browser/render.js): Simulates page drawing.
  - [Parser.js](./src/browser/parser.js): Uses a state machine to parse HTML and generate a DOM tree.
  - [CSSParser.js](./src/browser/cssParser.js): Parses CSS to generate a CSSOM and calculate specificity.
  - [Layout.js](./src/browser/layout.js): Calculates layout, with basic support for flex layout.
- Carousel: Native implementation of a carousel.
  - [Carousel](./src/component/Carousel.jsx): JSX version.
  - [Animation.js](./src/plugin/animation.js): JavaScript animation control.
  - [Gesture.js](./src/plugin/gesture.js): Gesture control.
- API Implementations: JavaScript API implementations.
  - [Promise](./src/api-implementations/promise.ts): Promise implementation.
  - [Generator Async](./src/api-implementations/async.ts): Generator-based asynchronous function implementation.
