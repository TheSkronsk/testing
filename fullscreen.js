/* Native browser control: requestFullscreen must run directly in a user gesture. */
(() => {
    'use strict';
    if (document.getElementById('forest-fullscreen')) return;

    const style = document.createElement('style');
    style.textContent = `
        #forest-fullscreen {
            position: fixed; z-index: 10;
            left: max(var(--forest-control-left, 118px), env(safe-area-inset-left));
            bottom: max(var(--forest-control-bottom, 12px), env(safe-area-inset-bottom));
            width: 44px; min-height: 44px; padding: 0;
            border: 1px solid #b9bd95; border-radius: 12px;
            background: #354a38; color: #faf0d7;
            font: 600 14px system-ui, sans-serif;
            box-shadow: 0 2px 5px #0004;
            touch-action: manipulation; cursor: pointer;
        }
        #forest-fullscreen[hidden] { display: none; }
        #forest-fullscreen:focus-visible, #forest-screen-help button:focus-visible {
            outline: 3px solid #d4b471; outline-offset: 3px;
        }
        #forest-fullscreen:disabled { opacity: .65; cursor: wait; }
        #forest-screen-help {
            box-sizing: border-box; width: min(420px, calc(100% - 32px));
            max-height: calc(100% - 32px); overflow: auto;
            border: 1px solid #829b58; border-radius: 16px;
            padding: 20px; background: #faf0d7; color: #293f33;
            font: 16px/1.5 system-ui, sans-serif;
        }
        #forest-screen-help::backdrop { background: #17261cb3; }
        #forest-screen-help h2 { margin: 0 40px 12px 0; font-size: 20px; }
        #forest-screen-help p { margin: 0 0 14px; }
        #forest-screen-help button {
            min-height: 44px; padding: 8px 20px; border: 0; border-radius: 10px;
            background: #354a38; color: #faf0d7; font: inherit; cursor: pointer;
        }
        #forest-screen-help #forest-screen-help-close {
            position: absolute; top: 8px; right: 8px; width: 44px; padding: 0;
            background: transparent; color: #293f33; font-size: 26px;
        }
    `;
    document.head.append(style);

    const button = document.createElement('button');
    button.id = 'forest-fullscreen';
    button.type = 'button';
    button.setAttribute('aria-pressed', 'false');
    document.body.append(button);

    const help = document.createElement('dialog');
    help.id = 'forest-screen-help';
    help.setAttribute('aria-labelledby', 'forest-screen-help-title');
    // Fixed strings only; no URL, browser message, or user content is injected.
    help.innerHTML = `
        <button type="button" id="forest-screen-help-close" aria-label="Close fullscreen help">×</button>
        <h2 id="forest-screen-help-title" tabindex="-1">Play with more screen space</h2>
        <p id="forest-screen-help-reason"></p>
        <p>On iPhone, open the game in Safari, tap <strong>Share</strong>, then
        <strong>Add to Home Screen</strong>. Enable <strong>Open as Web App</strong>
        if offered, then launch Forest Clan from the new icon.</p>
        <p>On other phones, try opening the game directly in Chrome or Safari
        instead of an in-app browser. Rotate your phone to landscape for the best view.</p>
        <p>The home-screen version needs an internet connection. Use Continue after reopening the game to load your latest save.</p>
        <form method="dialog"><button type="submit">Back to game</button></form>
    `;
    document.body.append(help);
    help.querySelector('#forest-screen-help-close').addEventListener('click', () => help.close());

    const fullscreenElement = () => document.fullscreenElement || document.webkitFullscreenElement;
    const standalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
    const canRequest = () =>
        (typeof document.documentElement.requestFullscreen === 'function' && document.fullscreenEnabled !== false) ||
        (typeof document.documentElement.webkitRequestFullscreen === 'function' && document.webkitFullscreenEnabled !== false);

    function sync() {
        const active = Boolean(fullscreenElement());
        button.hidden = standalone() && !active;
        button.textContent = active ? '↙' : '⛶';
        button.title = active ? 'Exit fullscreen' : 'Play fullscreen';
        button.setAttribute('aria-label', active ? 'Exit fullscreen' : 'Play fullscreen');
        button.setAttribute('aria-pressed', String(active));
        window.dispatchEvent(new Event('forest-controls-changed'));
    }

    function showHelp(reason) {
        help.querySelector('#forest-screen-help-reason').textContent = reason;
        if (typeof help.showModal !== 'function') {
            window.alert(Array.from(help.querySelectorAll('p'), (p) => p.textContent.trim()).join('\n\n'));
        } else if (!help.open) {
            help.showModal();
            help.querySelector('h2').focus();
            help.scrollTop = 0;
        }
    }

    button.addEventListener('click', (event) => {
        event.stopPropagation();
        if (!fullscreenElement() && !canRequest()) {
            showHelp('This browser does not offer fullscreen for the game. You can use a home-screen web app to hide the browser controls.');
            return;
        }
        button.disabled = true;
        try {
            let request;
            if (fullscreenElement()) {
                const exit = document.fullscreenElement
                    ? document.exitFullscreen
                    : document.webkitExitFullscreen;
                request = exit.call(document);
            } else {
                const root = document.documentElement;
                // Keep this call synchronous with the tap, before any await/promise.
                request = typeof root.requestFullscreen === 'function' && document.fullscreenEnabled !== false
                    ? root.requestFullscreen({ navigationUI: 'hide' })
                    : root.webkitRequestFullscreen();
            }
            Promise.resolve(request).catch(() => {
                showHelp('Fullscreen was not allowed. Try again, or open the game directly in your browser.');
            }).finally(() => {
                button.disabled = false;
                sync();
            });
        } catch (_error) {
            button.disabled = false;
            sync();
            showHelp('Fullscreen was not allowed. Try again, or open the game directly in your browser.');
        }
    });

    document.addEventListener('fullscreenchange', sync);
    document.addEventListener('webkitfullscreenchange', sync);
    window.addEventListener('pageshow', sync);
    const displayMode = window.matchMedia('(display-mode: standalone)');
    if (displayMode.addEventListener) displayMode.addEventListener('change', sync);
    sync();
})();
