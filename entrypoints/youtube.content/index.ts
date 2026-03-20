import { mountPanel, cleanupPanel } from './panel';

export default defineContentScript({
  matches: ['*://*.youtube.com/watch*'],
  cssInjectionMode: 'ui',

  async main(ctx) {
    const ui = await createShadowRootUi(ctx, {
      name: 'riff-mark-panel',
      position: 'inline',
      anchor: '#movie_player',
      append: 'after',
      onMount(container) {
        container.style.display = 'block';
        mountPanel(container, ctx);
      },
      onRemove() {
        cleanupPanel();
      },
    });

    ui.mount();

    ctx.addEventListener(window, 'yt-navigate-finish', () => {
      ui.remove();
      ui.mount();
    });
  },
});
