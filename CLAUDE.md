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

## How to write Rust code

Whenever writing Rust code:

- Act as an experienced Rust programmer writing idiomatic Rust.
- Use Rust best practices to avoid vacuous match clauses, use iterator methods, and otherwise write
  terse, effective Rust.
- Never write unsafe code without being instructed to do so.
- Minimize use of the `unwrap()` function, instead prefer the `?` operator for propagating Results.
- Minimize duplicated code. Whenever altering multiple functions, consider whether there is an opportunity
  to de-duplicate code into a shared function.

## Whenever editing code

Whenever you have edited code, always run all tests to ensure your changes build correctly and
execute correctly.

Also, whenever editing code, ensure that the new code is covered by current or newly added tests.

## Error Detection Guidelines

When testing applications that start servers:

1. **Always check the final lines of output** - Critical errors often appear at the end
2. **Look for specific error patterns:**
    - `Error:` followed by any message
    - `Address already in use` (port conflicts)
    - `Connection refused` (service unavailable)
    - Non-zero exit codes
    - Process termination messages

3. **Before testing server applications:**
    - Check if ports are already in use: `lsof -i :3000 -i :3001`
    - Kill existing processes if needed: `pkill -f procuretoy` or `pkill -f "cargo fullstack"`
    - Wait a few seconds between stopping and starting services

4. **When testing with timeouts:**
    - Always examine the actual error output, not just whether the timeout occurred
    - Distinguish between "timeout because it's running" vs "timeout because it failed"

5. **Proper test validation:**
    - Successful startup should show "Server running on..." or similar messages
    - Failed startup will show error messages and process termination
