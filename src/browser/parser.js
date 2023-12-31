// @ts-nocheck
import { computeCSS, addCSSRules } from './cssParser.js';
import { layout } from './layout.js';

let currentToken = null;
let currentTextNode = null;
let currentAttribute = null;

/**
 * EOF: End Of File
 */
const EOF = Symbol('EOF');

const AlphaRegex = /^[a-zA-Z]$/;
const isAlpha = (c) => AlphaRegex.test(c);

/**
 * tabulation or line feed or form feed or space
 */
const WhitespaceRegex = /^[\t\n\f\s]$/;
const isWhitespace = (c) => WhitespaceRegex.test(c);

/**
 * @link https://html.spec.whatwg.org/multipage/parsing.html#data-state
 */
function data(c) {
  if (c == '<') {
    return tagOpen;
  } else if (c === EOF) {
    emit({ type: 'EOF' });
    return;
  } else {
    emit({
      type: 'text',
      content: c,
    });
    return data;
  }
}

function tagOpen(c) {
  if (c == '/') {
    return endTagOpen;
  } else if (isAlpha(c)) {
    currentToken = {
      type: 'startTag',
      tagName: '',
    };
    return tagName(c);
  } else {
    emit({
      type: 'text',
      content: c,
    });
    return;
  }
}

function endTagOpen(c) {
  if (isAlpha(c)) {
    currentToken = {
      type: 'endTag',
      tagName: '',
    };
    return tagName(c);
  } else if (c == '>') {
  } else if (c == EOF) {
  } else {
  }
}

/**
 * @link https://html.spec.whatwg.org/multipage/parsing.html#tag-name-state
 */
function tagName(c) {
  if (isWhitespace(c)) {
    return beforeAttributeName;
  } else if (c == '/') {
    return selfClosingStartTag;
  } else if (isAlpha(c)) {
    currentToken.tagName += c;
    return tagName;
  } else if (c == '>') {
    emit(currentToken);
    return data;
  } else {
    return tagName;
  }
}

function beforeAttributeName(c) {
  if (isWhitespace(c)) {
    return beforeAttributeName;
  } else if (c == '>' || c == '/' || c == EOF) {
    return afterAttributeName(c);
  } else if (c == '=') {
    // return beforeAttributeName;
  } else {
    currentAttribute = {
      name: '',
      value: '',
    };
    return attributeName(c);
  }
}

function attributeName(c) {
  if (isWhitespace(c) || c == '/' || c == '>' || c == EOF) {
    return afterAttributeName(c);
  } else if (c == '=') {
    return beforeAttributeValue;
  } else if (c == '\u0000') {
    // todo
  } else if (c == '"' || c == "'" || c == '<') {
    // todo
  } else {
    currentAttribute.name += c;
    return attributeName;
  }
}

function beforeAttributeValue(c) {
  if (isWhitespace(c) || c == '/' || c == '>' || c == EOF) {
    return beforeAttributeValue;
  } else if (c == '"') {
    return doubleQuotedAttributeValue;
  } else if (c == "'") {
    return singleQuotedAttributeValue;
  } else if (c == '>') {
    // todo
  } else {
    return unquotedAttributeValue(c);
  }
}

function doubleQuotedAttributeValue(c) {
  if (c == '"') {
    currentToken[currentAttribute.name] = currentAttribute.value;
    return afterQuotedAttributeValue;
  } else if (c == '\u0000') {
  } else if (c == EOF) {
  } else {
    currentAttribute.value += c;
    return doubleQuotedAttributeValue;
  }
}

function singleQuotedAttributeValue(c) {
  if (c == "'") {
    currentToken[currentAttribute.name] = currentAttribute.value;
    return afterQuotedAttributeValue;
  } else if (c == '\u0000') {
  } else if (c == EOF) {
  } else {
    currentAttribute.value += c;
    return singleQuotedAttributeValue;
  }
}

function afterQuotedAttributeValue(c) {
  if (isWhitespace(c)) {
    return beforeAttributeName;
  } else if (c == '/') {
    return selfClosingStartTag;
  } else if (c == '>') {
    currentToken[currentAttribute.name] = currentAttribute.value;
    emit(currentToken);
    return data;
  } else if (c == EOF) {
  } else {
    currentAttribute.value += c;
    return doubleQuotedAttributeValue;
  }
}

function unquotedAttributeValue(c) {
  if (isWhitespace(c)) {
    currentToken[currentAttribute.name] = currentAttribute.value;
    return beforeAttributeName;
  } else if (c == '/') {
    currentToken[currentAttribute.name] = currentAttribute.value;
    return selfClosingStartTag;
  } else if (c == '>') {
    currentToken[currentAttribute.name] = currentAttribute.value;
    emit(currentToken);
    return data;
  } else if (c == '\u0000') {
  } else if (c == '"' || c == "'" || c == '<' || c == '=' || c == '`') {
  } else if (c == EOF) {
  } else {
    currentAttribute.value += c;
    return unquotedAttributeValue;
  }
}

function afterAttributeName(c) {
  if (isWhitespace(c)) {
    return afterAttributeName;
  } else if (c == '/') {
    return selfClosingStartTag;
  } else if (c == '=') {
    return beforeAttributeValue;
  } else if (c == '>') {
    currentToken[currentAttribute.name] = currentAttribute.value;
    emit(currentToken);
    return data;
  } else if (c == EOF) {
  } else {
    currentToken[currentAttribute.name] = currentToken.value;
    currentAttribute = {
      name: '',
      value: '',
    };
    return attributeName(c);
  }
}

function selfClosingStartTag(c) {
  if (c == '>') {
    currentToken.isSelfClosing = true;
    emit(currentToken);
    return data;
  } else if (c == 'EOF') {
    return;
  } else {
    //
  }
}

// in script
function scriptData(c) {
  if (c == '<') {
    return scriptDataLessThanSign;
  } else {
    emit({ type: 'text', content: c });
    return scriptData;
  }
}

// in script received '<'
function scriptDataLessThanSign(c) {
  if (c == '/') {
    return scriptDataEndTagOpen;
  } else {
    emit({ type: 'text', content: '<' });
    emit({ type: 'text', content: c });
    return scriptData;
  }
}

// in script received '</'
function scriptDataEndTagOpen(c) {
  if (c == 's') {
    return scriptDataEndTagNameS;
  } else {
    emit({ type: 'text', content: '</' });
    emit({ type: 'text', content: c });
    return scriptData;
  }
}

// in script received '</s'
function scriptDataEndTagNameS(c) {
  if (c == 'c') {
    return scriptDataEndTagNameC;
  } else {
    emit({ type: 'text', content: '</s' });
    emit({ type: 'text', content: c });
    return scriptData;
  }
}

// in script received '</sc'
function scriptDataEndTagNameC(c) {
  if (c == 'r') {
    return scriptDataEndTagNameR;
  } else {
    emit({ type: 'text', content: '</sc' });
    emit({ type: 'text', content: c });
    return scriptData;
  }
}

// in script received '</scr'
function scriptDataEndTagNameR(c) {
  if (c == 'i') {
    return scriptDataEndTagNameI;
  } else {
    emit({ type: 'text', content: '</scr' });
    emit({ type: 'text', content: c });
    return scriptData;
  }
}

// in script received '</scri'
function scriptDataEndTagNameI(c) {
  if (c == 'p') {
    return scriptDataEndTagNameP;
  } else {
    emit({ type: 'text', content: '</scri' });
    emit({ type: 'text', content: c });
    return scriptData;
  }
}

// in script received '</scrip'
function scriptDataEndTagNameP(c) {
  if (c == 't') {
    return scriptDataEndTag;
  } else {
    emit({ type: 'text', content: '</scrip' });
    emit({ type: 'text', content: c });
    return scriptData;
  }
}

// in script received '</script'
function scriptDataEndTag(c) {
  if (c == ' ') {
    return scriptDataEndTag;
  } else if (c == '>') {
    emit({ type: 'endTag', tagName: 'script' });
    return data;
  } else {
    emit({ type: 'text', content: '</script' });
    emit({ type: 'text', content: c });
    return scriptData;
  }
}

const stack = [{ type: 'document', children: [] }];

export function getCurrentElementParents() {
  return stack.slice().reverse();
}

/**
 * @link https://html.spec.whatwg.org/multipage/parsing.html#tree-construction
 */
function emit(token) {
  // console.log('token', token);

  const top = stack[stack.length - 1];

  if (token.type == 'startTag') {
    const element = {
      type: 'element',
      children: [],
      attributes: [],
      tagName: token.tagName,
    };

    for (const p in token) {
      if (p != 'type' && p != 'tagName') {
        element.attributes.push({
          name: p,
          value: token[p],
        });
      }
    }

    /**
     * 此时理论情况下，CSS 规则已经加载完毕 (一般 style 标签会在 body 之前)
     *
     * 每创建一个元素, 就计算一次 CSS, 因为父元素的 CSS 可能会影响子元素
     *
     * 假如后续新增了 CSS 规则 (比如 body 内出现 style 标签), 则会触发重排&重绘
     */
    computeCSS(element);

    top.children.push(element);
    // element.parent = top;

    if (!token.isSelfClosing) stack.push(element);

    currentTextNode = null;
  } else if (token.type == 'endTag') {
    if (top.tagName != token.tagName) {
      throw new Error("Tag start end doesn't match!");
    } else {
      if (top.tagName === 'style') {
        addCSSRules(top.children[0].content);
      }

      /**
       * 在 'endTag' 阶段处理布局, 此时已获取元素的所有子元素
       */
      layout(top);
      stack.pop();
    }
    currentTextNode = null;
  } else if (token.type == 'text') {
    if (currentTextNode == null) {
      currentTextNode = {
        type: 'text',
        content: '',
      };

      top.children.push(currentTextNode);
    }

    currentTextNode.content += token.content;
  }
}

/**
 * @method parseHTML - according the living standard
 *
 * @link https://html.spec.whatwg.org/multipage/parsing.html
 */
export function parseHTML(html) {
  let state = data;

  for (let c of html) {
    state = state(c);

    if (stack[stack.length - 1].tagName === 'script' && state === data) {
      state = scriptData;
    }
  }

  // 手动传入 EOF, 模拟传输结束
  state = state(EOF);

  // console.warn('🚀\n ~ file: parser.js:296 ~ stack[0];:', stack[0]);

  return stack[0];
}
