# Claude instructions for `create-rust-app` project

These instructions refer to all files in the Claude root folder, and in particular to the
`procuretoy` child folder.

## `create-rust-app` project

The root folder contains the source for `create-rust-app` which is a code generator for
web applications that use Rust on the backend and React on the frontend.

- Git repository: https://github.com/RobJellinghaus/create-rust-app/tree/experiments/11.0.3/claude

## `procuretoy` sub-project

The `procuretoy` folder contains a generated project resulting from running this command:

- `create-rust-app procuretoy`

The resulting code was then checked into this branch:

- Git repository: https://github.com/RobJellinghaus/create-rust-app/tree/experiments/11.0.3/procuretoy

## Current project goal

We want to add Playwright tests for all the main functions of the Todos app.

## How to `run all tests`

Whenever requested to `run all tests`, please execute:

- `npx playwright test --workers=1`

If there are any failures, please explain them.
