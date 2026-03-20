import './style.css';
import { mountPanel, cleanupPanel } from './panel';

function waitForPlayer(): Promise<void> {
  return new Promise((resolve) => {
    if (document.querySelector('#movie_player')) {
      resolve();
      return;
    }
    const observer = new MutationObserver(() => {
      if (document.querySelector('#movie_player')) {
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
    await waitForPlayer();

    const ui = await createShadowRootUi(ctx, {
      name: 'riff-mark-panel',
      position: 'inline',
      anchor: '#movie_player',
      append: 'after',
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
      await waitForPlayer();
      ui.mount();
    });
  },
});
