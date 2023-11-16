interface GestureContext {
  isTap: boolean;
  isPan: boolean;
  isPress: boolean;
  startX: number;
  startY: number;
  moveStart: number;
}

type CarouselPos = 'prePre' | 'pre' | 'cur' | 'next' | 'nextNext';
