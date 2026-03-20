import './style.css';
import { mountPanel, cleanupPanel } from './panel';

// Wait for the anchor that sits just before YouTube's title/metadata area.
// #below-the-fold is outside the player container (no overflow:hidden, no overlays)
// so our panel renders in normal document flow between player and title.
function waitForAnchor(): Promise<void> {
  return new Promise((resolve) => {
    if (document.querySelector('#below-the-fold')) {
      resolve();
      return;
    }
    const observer = new MutationObserver(() => {
      if (document.querySelector('#below-the-fold')) {
        observer.disconnect();
        resolve();
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  });
}

export default defineContentScript({
  matches: ['*://*.youtube.com/watch*'],
  cssInjectionMode: 'ui',

  async main(ctx) {
    await waitForAnchor();

    const ui = await createShadowRootUi(ctx, {
      name: 'riff-mark-panel',
      position: 'inline',
      anchor: '#below-the-fold',
      append: 'before',
      onMount(container) {
        mountPanel(container, ctx);
      },
      onRemove() {
        cleanupPanel();
      },
    });

    ui.mount();

    ctx.addEventListener(window, 'yt-navigate-finish', async () => {
      ui.remove();
      await waitForAnchor();
      ui.mount();
    });
  },
});
