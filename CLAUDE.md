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

We are implementing a comprehensive supplier management system as part of the procuretoy application.
This includes both backend and frontend components following the established patterns from the existing
todo system, with full GraphQL support for both Apollo and Relay clients.

## Playwright Configuration

When running Playwright tests, the configuration is set to:
- Use `open: 'never'` for HTML reporter to prevent serving report at localhost:9323
- Generate HTML report files but exit immediately instead of serving them
- This prevents hanging processes and allows tests to complete promptly

## Running The Server

Whenever you are about to run `cargo fullstack &`, please make sure all log output is going to a file
by instead running:

- `cargo fullstack > fullstack.log 2>&1 &`

If there are any failures, please explain them.

This command:
1. Builds the Rust backend
2. Starts the backend server on port 3000
3. Starts the Vite development server on port 21012 with API proxying
4. Provides hot-reloading for frontend development
5. Provides hot-recompilation for Rust development

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

#### For Testing (as defined in globalSetup.ts)

The test setup process (note that this is best done by `globalSetup.ts` itself,
rather than manually):

1. **Check if server is already running** on port 3000
2. **Start server** using `cargo fullstack` if not running, redirecting output to log file
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
   or the `GraphQL` and `Todos (Relay)` tabs of the application, will fail
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

## Supplier Chatbot Plan

# Detailed Implementation Plan: Rust-Native Ollama Chatbot with Supplier Context

## Architecture Overview

```
Frontend (React)
    ↓ GraphQL Mutation
Rust Backend
    ↓ ollama-rs
Ollama Server (localhost:11434)
    ↓ Always includes
Fresh Supplier Data (PostgreSQL)
```

## Phase 1: Backend Infrastructure

### 1.1 Dependencies
```toml
# Add to Cargo.toml
[dependencies]
ollama-rs = "0.1"  # Latest version
tokio = { version = "1.0", features = ["full"] }
serde = { version = "1.0", features = ["derive"] }
```

### 1.2 Chat Service Layer
```rust
// backend/services/chat.rs
use ollama_rs::{Ollama, generation::completion::request::GenerationRequest};
use crate::models::suppliers::Suppliers;
use crate::Database;

pub struct ChatService {
    ollama: Ollama,
}

impl ChatService {
    pub fn new() -> Self {
        Self {
            ollama: Ollama::new("http://localhost".to_string(), 11434),
        }
    }

    pub async fn chat_with_suppliers(
        &self,
        user_message: String,
        db: &Database,
    ) -> Result<String, Box<dyn std::error::Error>> {
        // 1. Fetch all current suppliers
        let suppliers = self.get_all_suppliers(db).await?;
        
        // 2. Build context with supplier data
        let context = self.build_supplier_context(&suppliers);
        
        // 3. Create procurement expert prompt
        let full_prompt = self.build_prompt(&context, &user_message);
        
        // 4. Send to Ollama
        let request = GenerationRequest::new("llama2".to_string(), full_prompt);
        let response = self.ollama.generate(request).await?;
        
        Ok(response.response)
    }

    async fn get_all_suppliers(&self, db: &Database) -> Result<Vec<Suppliers>, diesel::result::Error> {
        use crate::models::suppliers::*;
        let mut conn = db.get_connection()?;
        Suppliers::read_all(&mut conn)
    }

    fn build_supplier_context(&self, suppliers: &[Suppliers]) -> String {
        if suppliers.is_empty() {
            return "Currently, there are no suppliers in the system.".to_string();
        }

        let mut context = String::from("Current Supplier Database:\n\n");
        
        for (index, supplier) in suppliers.iter().enumerate() {
            context.push_str(&format!(
                "{}. {}\n   Location: {}, {}, {}, {}\n   Contact: {} ({})\n   Phone: {}\n   Website: {}\n\n",
                index + 1,
                supplier.name,
                supplier.city,
                supplier.state,
                supplier.zip_code,
                supplier.country,
                supplier.contact_name,
                supplier.contact_email,
                supplier.contact_phone,
                supplier.website.as_deref().unwrap_or("Not provided")
            ));
        }
        
        context
    }

    fn build_prompt(&self, supplier_context: &str, user_message: &str) -> String {
        format!(
            r#"You are a procurement expert AI assistant helping users make informed supplier decisions. 
Your expertise includes supplier evaluation, location-based logistics, cost optimization, and supply chain risk management.

CURRENT SUPPLIER DATABASE:
{}

INSTRUCTIONS:
- Help users choose the best suppliers based on their needs
- Consider geographical proximity for shipping costs and delivery times  
- Analyze supplier locations for logistics advantages
- Provide practical procurement advice
- If asked about suppliers not in the database, inform the user they're not currently available
- Be concise but thorough in your recommendations
- Always consider location as a key factor in supplier selection

USER QUESTION: {}

RESPONSE:"#,
            supplier_context, user_message
        )
    }
}
```

## Phase 2: GraphQL Integration

### 2.1 GraphQL Types
```rust
// backend/graphql/mutation.rs additions

#[derive(InputObject)]
pub struct ChatInput {
    pub message: String,
}

#[derive(SimpleObject)]
pub struct ChatResponse {
    pub response: String,
    pub supplier_count: i32,  // For debugging/transparency
}

// Add to MutationRoot impl
async fn chat(&self, ctx: &Context<'_>, input: ChatInput) -> Result<ChatResponse> {
    let db = ctx.data::<Database>()?;
    let chat_service = ChatService::new();
    
    let response = chat_service
        .chat_with_suppliers(input.message, db)
        .await
        .map_err(|e| async_graphql::Error::new(format!("Chat error: {}", e)))?;
    
    // Get supplier count for transparency
    let mut conn = db.get_connection()?;
    let supplier_count = Suppliers::count_all(&mut conn)
        .map_err(|e| async_graphql::Error::new(format!("Database error: {}", e)))?;

    Ok(ChatResponse {
        response,
        supplier_count,
    })
}
```

### 2.2 Schema Updates
```graphql
# Add to schema.graphql
input ChatInput {
  message: String!
}

type ChatResponse {
  response: String!
  supplierCount: Int!
}

extend type Mutation {
  chat(input: ChatInput!): ChatResponse!
}
```

## Phase 3: Frontend Implementation

### 3.1 Chat Component
```tsx
// frontend/src/containers/Chat.tsx
import React, { useState } from 'react';
import { graphql, useMutation } from 'react-relay';

const chatMutation = graphql`
  mutation ChatMutation($input: ChatInput!) {
    chat(input: $input) {
      response
      supplierCount
    }
  }
`;

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

export const Chat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [chat, isChatPending] = useMutation(chatMutation);

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputMessage,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');

    chat({
      variables: { input: { message: inputMessage } },
      onCompleted: (response) => {
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: response.chat.response,
          isUser: false,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, aiMessage]);
      },
      onError: (error) => {
        console.error('Chat error:', error);
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: 'Sorry, I encountered an error. Please try again.',
          isUser: false,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '600px' }}>
      <h1>Procurement Assistant</h1>
      
      <div className="Form" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Chat Messages */}
        <div style={{ 
          flex: 1, 
          overflowY: 'auto', 
          border: '1px solid #e2e8f0',
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '16px'
        }}>
          {messages.length === 0 ? (
            <div style={{ color: '#666', fontStyle: 'italic' }}>
              Ask me about suppliers! I can help you choose the best options based on location and your needs.
            </div>
          ) : (
            messages.map(message => (
              <div
                key={message.id}
                style={{
                  marginBottom: '12px',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  backgroundColor: message.isUser ? '#2563eb' : '#f1f5f9',
                  color: message.isUser ? 'white' : '#0f172a',
                  alignSelf: message.isUser ? 'flex-end' : 'flex-start',
                  maxWidth: '80%',
                }}
              >
                <div>{message.text}</div>
                <div style={{ 
                  fontSize: '12px', 
                  opacity: 0.7, 
                  marginTop: '4px' 
                }}>
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Input Section */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Ask about suppliers... (e.g., 'Which suppliers are closest to California?')"
            disabled={isChatPending}
            style={{ flex: 1 }}
          />
          <button
            onClick={handleSendMessage}
            disabled={isChatPending || !inputMessage.trim()}
          >
            {isChatPending ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
};
```

### 3.2 Navigation Integration
```tsx
// Add to App.tsx
import { Chat } from './containers/Chat';

// Add route
<Route path="/chat" element={
  <Suspense fallback={<div>Loading chat...</div>}>
    <Chat />
  </Suspense>
} />

// Add navigation button
<a className="NavButton" onClick={() => navigate('/chat')}>Chat</a>
```

## Phase 4: Implementation Steps

### Step 1: Ollama Setup
```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Pull a model
ollama pull llama2

# Verify running
ollama list
```

### Step 2: Backend Implementation
1. Add dependencies to `Cargo.toml`
2. Create `backend/services/chat.rs`
3. Add chat service to `backend/services/mod.rs`
4. Update GraphQL mutations
5. Update schema.graphql

### Step 3: Frontend Implementation
1. Create Chat component
2. Add GraphQL mutations
3. Generate Relay artifacts
4. Add navigation

### Step 4: Testing Strategy
```bash
# Test Ollama directly
curl http://localhost:11434/api/generate -d '{
  "model": "llama2",
  "prompt": "You are a procurement expert. What factors should I consider when choosing suppliers?"
}'

# Test with Playwright
# Create chat.spec.ts for end-to-end testing
```

## Phase 5: Example Interactions

### Expected User Queries:
- "Which suppliers are closest to Los Angeles?"
- "I need a supplier in the Northeast region"
- "Compare suppliers by location for shipping to Chicago"
- "Which supplier would be best for a California-based business?"

### AI Response Examples:
- Location-based recommendations
- Shipping time estimates
- Regional advantages
- Cost considerations based on proximity

## Phase 6: Future Enhancements
1. **Model selection** (allow user to choose llama2, codellama, etc.)
2. **Conversation context** (remember previous messages)
3. **Supplier analytics** (shipping routes, cost estimates)
4. **Custom prompts** (industry-specific procurement advice)

This approach gives you a fully Rust-native solution that's easy to debug, maintain, and extend while providing intelligent supplier recommendations based on location and procurement best practices.

Next steps involve creating React components with Relay GraphQL integration following the established Todo component patterns.