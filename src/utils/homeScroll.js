let scrollHomeHandler = null;

export function registerScrollHomeHandler(handler) {
  scrollHomeHandler = handler;
  return () => {
    if (scrollHomeHandler === handler) {
      scrollHomeHandler = null;
    }
  };
}

export function scrollHomeToTop() {
  scrollHomeHandler?.();
}
