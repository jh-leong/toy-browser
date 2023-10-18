import css from 'css';
import { getCurrentElementParents } from './parser.js';

const rules = [];

export function addCSSRules(text) {
  const ast = css.parse(text);

  rules.push(...ast.stylesheet.rules);
}

export function computeCSS(element) {
  /**
   * 获取元素的所有父元素
   *
   * cuz: 必须知道所有父元素才能判断元素与规则是否匹配 (e.g. div div #foo)
   */
  const parents = getCurrentElementParents();

  if (!element.computedStyle) element.computedStyle = {};

  /**
   * 支持的选择器类型:
   *
   * 1. 复杂选择器: `div div #foo`
   */
  for (const rule of rules) {
    // 内层优先匹配
    const selectorParts = rule.selectors[0].split(' ').reverse();

    if (!match(element, selectorParts[0])) continue;

    // 判断当前元素的父元素, 能否匹配 selector
    let j = 1;
    for (let i = 0; i < parents.length; i++) {
      if (match(parents[i], selectorParts[j])) j++;
    }

    const matched = j >= selectorParts.length;

    if (matched) {
      console.warn(
        '🚀\n ~ file: cssParser.js:42 ~ computeCSS ~ matched:',
        matched
      );
    }
  }
}

function match(element, selector) {
  if (!selector || !element.attributes) {
    return false;
  }
  if (selector.charAt(0) == '#') {
    const attr = element.attributes.filter((attr) => attr.name === 'id')[0];
    if (attr && attr.value === selector.replace('#', '')) {
      return true;
    }
  } else if (selector.charAt(0) == '.') {
    const attr = element.attributes.filter((attr) => attr.name === 'class')[0];
    if (attr && attr.value === selector.replace('.', '')) {
      return true;
    }
  } else {
    if (element.tagName === selector) {
      return true;
    }
  }
  return false;
}
