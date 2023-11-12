function getStyle(element) {
  if (!element.style) element.style = {};

  for (let prop in element.computedStyle) {
    const value = (element.style[prop] = element.computedStyle[prop].value);

    if ([/^[0-9\.]+$/, /px$/].some((i) => i.test(value.toString()))) {
      element.style[prop] = parseInt(value);
    }
  }

  return element.style;
}

export function layout(element) {
  if (!element.computedStyle) return;

  const elementStyle = getStyle(element);

  // 目前只处理 flex 布局
  if (elementStyle.display !== 'flex') return;

  const items = element.children.filter((e) => e.type === 'element');

  items.sort(({ order: order1 = 0 }, { order: order2 = 0 }) => order1 - order2);

  const style = elementStyle;

  ['width', 'height'].forEach((size) => {
    if (style[size] === 'auto' || style[size] === '') {
      style[size] = null;
    }
  });

  // 添加 flex 相关属性的默认值
  if (!style.flexDirection || style.flexDirection === 'auto')
    style.flexDirection = 'row';

  if (!style.alignItems || style.alignItems === 'auto')
    style.alignItems = 'stretch';

  if (!style.justifyContent || style.justifyContent === 'auto')
    style.justifyContent = 'flex-start';

  if (!style.flexWrap || style.flexWrap === 'auto') style.flexWrap = 'nowrap';

  if (!style.alignContent || style.alignContent === 'auto')
    style.alignContent = 'stretch';

  let mainSize;
  let mainStart;
  let mainEnd;
  let mainSign;
  /**
   * 元素排列方向的起点位置
   */
  let mainBase;
  let crossSize;
  let crossStart;
  let crossEnd;
  let crossSign;
  let crossBase;

  if (style.flexDirection === 'row') {
    mainSize = 'width';
    mainStart = 'left';
    mainEnd = 'right';
    mainSign = +1;
    mainBase = 0;

    crossSize = 'height';
    crossStart = 'top';
    crossEnd = 'bottom';
  }
  if (style.flexDirection === 'row-reverse') {
    mainSize = 'width';
    mainStart = 'right';
    mainEnd = 'left';
    mainSign = -1;
    mainBase = style.width;

    crossSize = 'height';
    crossStart = 'top';
    crossEnd = 'bottom';
  }
  if (style.flexDirection === 'column') {
    mainSize = 'height';
    mainStart = 'top';
    mainEnd = 'bottom';
    mainSign = +1;
    mainBase = 0;

    crossSize = 'width';
    crossStart = 'left';
    crossEnd = 'right';
  }
  if (style.flexDirection === 'column-reverse') {
    mainSize = 'height';
    mainStart = 'bottom';
    mainEnd = 'top';
    mainSign = -1;
    mainBase = style.height;

    crossSize = 'width';
    crossStart = 'left';
    crossEnd = 'right';
  }

  if (style.flexWrap === 'wrap-reverse') {
    const tmp = crossStart;
    crossStart = crossEnd;
    crossEnd = tmp;
    crossSign = -1;
  } else {
    crossBase = 0;
    crossSign = 1;
  }

  const isAutoMainSize = false;
  if (!style[mainSize]) {
    elementStyle[mainSize] = items.reduce(
      (acc, item) => acc + (getStyle(item)[mainSize] || 0),
      0
    );
    isAutoMainSize = true;
  }

  const flexLine = [];
  const flexLines = [flexLine];

  let mainSpace = elementStyle[mainSize];
  let crossSpace = 0;

  items.forEach((item) => {
    const itemStyle = getStyle(item);

    if (itemStyle[mainSize] == null) itemStyle[mainSize] = 0;

    if (itemStyle.flex) {
      flexLine.push(item);
    } else if (style.flexWrap === 'nowrap' && isAutoMainSize) {
      mainSpace -= itemStyle[mainSize];

      if (itemStyle[crossSize] != null)
        crossSpace = Math.max(crossSpace, itemStyle[crossSize]);

      flexLine.push(item);
    } else {
      if (itemStyle[mainSize] > style[mainSize]) {
        itemStyle[mainSize] = style[mainSize];
      }

      if (mainSpace < itemStyle[mainSize]) {
        flexLine.mainSpace = mainSpace;
        flexLine.crossSpace = crossSpace;

        flexLine = [item];
        flexLines.push(flexLine);

        mainSpace = style[mainSize];
        crossSpace = 0;
      } else {
        flexLine.push(item);
      }

      if (itemStyle[crossSize] != null)
        crossSpace = Math.max(crossSpace, itemStyle[crossSize]);

      mainSpace -= itemStyle[mainSize];
    }
  });

  flexLine.mainSpace = mainSpace;

  if (style.flexWrap === 'nowrap' || isAutoMainSize) {
    flexLine.crossSpace =
      style[crossSize] !== undefined ? style[crossSize] : crossSpace;
  } else {
    flexLine.crossSpace = crossSpace;
  }

  if (mainSpace < 0) {
    // overflow (happens only if container is single line), scale every item
    const scale = style[mainSize] / (style[mainSize] - mainSpace);

    let currentMain = mainBase;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const itemStyle = getStyle(item);

      if (itemStyle.flex) {
        itemStyle[mainSize] = 0;
      }

      itemStyle[mainSize] = itemStyle[mainSize] * scale;

      itemStyle[mainStart] = currentMain;
      itemStyle[mainEnd] =
        itemStyle[mainStart] + mainSign * itemStyle[mainSize];

      currentMain = itemStyle[mainEnd];
    }
  } else {
    // process each flex line
    flexLines.forEach((items) => {
      const mainSpace = items.mainSpace;

      let flexTotal = 0;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const itemStyle = getStyle(item);

        if (itemStyle.flex !== null && itemStyle.flex !== void 0) {
          flexTotal += itemStyle.flex;
        }
      }

      if (flexTotal > 0) {
        // There is flexible flex items
        let currentMain = mainBase;

        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          const itemStyle = getStyle(item);

          if (itemStyle.flex) {
            itemStyle[mainSize] = (mainSpace / flexTotal) * itemStyle.flex;
          }

          itemStyle[mainStart] = currentMain;
          itemStyle[mainEnd] =
            itemStyle[mainStart] + mainSign * itemStyle[mainSize];

          currentMain = itemStyle[mainEnd];
        }
      } else {
        let step = 0;
        let currentMain = 0;

        // There is *NO* flexible flex items, which means, justifyContent should work
        if (style.justifyContent === 'flex-start') {
          currentMain = mainBase;
          step = 0;
        } else if (style.justifyContent === 'flex-end') {
          currentMain = mainSpace * mainSign + mainBase;
          step = 0;
        } else if (style.justifyContent === 'center') {
          currentMain = (mainSpace / 2) * mainSign + mainBase;
          step = 0;
        } else if (style.justifyContent === 'space-between') {
          step = (mainSpace / (items.length - 1)) * mainSign;
          currentMain = mainBase;
        } else if (style.justifyContent === 'space-around') {
          step = (mainSpace / items.length) * mainSign;
          currentMain = step / 2 + mainBase;
        }

        for (var i = 0; i < items.length; i++) {
          const item = items[i];
          const itemStyle = getStyle(item);

          itemStyle[(mainStart, currentMain)];
          itemStyle[mainEnd] =
            itemStyle[mainStart] + mainSign * itemStyle[mainSize];
          currentMain = itemStyle[mainEnd] + step;
        }
      }
    });
  }

  if (!style[crossSize]) {
    //auto sizing
    crossSpace = 0;
    elementStyle[crossSize] = 0;
    for (let i = 0; i < flexLines.length; i++) {
      elementStyle[crossSize] =
        elementStyle[crossSize] + flexLines[i].crossSpace;
    }
  } else {
    crossSpace = style[crossSize];
    for (let i = 0; i < flexLines.length; i++) {
      crossSpace -= flexLines[i].crossSpace;
    }
  }

  if (style.flexWrap === 'wrap-reverse') {
    crossBase = style[crossSize];
  } else {
    crossBase = 0;
  }

  // const lineSize = style[crossSize] / flexLines.length;

  let step;
  if (style.alignContent === 'flex-start') {
    crossBase += 0;
    step = 0;
  }
  if (style.alignContent === 'flex-end') {
    crossBase += crossSign * crossSpace;
    step = 0;
  }
  if (style.alignContent === 'center') {
    crossBase += (crossSign * crossSpace) / 2;
    step = 0;
  }
  if (style.alignContent === 'space-between') {
    crossBase += 0;
    step = crossSpace / (flexLines.length - 1);
  }
  if (style.alignContent === 'space-around') {
    step = crossSpace / flexLines.length;
    crossBase += (crossSign * step) / 2;
  }
  if (style.alignContent === 'stretch') {
    crossBase += 0;
    step = 0;
  }

  flexLines.forEach((items) => {
    const lineCrossSize =
      style.alignContent === 'stretch'
        ? items.crossSpace + crossSpace / flexLines.length
        : items.crossSpace;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const itemStyle = getStyle(item);

      const align = itemStyle.alignSelf || style.alignItems;

      if (item === null)
        itemStyle[crossSize] = align === 'stretch' ? lineCrossSize : 0;

      if (align === 'flex-start') {
        itemStyle[crossStart] = crossBase;
        itemStyle[crossEnd] =
          itemStyle[crossStart] + crossSign * itemStyle[crossSize];
      } else if (align === 'flex-end') {
        itemStyle[crossEnd] = crossBase + crossSign * lineCrossSize;
        itemStyle[crossStart] =
          itemStyle[crossEnd] - crossSign * itemStyle[crossSize];
      } else if (align === 'center') {
        itemStyle[crossStart] =
          crossBase + (crossSign * (lineCrossSize - itemStyle[crossSize])) / 2;
        itemStyle[crossEnd] =
          itemStyle[crossStart] + crossSign * itemStyle[crossSize];
      } else if (align === 'stretch') {
        itemStyle[crossStart] = crossBase;
        itemStyle[crossEnd] =
          crossBase +
          crossSign *
            (itemStyle[crossSize] !== null && itemStyle[crossSize] !== void 0
              ? itemStyle[crossSize]
              : lineCrossSize);

        itemStyle[crossSize] =
          crossSign * (itemStyle[crossEnd] - itemStyle[crossStart]);
      }
    }

    crossBase += crossSign * (lineCrossSize + step);
  });
}
