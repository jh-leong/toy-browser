import css from 'css';

export default function (source) {
  // @ts-ignore
  const fileName = this.resourcePath.match(/([^/]+).css$/)[1].toLowerCase();

  const stylesheet = css.parse(source);

  for (const rule of stylesheet.stylesheet.rules) {
    rule.selectors = rule.selectors.map((s) => {
      return s.match(new RegExp(`^.${fileName}`)) ? s : `.${fileName} ${s}`;
    });
  }

  const code = JSON.stringify(css.stringify(stylesheet));

  console.log('code', code);

  return `
  const style = document.createElement('style');
  style.innerHTML = ${code};
  document.head.appendChild(style);
`;
}
