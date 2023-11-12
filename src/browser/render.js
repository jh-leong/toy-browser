import images from 'images';

export function render(viewport, element) {
  if (element.style) {
    const img = images(element.style.width, element.style.height);

    const { left = 0, top = 0 } = element.style;

    const backgroundColor = element.style['background-color'] || 'rgb(0,0,0)';

    backgroundColor.match(/rgb\((\d+),(\d+),(\d+)\)/);

    img.fill(Number(RegExp.$1), Number(RegExp.$2), Number(RegExp.$3), 1);

    viewport.draw(img, left, top);
  }

  if (element.children) {
    for (const child of element.children) {
      render(viewport, child);
    }
  }
}
