import { parseHTML } from '../browser/parser.js';

export default function (source) {
  const tree = parseHTML(source);

  console.warn('🚀\n ~ file: SFCLoader.js:6 ~ content:', tree.children[2]);
  return '';
}
