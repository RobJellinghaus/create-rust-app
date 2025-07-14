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

## `dsync` sub-project

There is another crate involved in the build process of this application, specifically the
`dsync` crate. This is a code generator which emits Diesel code based on a schema.

### Code generation is likely due to `dsync` crate

When making changes to GraphQL attributes or other schema details:

- If you run the tests and your changes appear to be reverted, it is likely due to the `dsync` crate.
- If this occurs, please investigate the use of the `dsync` crate in the build process of this
  application, and please include the `dsync` directory in your context to analyze its behavior.

## Current project goal

We are working on adding a Relay version of the existing Apollo / GraphQL / React component.
This is exposing some type mismatch issues between the existing Apollo GraphQL implementation,
and the expectations of Relay.

## Playwright Configuration

When running Playwright tests, the configuration is set to:
- Use `open: 'never'` for HTML reporter to prevent serving report at localhost:9323
- Generate HTML report files but exit immediately instead of serving them
- This prevents hanging processes and allows tests to complete promptly

Whenever you are about to run `cargo fullstack &`, please make sure all log output is going to a file
by instead running:

- `cargo fullstack > fullstack.log 2>&1 &`

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
    - Kill existing processes if needed: see the code in `globalTeardown.ts` for how this is done
    - Wait a few seconds between stopping and starting services

4. **When testing with timeouts:**
    - Always examine the actual error output, not just whether the timeout occurred
    - Distinguish between "timeout because it's running" vs "timeout because it failed"

5. **Proper test validation:**
    - Successful startup should show "Server running on..." or similar messages
    - Failed startup will show error messages and process termination

## Testing Auto-Generated Code Systems

When working with applications that use code generation tools (like `dsync`, `tsync`, etc.):

1. **Watch for auto-generation during builds:**
    - Look for messages like "Running dsync (generating model code...)"
    - Code generation tools may overwrite manual edits during compilation
    - System reminders about file modifications often indicate auto-generation conflicts

2. **Identify generated vs. manual code:**
    - Files with `/* @generated and managed by dsync */` headers are auto-generated
    - Manual edits to generated files will be lost during builds
    - Check for generation tools in `Cargo.toml` or build scripts

3. **Testing strategy for generated code:**
    - Test compilation first before assuming runtime success
    - If compilation fails after successful edits, suspect auto-generation conflicts
    - Look for wrapper types or configuration options instead of direct edits

4. **Port conflict resolution:**
    - Always check ALL required ports (frontend, backend, dev server, etc.)
    - Kill processes by name: `pkill -f "process-name"`
    - Force kill specific PIDs: `kill -9 <PID>`
    - Common ports for full-stack apps: 3000 (backend), 21012 (frontend dev), 60013 (dev proxy)

5. **Build process validation:**
    - Distinguish between "build started" vs "build succeeded"
    - Watch for compilation errors buried in verbose output
    - Frontend build success doesn't guarantee backend compilation success
    - Multiple compilation stages may each have different errors

6. **Error pattern recognition:**
    - `trait bound ... is not satisfied` often indicates missing derives or feature flags
    - `Port ... is taken` requires process cleanup before retry
    - `could not compile ... due to N previous errors` means build definitively failed
    - Exit codes: 0 = success, 127 = command not found/failed, others = various failures

## Procuretoy Server Lifecycle Management

### Overview
The procuretoy server is a full-stack Rust application that serves both the backend API and frontend static files. It requires a specific startup and shutdown procedure for proper operation, especially when running tests.

### Server Architecture
- **Backend**: Rust application serving on `http://localhost:3000`
- **Frontend Development**: Vite dev server proxying to backend via `http://localhost:21012`
- **Database**: Uses Diesel ORM with PostgreSQL/SQLite
- **Authentication**: Custom auth system with email activation flow

### Proper Server Startup Procedure

#### For Development
```bash
# Start the full-stack server (backend + frontend)
cargo fullstack
```

This command:
1. Builds the Rust backend
2. Starts the backend server on port 3000
3. Starts the Vite development server on port 21012 with API proxying
4. Provides hot-reloading for frontend development

#### For Testing (as defined in globalSetup.ts)
```bash
# The proper way to start server for tests
cargo fullstack
```

The test setup process (note that this is best done by `globalSetup.ts` itself,
rather than manually):

1. **Check if server is already running** on port 3000
2. **Start server** using `cargo fullstack` if not running
3. **Wait for server readiness** by polling `http://localhost:3000`
4. **Create test user** (`test@playwright.local` / `test123456`)
5. **Extract activation link** from server logs
6. **Activate user** using Playwright to click activation button
7. **Verify login** works before proceeding with tests

### Proper Server Shutdown Procedure

#### Manual Shutdown
```bash
# Kill all related processes
pkill -f procuretoy
pkill -f vite
pkill -f fullstack
pkill -f node
```

#### Automated Shutdown (as defined in globalTeardown.ts)
The test teardown process:
1. **Check environment variable** `PLAYWRIGHT_KEEP_SERVER` for faster iteration
2. **Kill all related processes** with force:
   - `pkill -f procuretoy`
   - `pkill -f vite`
   - `pkill -f fullstack`
   - `pkill -f node`
3. **Clean up log files** (non-critical)

### Proper GraphQL Access Procedure

1. **GraphQL requires authorization**: The GraphQL endpoints of this application
   are protected by authorization. All attempts to access the GraphQL endpoints,
   or the `Todos (GraphQL)` and `Todos (Relay)` tabs of the application, will fail
   unless the current user has been successfully logged in.
2. **Playwright globalSetup handles authorization**: The Playwright `globalSetup.ts`
   code handles initializing a new running instance of the server (and handling any
   previously executing instances), and then registering and logging in with a new
   user.
3. **Playwright tests are recommended for accessing GraphQL endpoints**: Because of
   the last two points, any investigation of GraphQL endpoints, or React and Relay
   issues involving GraphQL, is best implemented as a Playwright test that uses
   the Playwright authorization setup. 

### Important Notes

#### URL Configuration
- **Backend API**: Always `http://localhost:3000`
- **Frontend Dev Server**: `http://localhost:21012` (proxies to backend)
- **Test Configuration**: All tests should use `http://localhost:3000` as base URL

#### Log Management
- Server logs are captured in `playwright-server.log` during tests
- Logs are essential for extracting activation links during user registration
- Use `console.log` statements are captured for debugging test failures

#### Playwright testing 
- The Playwright tests affect a single server's persistent state, there is no database
  or test user isolation.
- This means that all Playwright tests *must* be run with the `--workers=1` flag, or
  concurrent tests will collide and fail.
- This also means that running individual Playwright tests without using `globalSetup.ts`
  is not likely to succeed. It is better to run Playwright tests with the global setup.

#### Database State
- Tests assume a clean database state
- User registration creates activation emails that must be processed
- The activation flow requires parsing server logs to extract activation URLs

#### Development vs Test Servers
- **Development**: Use `npm run start:dev` for frontend-only development
- **Full Stack**: Use `cargo fullstack` for complete server (required for tests)
- **Testing**: Always use `cargo fullstack` - frontend-only server won't work for tests

#### Common Pitfalls
1. **Never use `npm run start:dev` for testing** - it only starts frontend dev server
2. **Always wait for server readiness** before proceeding with requests
3. **Authentication requires activation** - can't just register and login immediately
4. **Port conflicts** - ensure no other services are using ports 3000 or 21012

### Environment Variables
- `PLAYWRIGHT_KEEP_SERVER=true` - Keep server running between test runs for faster iteration
- `TEST_URL` - Base URL for tests (should be `http://localhost:3000`)

### Critical Working Directory Requirements

#### ALWAYS show current working directory
- **All Bash commands MUST include `pwd &&` at the start** to show current working directory
- This prevents confusion about which directory commands are being executed from
- Example: `pwd && cargo fullstack` instead of just `cargo fullstack`

#### Server Command Directory Requirements
- **`cargo fullstack` MUST ALWAYS be run from `/Users/robjell/Dev/git/create-rust-app/procuretoy/`**
- **NEVER run `cargo fullstack` from the `frontend/` subdirectory**
- This ensures `fullstack.log` is created in the correct location (`procuretoy/fullstack.log`)
- Running from wrong directory causes port conflicts and log file confusion

#### Frontend-specific Commands
- **Frontend build commands (`npm run build`, `npm run relay`) should be run from `procuretoy/frontend/`**
- **Playwright tests should be run from `procuretoy/` directory**
- **TypeScript compilation (`npx tsc`) should be run from `procuretoy/frontend/`**

### Relay Configuration
The Relay GraphQL client requires:
1. **Schema file**: `src/schema.graphql` - manually reconstructed from backend
2. **Relay Environment**: `src/RelayEnvironment.ts` - configured for `/api/graphql` endpoint
3. **Babel Plugin**: `babel-plugin-relay` configured in `vite.config.ts`
4. **Generated Types**: `src/__generated__/` - created by `relay-compiler`

#### Relay Build Process
```bash
# Generate Relay artifacts
npm run relay

# Build with Relay support
npm run build
```

The Relay compiler must run before building to generate TypeScript types from GraphQL queries.
