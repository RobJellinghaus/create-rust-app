import { PlaywrightTestConfig } from '@playwright/test';
const config: PlaywrightTestConfig = {
  timeout: 10000,
  use: {
    baseURL: 'http://localhost:3000',
  },
};
export default config;