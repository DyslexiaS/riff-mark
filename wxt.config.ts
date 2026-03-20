import { defineConfig } from 'wxt';

export default defineConfig({
  manifest: {
    name: 'Riff Mark',
    description: 'Drop timestamp marks and loop sections on YouTube guitar tutorials.',
    permissions: ['storage'],
    host_permissions: ['*://*.youtube.com/*'],
  },
  browser: 'chrome',
  modules: ['@wxt-dev/module-react'],
});
