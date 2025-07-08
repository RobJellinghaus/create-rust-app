import { spawn, ChildProcess } from 'child_process';
import { writeFile } from 'fs/promises';
import path from 'path';

let serverProcess: ChildProcess;
let serverLogs: string[] = [];
let logFilePath: string;

export default async function globalSetup() {
  const testEmail = 'test@playwright.local';
  const testPassword = 'test123456';
  
  // Setup log file
  logFilePath = path.join(process.cwd(), 'playwright-server.log');
  console.log(`Server logs will be written to: ${logFilePath}`);
  
  try {
    // Step 1: Check if server is already running (optimization)
    const serverAlreadyRunning = await isServerRunning();
    if (serverAlreadyRunning) {
      console.log('Server already running - using existing server for faster testing');
      // Skip server startup entirely
    } else {
      // Step 2: Start server with log capture
      console.log('Starting server...');
      serverProcess = await startServerWithLogCapture();
      
      // Step 3: Wait for server to be ready
      await waitForServerReady();
      console.log('Server is ready');
    }
    
    // Step 4: Try existing test user first
    const loginSuccess = await tryLogin(testEmail, testPassword);
    
    if (loginSuccess) {
      console.log('Using existing test user');
      return;
    }
    
    // Only try to register if we started the server (so we can capture logs)
    if (!serverAlreadyRunning && serverProcess) {
      // Step 5: Register new test user
      console.log('Creating new test user...');
      await registerUser(testEmail, testPassword);
      
      // Step 6: Extract activation link from logs
      const activationUrl = await extractActivationLinkFromLogs();
      console.log('Found activation link');
      
      // Step 7: Activate user
      await activateUser(activationUrl);
      
      // Step 8: Verify login works - but don't fail if it doesn't
      const finalLoginSuccess = await tryLogin(testEmail, testPassword);
      if (!finalLoginSuccess) {
        console.log('Warning: Test user may not be fully activated, but proceeding with tests');
        console.log('Tests may fail if authentication is required');
        // Don't throw error - let tests run and fail gracefully if needed
      } else {
        console.log('Test user ready');
      }
    } else {
      console.log('Server already running - assuming test user exists or tests will handle auth failures gracefully');
    }
    
  } catch (error) {
    console.error('Global setup failed:', error);
    console.log('\n=== SERVER LOGS ===');
    console.log(serverLogs.join(''));
    console.log('=== END LOGS ===\n');
    throw error;
  }
}

async function ensureNoServerRunning() {
  const isRunning = await isServerRunning();
  if (isRunning) {
    throw new Error('Server already running on port 3000. Please stop it before running tests.\nRun: pkill -f procuretoy && pkill -f vite');
  }
}

async function isServerRunning(): Promise<boolean> {
  try {
    const response = await fetch('http://localhost:3000', { 
      signal: AbortSignal.timeout(1000) 
    });
    return true;
  } catch {
    return false;
  }
}

function startServerWithLogCapture(): Promise<ChildProcess> {
  return new Promise((resolve, reject) => {
    // Use relative path approach
    const serverProcess = spawn('cargo', ['fullstack'], {
      cwd: process.cwd(), // Should be procuretoy directory
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env }
    });
    
    // Capture all logs
    serverProcess.stdout?.on('data', (data: Buffer) => {
      const logLine = data.toString();
      serverLogs.push(logLine);
      writeLogToFile(logLine);
    });
    
    serverProcess.stderr?.on('data', (data: Buffer) => {
      const logLine = data.toString();
      serverLogs.push(`[STDERR] ${logLine}`);
      writeLogToFile(`[STDERR] ${logLine}`);
    });
    
    serverProcess.on('error', (error) => {
      console.error('Server process error:', error);
      reject(new Error(`Failed to start server: ${error.message}`));
    });
    
    serverProcess.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`Server exited with code ${code}`));
      }
    });
    
    // Give server time to start, then resolve
    setTimeout(() => {
      if (serverProcess.killed) {
        reject(new Error('Server process was killed during startup'));
      } else {
        resolve(serverProcess);
      }
    }, 2000);
  });
}

async function writeLogToFile(logLine: string) {
  try {
    await writeFile(logFilePath, logLine, { flag: 'a' });
  } catch {
    // Ignore file write errors
  }
}

async function waitForServerReady(): Promise<void> {
  const maxAttempts = 30; // 30 seconds
  
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch('http://localhost:3000');
      if (response.ok) return; // Server is ready
    } catch {
      // Server not ready yet
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  throw new Error('Server did not become ready within 30 seconds');
}

async function tryLogin(email: string, password: string): Promise<boolean> {
  try {
    const response = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function registerUser(email: string, password: string): Promise<void> {
  const response = await fetch('http://localhost:3000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  
  if (!response.ok) {
    throw new Error(`Registration failed: ${response.status} ${response.statusText}`);
  }
}

async function extractActivationLinkFromLogs(): Promise<string> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => 
      reject(new Error('Activation link not found in logs within 15 seconds')), 15000);
    
    // Check existing logs first
    for (const logLine of serverLogs) {
      const match = logLine.match(/http:\/\/localhost:3000\/activate\?token=[^\s]+/);
      if (match) {
        clearTimeout(timeout);
        return resolve(match[0]);
      }
    }
    
    // Listen for new logs
    const originalLength = serverLogs.length;
    const checkNewLogs = () => {
      for (let i = originalLength; i < serverLogs.length; i++) {
        const match = serverLogs[i].match(/http:\/\/localhost:3000\/activate\?token=[^\s]+/);
        if (match) {
          clearTimeout(timeout);
          return resolve(match[0]);
        }
      }
      setTimeout(checkNewLogs, 100);
    };
    
    checkNewLogs();
  });
}

async function activateUser(activationUrl: string): Promise<void> {
  // Visit the activation URL directly (like a user clicking the email link)
  const response = await fetch(activationUrl, {
    method: 'GET',
    redirect: 'follow'
  });
  
  if (!response.ok) {
    throw new Error(`Activation failed: ${response.status} ${response.statusText}`);
  }
  
  // Give the activation time to process in the database
  await new Promise(resolve => setTimeout(resolve, 1000));
}