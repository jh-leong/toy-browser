/**
 * @type {(el: HTMLElement) => void}
 */
export function enableGesture(el) {
  /** @type { Record<PropertyKey, Partial<GestureContext>> } */
  const context = {};

  const MOUSE_SYMBOL = Symbol('mouse');

  function dispatchEvent(eventName, point, context, others = {}) {
    const { clientX, clientY } = point;
    const { startX, startY } = context;

    const detail = {
      clientX,
      clientY,
      startX,
      startY,
      ...others,
      context: { ...context },
      point: { target: point.target },
    };

    el.dispatchEvent(new CustomEvent(eventName, { detail, bubbles: true }));
  }

  function start(point, context) {
    const { clientX, clientY } = point;

    context.startX = clientX;
    context.startY = clientY;

    context.isTap = false;
    context.isPan = false;
    context.isPress = false;

    dispatchEvent('start', point, context);

    context.timeoutHandler = setTimeout(() => {
      if (context.isPan) return;

      context.isPress = true;

      dispatchEvent('pressStart', point, context);
    }, 500);
  }

  function move(point, context) {
    const { clientX, clientY } = point;

    const dx = clientX - context.startX;
    const dy = clientY - context.startY;

    const distance = dx ** 2 + dy ** 2;

    // move distance > 10px
    if (!context.isPan && distance > 100) {
      dispatchEvent('panStart', point, context);

      context.isPan = true;

      // if a 'pan' action occurs within 500ms
      // the 'press' event will not be triggered
      clearTimeout(context.timeoutHandler);
    }

    if (context.isPan) {
      dispatchEvent('pan', point, context);

      if (!context.moveStart) context.moveStart = Date.now();
    }
  }

  function end(point, context) {
    const { clientX, clientY } = point;

    clearTimeout(context.timeoutHandler);

    if (context.isPan) {
      el.dispatchEvent(
        new CustomEvent('panEnd', {
          detail: { clientX, clientY, startX: clientX, startY: clientY },
        })
      );

      const dx = clientX - context.startX;
      const dy = clientY - context.startY;

      const speed =
        Math.sqrt(dx ** 2 + dy ** 2) / (Date.now() - context.moveStart);

      const isFlick = speed > 2.5;
      if (isFlick) {
        dispatchEvent('flick', point, context, { speed });
      }

      dispatchEvent('panEnd', point, context, { speed, isFlick });
    }

    if (context.isPress) {
      dispatchEvent('pressEnd', point, context);
    }

    if (!context.isPan && !context.isPress) {
      context.isTap = true;
      dispatchEvent('tap', point, context);
    }

    dispatchEvent('end', point, context);
  }

  function cancel(point, context) {
    dispatchEvent('canceled', point, context);
    clearTimeout(context.timeoutHandler);
  }

  el.addEventListener('mousedown', (e) => {
    context[MOUSE_SYMBOL] = {};
    start(e, context[MOUSE_SYMBOL]);

    const mousemove = (e) => {
      move(e, context[MOUSE_SYMBOL]);
    };

    const mouseup = (e) => {
      end(e, context[MOUSE_SYMBOL]);
      delete context[MOUSE_SYMBOL];
      document.removeEventListener('mousemove', mousemove);
      document.removeEventListener('mouseup', mouseup);
    };

    document.addEventListener('mouseup', mouseup);
    document.addEventListener('mousemove', mousemove);
  });

  el.addEventListener('touchstart', (e) => {
    for (const touch of e.changedTouches) {
      context[touch.identifier] = {};
      start(touch, context[touch.identifier]);
    }
  });

  el.addEventListener('touchmove', (e) => {
    for (const touch of e.changedTouches) {
      move(touch, context[touch.identifier]);
    }
  });

  el.addEventListener('touchend', (e) => {
    for (const touch of e.changedTouches) {
      end(touch, context[touch.identifier]);
      delete context[touch.identifier];
    }
  });

  el.addEventListener('touchcancel', (e) => {
    for (const touch of e.changedTouches) {
      cancel(touch, context[touch.identifier]);
      delete context[touch.identifier];
    }
  });
}
