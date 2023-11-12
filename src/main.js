const imgs = [
  'https://static001.geekbang.org/resource/image/bb/21/bb38fb7c1073eaee1755f81131f11d21.jpg',
  'https://static001.geekbang.org/resource/image/1b/21/1b809d9a2bdf3ecc481322d7c9223c21.jpg',
  'https://static001.geekbang.org/resource/image/b6/4f/b6d65b2f12646a9fd6b8cb2b020d754f.jpg',
  'https://static001.geekbang.org/resource/image/73/e4/730ea9c393def7975deceb48b3eb6fe4.jpg',
];

/** @type {HTMLElement} */
// @ts-ignore
const container = document.getElementById('app');

/**
 * 1. vanilla
 */
// import { Carousel } from './Carousel-vanilla.js';
// new Carousel().init(imgs).mount('app');

/**
 * 2. jsx
 */
import { create, Text, Element } from './plugin/cus-jsx.js';
import { Carousel } from './component/Carousel.jsx';
const carousel = <Carousel data={imgs}></Carousel>;
carousel.mountTo(container);

/**
 * 3. sfc
 */
// import { create, Text, Element } from './plugin/cus-jsx.js';
// // @ts-ignore
// import { Carousel } from './component/Carousel.sfc';
// const carousel = <Carousel data={imgs}></Carousel>;
// carousel.mountTo(container);

import { timingFunction } from './plugin/cubicBezier.js';
import { Timeline, Animation, ColorAnimation } from './plugin/animation.js';

const an = new Animation({
  object: container.style,
  start: 0,
  end: 200,
  duration: 5000,
  property: 'transform',
  template: (v) => `translateX(${v}px)`,
  timingFunction: timingFunction.linear,
});

const an2 = new ColorAnimation({
  object: container.style,
  start: { r: 0, g: 0, b: 0, a: 1 },
  end: { r: 122, g: 200, b: 122, a: 1 },
  duration: 5000,
  property: 'background',
  timingFunction: timingFunction.linear,
});

new Timeline().add(an).add(an2).start();
