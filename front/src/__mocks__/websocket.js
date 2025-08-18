class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  constructor(url, protocols) {
    this.readyState = MockWebSocket.CONNECTING;
    this.url = url;
    this.protocol = '';
    this.extensions = '';
    this.bufferedAmount = 0;
    this.binaryType = 'blob';
    
    this.onopen = null;
    this.onclose = null;
    this.onmessage = null;
    this.onerror = null;

    // Simulate connection opening asynchronously
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 0);
  }

  send(data) {
    if (this.readyState !== MockWebSocket.OPEN) {
      throw new Error('WebSocket is not open');
    }
  }

  close(code, reason) {
    this.readyState = MockWebSocket.CLOSING;
    setTimeout(() => {
      this.readyState = MockWebSocket.CLOSED;
      if (this.onclose) {
        this.onclose(new CloseEvent('close', { code, reason }));
      }
    }, 0);
  }

  addEventListener(type, listener) {
    switch (type) {
      case 'open':
        this.onopen = listener;
        break;
      case 'close':
        this.onclose = listener;
        break;
      case 'message':
        this.onmessage = listener;
        break;
      case 'error':
        this.onerror = listener;
        break;
    }
  }

  removeEventListener(type, listener) {
    switch (type) {
      case 'open':
        this.onopen = null;
        break;
      case 'close':
        this.onclose = null;
        break;
      case 'message':
        this.onmessage = null;
        break;
      case 'error':
        this.onerror = null;
        break;
    }
  }

  dispatchEvent(event) {
    return true;
  }

  // Helper method to simulate receiving messages
  simulateMessage(data) {
    if (this.readyState === MockWebSocket.OPEN && this.onmessage) {
      const event = new MessageEvent('message', {
        data: typeof data === 'string' ? data : JSON.stringify(data)
      });
      this.onmessage(event);
    }
  }

  // Helper method to simulate errors
  simulateError() {
    if (this.onerror) {
      this.onerror(new Event('error'));
    }
  }
}

// Export for CommonJS
module.exports = { MockWebSocket };