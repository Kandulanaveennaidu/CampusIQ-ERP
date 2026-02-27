// Polyfill Web APIs needed by next/server (NextRequest/NextResponse)
// This runs BEFORE test modules are loaded via setupFiles
if (typeof globalThis.Request === "undefined") {
    globalThis.Request = class Request {
        constructor(input, init) {
            this.url = typeof input === "string" ? input : input.url;
            this.method = (init && init.method) || "GET";
            this.headers = new Map();
            this.body = (init && init.body) || null;
        }
        json() {
            return Promise.resolve(this.body ? JSON.parse(this.body) : {});
        }
    };
}

if (typeof globalThis.Response === "undefined") {
    globalThis.Response = class Response {
        constructor(body, init) {
            this.body = body;
            this.status = (init && init.status) || 200;
            this.headers = new Map(Object.entries((init && init.headers) || {}));
        }
        json() {
            return Promise.resolve(
                typeof this.body === "string" ? JSON.parse(this.body) : this.body
            );
        }
    };
}

if (typeof globalThis.Headers === "undefined") {
    globalThis.Headers = class Headers {
        constructor(init) {
            this._map = new Map(Object.entries(init || {}));
        }
        get(key) { return this._map.get(key); }
        set(key, val) { this._map.set(key, val); }
        has(key) { return this._map.has(key); }
    };
}
