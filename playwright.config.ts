import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  use: {
    headless: true,
    viewport: { width: 390, height: 844 },
  },
  reporter: [['html', { outputFolder: 'tests/report' }]],
})
