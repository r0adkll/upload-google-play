window.module = {
  exports: {},
};

const hack = new Proxy({}, {
  get() {
    return [];
  },
});
window.require = () => ({'encoding-indexes': hack});
