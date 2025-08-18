// Mock axios module that works with axios-mock-adapter by delegating to defaults.adapter

function createInterceptors() {
  const handlers = [];
  return {
    handlers,
    use: (fulfilled, rejected) => {
      handlers.push({ fulfilled, rejected });
    }
  };
}

function applyInterceptors(handlers, initial, isResponse) {
  return handlers.reduce((promise, { fulfilled, rejected }) => {
    return promise.then(
      (val) => (fulfilled ? fulfilled(val) : val),
      (err) => (rejected ? rejected(err) : Promise.reject(err))
    );
  }, Promise.resolve(initial));
}

function createInstance() {
  const instance = {
    interceptors: {
      request: createInterceptors(),
      response: createInterceptors(),
    },
    defaults: {
      adapter: (config) => Promise.resolve({ status: 200, data: {}, headers: {}, config, statusText: 'OK' }),
    },
    request(config) {
      if (!config.headers) config.headers = {};
      // Apply request interceptors
      return applyInterceptors(this.interceptors.request.handlers, config, false)
        .then((finalConfig) => this.defaults.adapter(finalConfig))
        .then((response) => applyInterceptors(this.interceptors.response.handlers, response, true));
    },
    get(url, config = {}) { return this.request({ ...config, method: 'get', url }); },
    delete(url, config = {}) { return this.request({ ...config, method: 'delete', url }); },
    head(url, config = {}) { return this.request({ ...config, method: 'head', url }); },
    options(url, config = {}) { return this.request({ ...config, method: 'options', url }); },
    post(url, data, config = {}) { return this.request({ ...config, method: 'post', url, data }); },
    put(url, data, config = {}) { return this.request({ ...config, method: 'put', url, data }); },
    patch(url, data, config = {}) { return this.request({ ...config, method: 'patch', url, data }); },
  };
  return instance;
}

const rootInstance = createInstance();

const axios = Object.assign(rootInstance, {
  create: jest.fn(() => createInstance()),
});

axios._mockAxiosInstance = rootInstance;

module.exports = axios;