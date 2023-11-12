export class Carousel {
  /** @type any */
  root = null;
  data = [];
  duration = 1000;
  position = 0;

  constructor() {}

  get nextPos() {
    return (this.position + 1) % this.data.length;
  }

  get prePos() {
    const len = this.data.length;
    return (this.position - 1 + len) % len;
  }

  get imgs() {
    return this.root.children;
  }

  get width() {
    return this.root.clientWidth;
  }

  init(data) {
    this.data = data;

    this.root = document.createElement('div');
    this.root.classList.add('carousel');

    this.initImg();
    this.autoPlay();
    this.initDrag();

    return {
      mount: this.mount.bind(this),
    };
  }

  mount(container = '') {
    document.getElementById(container)?.appendChild(this.root);
  }

  initImg() {
    this.data.forEach((src, i) => {
      const imgContainer = document.createElement('div');
      imgContainer.classList.add('img-container');
      imgContainer.setAttribute('data-index', String(i));

      const img = document.createElement('img');
      img.src = src;
      img.addEventListener('dragstart', (event) => event.preventDefault());

      imgContainer.appendChild(img);
      this.root.appendChild(imgContainer);
    });
  }

  initDrag() {
    this.root.addEventListener('mousedown', (event) => {
      const { clientX: startX } = event;

      this.reset();

      const move = (event) => {
        const { clientX: endX } = event;
        this.move(endX - startX);
      };

      const up = (event) => {
        const { clientX: endX } = event;

        const diff = endX - startX;
        const threshold = this.width / 5;

        if (diff > threshold) {
          this.prev();
        } else if (diff < -threshold) {
          this.next();
        } else {
          this.reset();
        }

        removeEvent();
      };

      const removeEvent = () => {
        document.removeEventListener('mouseup', up);
        document.removeEventListener('mousemove', move);
      };

      document.addEventListener('mouseup', up);
      document.addEventListener('mousemove', move);
    });
  }

  autoPlay() {
    this.position = 0;

    const nextPic = () => {
      this.resetImgPosition(this.nextPos, this.getOriginX().next);

      /**
       * 0. 直接改样式是不行的, 因为浏览器会合并样式, 会把连续的样式合并成一次渲染
       */
      // this.next();

      /**
       * 1. 使用 setTimeout 等待 reset 的样式设置完成
       * 16: 一帧的时间 1000 / 60, 浏览器每秒一般是 60 帧
       */
      setTimeout(() => this.next(), 16);

      /**
       * 2. 使用 requestAnimationFrame 等待 reset 的样式设置完成
       * 第一次, reset 的样式生效
       * 第二次, reset 的样式执行完成
       */
      // requestAnimationFrame(() => requestAnimationFrame(() => this.next()));

      setTimeout(nextPic, this.duration);
    };

    setTimeout(nextPic, this.duration);
  }

  resetImgPosition(pos, offsetXInPercent) {
    const el = this.imgs[pos];
    el.style.transition = 'none';
    this.setPositionBaseClient(pos, offsetXInPercent);
  }

  setImgPosition(pos, offsetXInPercent, useTransition = true) {
    const el = this.imgs[pos];
    // empty mean use css rule
    if (useTransition) el.style.transition = '';
    this.setPositionBaseClient(pos, offsetXInPercent);
  }

  setPositionBaseClient(pos, offsetX) {
    const el = this.imgs[pos];
    el.style.transform = `translateX(${-1 * this.width * pos + offsetX}px)`;
  }

  next() {
    const { pre, cur } = this.getOriginX();
    this.setImgPosition(this.position, pre);
    this.setImgPosition(this.nextPos, cur);
    this.position = this.nextPos;
  }

  prev() {
    const { cur, next } = this.getOriginX();
    this.setImgPosition(this.prePos, cur);
    this.setImgPosition(this.position, next);
    this.position = this.prePos;
  }

  getOriginX() {
    return {
      pre: -this.width,
      cur: 0,
      next: this.width,
    };
  }

  reset() {
    const { pre, cur, next } = this.getOriginX();
    this.resetImgPosition(this.prePos, pre);
    this.resetImgPosition(this.position, cur);
    this.resetImgPosition(this.nextPos, next);
  }

  move(offset) {
    const { pre, cur, next } = this.getOriginX();
    this.setImgPosition(this.prePos, offset + pre, false);
    this.setImgPosition(this.position, offset + cur, false);
    this.setImgPosition(this.nextPos, offset + next, false);
  }
}
