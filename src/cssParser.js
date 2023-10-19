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
      const sp = specificity(rule.selectors[0]);
      const computedStyle = element.computedStyle;

      for (const { property, value } of rule.declarations) {
        let propertyValue = computedStyle[property];
        if (!propertyValue) propertyValue = computedStyle[property] = {};

        if (
          !propertyValue.specificity ||
          compare(propertyValue.specificity, sp) < 0
        ) {
          propertyValue.value = value;
          propertyValue.specificity = sp;
        }
      }
    }
  }
}

function compare(sp1, sp2) {
  if (sp1[0] - sp2[0]) {
    return sp1[0] - sp2[0];
  }
  if (sp1[1] - sp2[1]) {
    return sp1[1] - sp2[1];
  }
  if (sp1[2] - sp2[2]) {
    return sp1[2] - sp2[2];
  }
  return sp1[3] - sp2[3];
}

function specificity(selector) {
  const p = [0, 0, 0, 0];
  const selectorParts = selector.split(' ');

  for (const part of selectorParts) {
    if (part.charAt(0) == '#') {
      p[1] += 1;
    } else if (part.charAt(0) == '.') {
      p[2] += 1;
    } else {
      p[3] += 1;
    }
  }
  return p;
}

function getElementAttr(el, name) {
  return el.attributes.filter((attr) => attr.name === name)?.[0];
}

/**
 * 只判断了简单选择器, id class tagName
 */
function match(el, selector) {
  if (!selector || !el.attributes) {
    return false;
  }

  if (selector.charAt(0) == '#') {
    const attr = getElementAttr(el, 'id');

    if (attr?.value === selector.replace('#', '')) {
      return true;
    }
  } else if (selector.charAt(0) == '.') {
    const attr = getElementAttr(el, 'class');

    if (attr?.value === selector.replace('.', '')) {
      return true;
    }
  } else {
    if (el.tagName === selector) {
      return true;
    }
  }
  return false;
}
