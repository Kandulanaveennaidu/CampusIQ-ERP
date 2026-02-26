import "@testing-library/jest-dom";

// Polyfill Web APIs needed by next/server (NextRequest/NextResponse)
if (typeof Request === "undefined") {
  // @ts-ignore
  globalThis.Request = class Request {
    url: string;
    method: string;
    headers: Map<string, string>;
    body: any;
    constructor(input: string | Request, init?: any) {
      this.url = typeof input === "string" ? input : input.url;
      this.method = init?.method || "GET";
      this.headers = new Map();
      this.body = init?.body || null;
    }
    json() {
      return Promise.resolve(
        this.body ? JSON.parse(this.body) : {}
      );
    }
  };
}

if (typeof Response === "undefined") {
  // @ts-ignore
  globalThis.Response = class Response {
    body: any;
    status: number;
    headers: Map<string, string>;
    constructor(body?: any, init?: any) {
      this.body = body;
      this.status = init?.status || 200;
      this.headers = new Map(Object.entries(init?.headers || {}));
    }
    json() {
      return Promise.resolve(
        typeof this.body === "string" ? JSON.parse(this.body) : this.body
      );
    }
  };
}

if (typeof Headers === "undefined") {
  // @ts-ignore
  globalThis.Headers = class Headers extends Map<string, string> {
    constructor(init?: Record<string, string>) {
      super(Object.entries(init || {}));
    }
  };
}
