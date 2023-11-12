import { parseHTML } from '../browser/parser.js';

export default function (source) {
  const { children: tree } = parseHTML(source);

  let script = null;
  let template = null;

  for (const node of tree) {
    const { tagName, children = [] } = node;

    if (tagName === 'script') {
      script = children[0]?.content;
    } else if (tagName === 'template') {
      // @ts-ignore
      template = node.children.filter((e) => e.type !== 'text').pop();
    }
  }

  const codegen = (node) => {
    const { type, tagName, children = [], attributes = {}, content } = node;

    if (type === 'text') {
      return JSON.stringify(content);
    }

    const attrs = {};
    for (const name of attributes) {
      attrs[name] = attributes[name];
    }

    const childrenCode = children.map((child) => codegen(child));

    const code = `create('${tagName}', ${JSON.stringify(
      attrs
    )}, ${childrenCode})`;

    return code;
  };

  // @ts-ignore
  const fileName = this.resourcePath.match(/([^/]+).sfc$/)[1];

  const code = `
import { create, Text, Element, Component } from '../plugin/cus-jsx.js';

export class ${fileName} extends Component {
  render() {
    return ${codegen(template)}
  }
}
`;

  console.warn('🚀\n ~ file: SFCLoader.js:49 ~ code:', code);

  return code;
}
