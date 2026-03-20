import { defineConfig } from 'wxt';

export default defineConfig({
  manifest: {
    name: 'Riff Mark',
    description: 'Drop timestamp marks and loop any section of any YouTube video.',
    permissions: ['storage'],
    host_permissions: ['*://*.youtube.com/*'],
  },
  browser: 'chrome',
  modules: ['@wxt-dev/module-react'],
});
