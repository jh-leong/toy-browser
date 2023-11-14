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
import { Timeline, ColorAnimation } from './plugin/animation.js';

const duration = 1500;
const bg = [
  { r: 141, g: 132, b: 231, a: 1 },
  { r: 222, g: 231, b: 132, a: 0.8 },
  { r: 231, g: 132, b: 222, a: 0.8 },
  { r: 132, g: 231, b: 222, a: 0.8 },
  { r: 132, g: 222, b: 231, a: 0.8 },
  { r: 132, g: 231, b: 132, a: 0.8 },
  { r: 231, g: 132, b: 132, a: 0.8 },
  { r: 132, g: 132, b: 231, a: 0.8 },
  { r: 222, g: 132, b: 231, a: 0.8 },
  { r: 132, g: 222, b: 132, a: 0.8 },
  { r: 132, g: 231, b: 222, a: 0.8 },
  { r: 132, g: 231, b: 132, a: 0.8 },
  { r: 132, g: 132, b: 231, a: 0.8 },
  { r: 222, g: 132, b: 132, a: 0.8 },
  { r: 132, g: 222, b: 231, a: 0.8 },
  { r: 132, g: 231, b: 132, a: 0.8 },
  { r: 132, g: 132, b: 231, a: 0.8 },
];

const createBgAnimation = (start, end) =>
  new ColorAnimation({
    object: container.style,
    end,
    start,
    duration,
    property: 'background',
    timingFunction: timingFunction.ease,
  });

const advance = (i) => (i %= bg.length);

const fire = (i = 0) => {
  new Timeline()
    .add(createBgAnimation(bg[advance(i)], bg[advance(++i)]))
    .start();
  setTimeout(() => fire(i), duration);
};
fire();
