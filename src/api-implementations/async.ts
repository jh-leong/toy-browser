function myAsync(generator) {
  return new Promise((resolve, reject) => {
    const gen = generator();
    handler(undefined);

    function handler(v) {
      try {
        const { value, done } = gen.next(v);

        if (value instanceof Promise) {
          value
            .then((res) => {
              handler(res);
            })
            .catch((err) => {
              gen.throw(err);
              reject(err);
            });
        } else {
          if (done) {
            resolve(value);
          } else {
            handler(value);
          }
        }
      } catch (err) {
        gen.throw(err);
        reject(err);
      }
    }
  });
}

myAsync(function* () {
  const foo = yield new Promise((resolve) => setTimeout(() => resolve(1)));
  console.warn('🚀\n ~ file: async.ts:36 ~ myAsync ~ foo:', foo);
  const bar = yield new Promise((resolve) => setTimeout(() => resolve(2)));
  console.warn('🚀\n ~ file: async.ts:38 ~ myAsync ~ bar:', bar);
  return 'done';
}).then(console.log);
