import { create, Text, Element, Component } from '../plugin/cus-jsx';
import { Animation, Timeline } from '../plugin/animation';
import { timingFunction } from '../plugin/cubicBezier';
import { enableGesture } from '../plugin/gesture';

/**
 * @typedef {'prePre' | 'pre' | 'cur' | 'next' | 'nextNext'} Pos
 */

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

    enableGesture(this.root);

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
    this.playTimer = setTimeout(() => {
      this.next();
      this.play();
    }, this.duration);
  }

  pause() {
    if (this.timeline) this.timeline.pause();
    clearTimeout(this.playTimer);
  }

  resume() {
    if (this.timeline) this.timeline.resume();
    this.play();
  }

  stop() {
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

    const preImgAn = this.createAnimation(
      this.preIdx,
      this.getTranslateXByIdx(this.preIdx, 'pre', offset),
      this.getTranslateXByIdx(this.preIdx, toPos === 'pre' ? 'prePre' : 'cur')
    );

    const nextImgAn = this.createAnimation(
      this.nextIdx,
      this.getTranslateXByIdx(this.nextIdx, 'next', offset),
      this.getTranslateXByIdx(
        this.nextIdx,
        toPos === 'pre' ? 'cur' : 'nextNext'
      )
    );

    this.timeline = new Timeline();

    // Each carousel transition needs to move the viewport and its three surrounding images, not just two.
    // This prevents issues where the previous/next images do not reset properly 
    // if a drag event is triggered during the transition 
    // and the drag direction is inconsistent with the transition direction.
    this.timeline.add(curImgAn).add(preImgAn).add(nextImgAn).start();

    this.curIdx = toPos === 'pre' ? this.nextIdx : this.preIdx;
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
      const img = <img src={url} onDragstart={(e) => e.preventDefault()} />;

      const imgContainer = (
        <div class="img-container" data-index={i}>
          {img}
        </div>
      );

      return imgContainer;
    });
    return this.imgs;
  }

  /** @private */
  initDrag() {
    let offset = 0;
    let initOffset = 0;

    const onDragStart = (e) => {
      this.stop();
      offset = initOffset = this.resetCarouseByTarget(e.detail.point.target);
    };

    const onDrag = (e) => {
      const { clientX: endX, startX } = e.detail;
      offset = endX - startX + initOffset;
      this.shiftCarouselImgs(offset);
    };

    const onDragEnd = (e) => {
      const { clientX: endX, startX } = e.detail;

      const diff = endX - startX;
      const threshold = 20;

      if (diff > threshold) {
        this.prev(offset);
      } else if (diff < -threshold) {
        this.next(offset);
      } else {
        this.shiftCarouselImgs();
      }

      this.play();
    };

    this.root.addEventListener('start', () => this.pause());
    this.root.addEventListener('panStart', onDragStart);
    this.root.addEventListener('pan', onDrag);
    this.root.addEventListener('end', (e) => {
      e.detail.context.isPan ? onDragEnd(e) : this.resume();
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
   * @type {(idx: number, pos: Pos, offset?: number) => number}
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
      prePre: -2 * this.width,
      pre: -this.width,
      cur: 0,
      next: this.width,
      nextNext: 2 * this.width,
    };
  }
}
