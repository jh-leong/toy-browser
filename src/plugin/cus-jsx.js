export function create(cls, attributes, ...children) {
  const vnode = typeof cls === 'string' ? new Element(cls) : new cls();

  for (const name in attributes) {
    vnode.setAttribute(name, attributes[name]);
  }

  const visit = (children) => {
    for (const child of children) {
      if (child instanceof Array) {
        visit(child);
        continue;
      }

      if (typeof child === 'string') {
        child = new Text(child);
      }

      vnode.appendChild(child);
    }
  };

  visit(children);

  return vnode;
}

export class Text {
  constructor(text) {
    this.children = [];
    this.root = document.createTextNode(text);
  }

  mountTo(parent) {
    parent.appendChild(this.root);
  }
}

export class Element {
  constructor(type) {
    this.children = [];
    this.root = document.createElement(type);
  }

  get style() {
    return this.root.style;
  }

  get clientWidth() {
    return this.root.clientWidth;
  }

  setAttribute(name, value) {
    this.root.setAttribute(name, value);

    if (name.match(/^on([\s\S]+)$/)) {
      const eventName = RegExp.$1.replace(/^[\s\S]/, (s) => s.toLowerCase());
      this.addEventListener(eventName, value);
    }

    if (name === 'enableGesture') {
      enableGesture(this.root);
    }
  }

  appendChild(child) {
    this.children.push(child);
  }

  addEventListener() {
    this.root.addEventListener(...arguments);
  }

  mountTo(parent) {
    parent.appendChild(this.root);

    for (const child of this.children) {
      child.mountTo(this.root);
    }
  }
}

export class Component {
  constructor() {
    this.children = [];
    this.attributes = new Map();
    this.properties = new Map();
  }

  setAttribute(name, value) {
    this[name] = value;
  }

  appendChild(child) {
    this.children.push(child);
  }

  mountTo(parent) {
    this.render().mountTo(parent);
  }
}
