import { parseHTML } from '../browser/parser.js';

export default function (source) {
  const content = parseHTML(source);

  console.warn('🚀\n ~ file: SFCLoader.js:6 ~ content:', content);
  return '';
}
