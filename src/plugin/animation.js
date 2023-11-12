export class Timeline {
  /** @type Animation[] */
  animations = [];
  startTime = 0;
  pauseTime = 0;
  requestId = 0;

  /** @type {'initial' | 'playing' | 'paused'} */
  state = 'initial';

  constructor() {}

  tick() {
    const t = Date.now() - this.startTime;

    const ans = this.animations.filter((i) => !i.finished);
    if (!ans.length) return;

    ans.forEach((an) => {
      const {
        duration,
        object,
        property,
        template,
        start,
        end,
        timingFunction,
        delay,
        addTime,
      } = an;

      let progression = timingFunction((t - delay - addTime) / duration);

      if (t > duration + delay + addTime) {
        progression = 1;
        an.finished = true;
      }

      const value = start + progression * (end - start);

      object[property] = template(value);
    });

    this.requestId = requestAnimationFrame(() => this.tick());
  }

  pause() {
    if (this.state !== 'playing') return;

    this.state = 'paused';
    this.pauseTime = Date.now();
    cancelAnimationFrame(this.requestId);
  }

  resume() {
    if (this.state !== 'paused') return;

    this.state = 'playing';
    this.startTime += Date.now() - this.pauseTime;
    this.tick();
  }

  start() {
    if (this.state !== 'initial') return;

    this.state = 'playing';
    this.startTime = Date.now();
    this.tick();
  }

  restart() {
    if (this.state === 'playing') this.pause();

    this.animations.forEach((i) => (i.finished = false));
    this.state = 'playing';
    this.startTime = Date.now();
    this.pauseTime = 0;
    this.tick();
  }

  /** @type { (animation: Animation, startTime?: number) => void } */
  add(animation, addTime) {
    this.animations.push(animation);
    animation.finished = false;

    animation.addTime =
      addTime ?? (this.state === 'playing' ? Date.now() - this.startTime : 0);
  }
}

export class Animation {
  finished = false;
  addTime = 0;

  constructor({
    object,
    property,
    template,
    start,
    end,
    duration,
    delay = 0,
    timingFunction,
  }) {
    this.object = object;
    this.property = property;
    this.template = template;
    this.start = start;
    this.end = end;
    this.duration = duration;
    this.delay = delay;
    this.timingFunction = timingFunction;
  }
}
