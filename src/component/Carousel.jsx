import { create, Text, Element, Component } from '../plugin/cus-jsx';
import { Animation, Timeline } from '../plugin/animation';
import { timingFunction } from '../plugin/cubicBezier';

export class Carousel extends Component {
  /** @type any */
  root = null;
  data = [];
  imgs = [];
  curIdx = 0;
  duration = 1000;

  constructor(config) {
    super();
  }

  /** @private */
  get nextIdx() {
    return (this.curIdx + 1) % this.imgs.length;
  }

  /** @private */
  get preIdx() {
    const len = this.imgs.length;
    return (this.curIdx - 1 + len) % len;
  }

  /** @private */
  get width() {
    return this.root.clientWidth;
  }

  render() {
    this.root = <div class="carousel">{this.initImg()}</div>;

    this.play();
    this.initDrag();

    return this.root;
  }

  prev(offset = 0) {
    this.transitionCurImg('next', offset);
  }

  next(offset = 0) {
    this.transitionCurImg('pre', offset);
  }

  play() {
    const nextPic = () => {
      this.next();
      this.playTimer = setTimeout(nextPic, this.duration);
    };

    this.playTimer = setTimeout(nextPic, this.duration);
  }

  pause() {
    if (this.timeline) {
      this.timeline.pause();
      this.timeline = null;
    }

    clearTimeout(this.playTimer);
  }

  /**
   * @private
   * @type {(toPos: 'pre' | 'next', offset?: number) => void}
   */
  transitionCurImg(toPos, offset = 0) {
    const curImgAn = this.createAnimation(
      this.curIdx,
      this.getTranslateXByIdx(this.curIdx, 'cur', offset),
      this.getTranslateXByIdx(this.curIdx, toPos)
    );

    const candidateIdx = toPos === 'pre' ? this.nextIdx : this.preIdx;
    const candidateStartPos = toPos === 'pre' ? 'next' : 'pre';

    const candidateImgAn = this.createAnimation(
      candidateIdx,
      this.getTranslateXByIdx(candidateIdx, candidateStartPos, offset),
      this.getTranslateXByIdx(candidateIdx, 'cur')
    );

    this.timeline = new Timeline();
    this.timeline.add(curImgAn).add(candidateImgAn).start();

    this.curIdx = candidateIdx;
  }

  /** @private */
  createAnimation(idx, start, end) {
    return new Animation({
      object: this.imgs[idx].style,
      property: 'transform',
      start,
      end,
      duration: this.duration,
      template: (v) => `translateX(${v}px)`,
      timingFunction: timingFunction.ease,
    });
  }

  /** @private */
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
    return this.imgs;
  }

  /** @private */
  initDrag() {
    this.root.addEventListener('mousedown', (event) => {
      const { clientX: startX, target } = event;

      this.pause();

      const initOffset = this.resetCarouseByTarget(target);

      let offset = initOffset;
      const move = ({ clientX: endX }) => {
        offset = endX - startX + initOffset;
        this.shiftCarouselImgs(offset);
      };

      const up = ({ clientX: endX }) => {
        const diff = endX - startX;
        const threshold = this.width / 6;

        if (diff > threshold) {
          this.prev(offset);
        } else if (diff < -threshold) {
          this.next(offset);
        } else {
          this.shiftCarouselImgs();
        }

        removeEvent();
        this.play();
      };

      const removeEvent = () => {
        document.removeEventListener('mouseup', up);
        document.removeEventListener('mousemove', move);
      };

      document.addEventListener('mouseup', up);
      document.addEventListener('mousemove', move);
    });
  }

  /** @private */
  resetCarouseByTarget(target) {
    this.curIdx = Number(target.parentElement.dataset.index);

    const offset =
      this.getClientRectsLeft(target) - this.getClientRectsLeft(this.root);

    this.shiftCarouselImgs(offset);

    return offset;
  }

  /** @private */
  getClientRectsLeft(target) {
    return target.getClientRects()?.['0']?.left || 0;
  }

  /**
   * @private
   * @type {(idx: number, pos: 'pre' | 'cur' | 'next', offset?: number) => number}
   */
  getTranslateXByIdx(idx, pos, offset = 0) {
    return this.getOriginXByIdx(idx) + this.getRelativeXOffsets()[pos] + offset;
  }

  /** @private */
  shiftCarouselImgs(offset = 0) {
    const { pre, cur, next } = this.getRelativeXOffsets();

    this.setImgRelativePos(this.preIdx, offset + pre);
    this.setImgRelativePos(this.curIdx, offset + cur);
    this.setImgRelativePos(this.nextIdx, offset + next);
  }

  /** @private */
  setImgRelativePos(idx, offsetX) {
    const el = this.imgs[idx];
    el.style.transform = `translateX(${this.getOriginXByIdx(idx) + offsetX}px)`;
  }

  /** @private */
  getOriginXByIdx(idx) {
    return -1 * this.width * idx;
  }

  /** @private */
  getRelativeXOffsets() {
    return {
      pre: -this.width,
      cur: 0,
      next: this.width,
    };
  }
}
