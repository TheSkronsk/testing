/* Preserve browser cancellation: Godot's web driver can normalize touchcancel
   into an ordinary release before its GUI sees it. Capture it first. */
(() => {
    'use strict';
    if (window.forestTouchInput) return;
    let cancelSerial = 0;
    const cancel = () => { cancelSerial += 1; };
    Object.defineProperty(window, 'forestTouchInput', {
        value: Object.freeze({ get cancelSerial() { return cancelSerial; } })
    });
    document.addEventListener('touchcancel', cancel, { capture: true, passive: true });
    document.addEventListener('pointercancel', (event) => {
        if (event.pointerType === 'touch') cancel();
    }, { capture: true, passive: true });
    window.addEventListener('blur', cancel);
    window.addEventListener('pagehide', cancel);
})();
