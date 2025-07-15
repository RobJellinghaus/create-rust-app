import { exec } from 'child_process';
import { promisify } from 'util';
import { unlink } from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

export default async function globalTeardown() {
  console.log('Cleaning up test environment...');
  
  // Check if we should keep server running for faster iteration
  const keepServer = process.env.PROCURETOY_KEEP_SERVER === 'true';
  
  if (keepServer) {
    console.log('PROCURETOY_KEEP_SERVER=true - leaving server running for faster iteration');
    return;
  }
  
  try {
    // Kill all related processes with force
    await execAsync('pkill -f procuretoy || true');
    await execAsync('pkill -f vite || true');
    await execAsync('pkill -f fullstack || true');
    await execAsync('pkill -f node || true');
    
    console.log('Server processes terminated');
    
    // Clean up log file
    try {
      const logFilePath = path.join(process.cwd(), 'playwright-server.log');
      await unlink(logFilePath);
    } catch {
      // Log file cleanup is non-critical
    }
    
  } catch (error) {
    console.log('Cleanup error (non-fatal):', error);
  }
}