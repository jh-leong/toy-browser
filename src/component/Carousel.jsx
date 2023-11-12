import { create, Text, Element, Component } from '../plugin/cus-jsx';

export class Carousel extends Component {
  imgs = [];
  position = 0;
  duration = 1000;
  root = null;

  constructor(config) {
    super();
  }

  get nextPos() {
    return (this.position + 1) % this.imgs.length;
  }

  get prePos() {
    const len = this.imgs.length;
    return (this.position - 1 + len) % len;
  }

  get width() {
    return this.root.clientWidth;
  }

  render() {
    this.initImg();

    this.root = <div class="carousel">{this.imgs}</div>;

    this.autoPlay();
    this.initDrag();

    return this.root;
  }

  initImg() {
    this.imgs = this.data.map((url, i) => {
      const img = <img src={url} />;

      const imgContainer = (
        <div class="img-container" data-index={i}>
          {img}
        </div>
      );

      img.addEventListener('dragstart', (event) => event.preventDefault());

      return imgContainer;
    });
  }

  autoPlay() {
    this.position = 0;

    const nextPic = () => {
      this.resetImgPosition(this.nextPos, this.getOriginX().next);
      setTimeout(() => this.next(), 16);
      setTimeout(nextPic, this.duration);
    };

    setTimeout(nextPic, this.duration);
  }

  initDrag() {
    this.root.addEventListener('mousedown', ({ clientX: startX }) => {
      this.reset();

      const move = ({ clientX: endX }) => this.move(endX - startX);

      const up = ({ clientX: endX }) => {
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

  resetImgPosition(pos, offsetXInPercent) {
    const el = this.imgs[pos];
    el.style.transition = 'none';
    this.setPositionBaseClient(pos, offsetXInPercent);
  }

  setImgPosition(pos, offsetXInPercent, useTransition = true) {
    const el = this.imgs[pos];
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
