const enum PromiseState {
  PENDING = 'PENDING',
  FULFILLED = 'FULFILLED',
  REJECTED = 'REJECTED',
}

/**
 * standard: https://promisesaplus.com/
 * tests: https://github.com/promises-aplus/promises-tests
 */
class MyPromise {
  #state = PromiseState.PENDING;
  #result;
  #handlers: {
    reject: (reason: any) => any;
    resolve: (value: any) => any;
    onRejected: (reason: any) => any;
    onFulfilled: (value: any) => any;
  }[] = [];

  constructor(executor) {
    const resolve = (data) => {
      this.#changeState(PromiseState.FULFILLED, data);
    };

    const reject = (reason) => {
      this.#changeState(PromiseState.REJECTED, reason);
    };

    try {
      executor(resolve, reject);
    } catch (err) {
      reject(err);
    }
  }

  then(onFulfilled, onRejected?) {
    return new MyPromise((resolve, reject) => {
      this.#handlers.push({ onFulfilled, onRejected, resolve, reject });
      this.#runMicrotask(() => this.#run());
    });
  }

  #run() {
    if (this.#state === PromiseState.PENDING) return;

    while (this.#handlers.length) {
      const { onFulfilled, onRejected, resolve, reject } =
        this.#handlers.shift()!;

      if (this.#state === PromiseState.FULFILLED) {
        this.#runOne(onFulfilled, resolve, reject);
      } else {
        this.#runOne(onRejected, resolve, reject);
      }
    }
  }

  #runOne(callback, resolve, reject) {
    const settled = this.#state === PromiseState.FULFILLED ? resolve : reject;

    if (typeof callback === 'function') {
      try {
        const data = callback(this.#result);

        if (isPromiseLike(data)) {
          data.then(resolve, reject);
        } else {
          settled(data);
        }
      } catch (err) {
        reject(err);
      }
    } else {
      settled(this.#result);
    }
  }

  #changeState(state: PromiseState, result: any) {
    if (this.#state !== PromiseState.PENDING) return;

    this.#state = state;
    this.#result = result;
    this.#run();
  }

  #runMicrotask(callback) {
    // node environment
    if (typeof process?.nextTick === 'function') {
      process.nextTick(callback);
    }
    // browser environment
    else if (typeof MutationObserver === 'function') {
      const observer = new MutationObserver(callback);
      const textNode = document.createTextNode('');

      observer.observe(textNode, { characterData: true });
      textNode.data = 'a';
    } else {
      setTimeout(callback, 0);
    }
  }
}

/**
 * https://promisesaplus.com/#terminology
 */
function isPromiseLike(value) {
  return typeof value === 'function' && typeof value.then === 'function';
}
