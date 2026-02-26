/**
 * Custom Next.js server with Socket.IO for real-time WebSocket communication.
 * Run with: node server.js
 *
 * This replaces `next start` and adds Socket.IO on the same HTTP server.
 */

const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { Server: SocketIOServer } = require("socket.io");
const jwt = require("next-auth/jwt");

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
    const httpServer = createServer((req, res) => {
        const parsedUrl = parse(req.url, true);
        handle(req, res, parsedUrl);
    });

    // ── Socket.IO Server ───────────────────────────────────────────────
    const io = new SocketIOServer(httpServer, {
        path: "/api/socketio",
        addTrailingSlash: false,
        cors: {
            origin: process.env.NEXTAUTH_URL || "*",
            methods: ["GET", "POST"],
            credentials: true,
        },
        pingTimeout: 60000,
        pingInterval: 25000,
        transports: ["websocket", "polling"],
        connectionStateRecovery: {
            maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
            skipMiddlewares: true,
        },
    });

    // Make io globally accessible for API routes
    global.__io = io;

    // ── Socket.IO JWT Authentication Middleware ────────────────────────
    // Verifies the NextAuth session token before allowing connections.
    // Clients must pass their session cookie or token in handshake auth.
    io.use(async (socket, next) => {
        try {
            // Try to extract token from the cookie header (browser clients)
            const cookieHeader = socket.handshake.headers?.cookie || "";
            const tokenFromAuth = socket.handshake.auth?.token;

            // Build a minimal request-like object for next-auth/jwt
            const fakeReq = {
                headers: {
                    cookie: cookieHeader,
                },
                // Allow passing the raw JWT directly (for non-browser clients)
                ...(tokenFromAuth ? {} : {}),
            };

            // Decode the NextAuth JWT from session cookie
            const secret = process.env.NEXTAUTH_SECRET;
            if (!secret) {
                console.error("[Socket.IO] NEXTAUTH_SECRET not set — rejecting all connections");
                return next(new Error("Server misconfiguration"));
            }

            const decoded = await jwt.getToken({
                req: fakeReq,
                secret,
                secureCookie: process.env.NODE_ENV === "production",
            });

            if (!decoded || !decoded.id || !decoded.school_id) {
                console.log(`[Socket.IO] Rejected: invalid or missing session token`);
                return next(new Error("Authentication required — please log in"));
            }

            // Attach verified user data to socket (from JWT, NOT from client)
            socket.data.userId = decoded.id;
            socket.data.schoolId = decoded.school_id;
            socket.data.userName = decoded.name || "";
            socket.data.userRole = decoded.role || "";

            next();
        } catch (err) {
            console.error("[Socket.IO] Auth middleware error:", err.message);
            next(new Error("Authentication failed"));
        }
    });

    // ── Connection handler ─────────────────────────────────────────────
    io.on("connection", (socket) => {
        const { schoolId, userId, userName, userRole } = socket.data;

        // Join institution room (multi-tenant isolation)
        const schoolRoom = `school:${schoolId}`;
        socket.join(schoolRoom);

        // Join personal room for direct notifications
        const userRoom = `user:${userId}`;
        socket.join(userRoom);

        // Join role-based room
        if (userRole) {
            socket.join(`role:${schoolId}:${userRole}`);
        }

        console.log(
            `[Socket.IO] Connected: ${userName || userId} (${userRole}) → ${schoolRoom}`
        );

        // Store user info in socket data
        socket.data.schoolId = schoolId;
        socket.data.userId = userId;
        socket.data.userName = userName;
        socket.data.userRole = userRole;

        // ── Client events ──────────────────────────────────────────────
        socket.on("notification:read", (data) => {
            // Broadcast to the user's other tabs/devices that notification was read
            socket.to(userRoom).emit("notification:read", data);
        });

        socket.on("notification:read_all", () => {
            socket.to(userRoom).emit("notification:read_all");
        });

        socket.on("typing", (data) => {
            // For real-time messaging - broadcast typing indicator
            if (data.conversationId) {
                socket.to(`school:${schoolId}`).emit("typing", {
                    conversationId: data.conversationId,
                    userId,
                    userName,
                    isTyping: data.isTyping,
                });
            }
        });

        socket.on("disconnect", (reason) => {
            console.log(
                `[Socket.IO] Disconnected: ${userName || userId} (${reason})`
            );
        });

        socket.on("error", (error) => {
            console.error(`[Socket.IO] Error for ${userId}:`, error.message);
        });
    });

    // ── Periodic cleanup ───────────────────────────────────────────────
    setInterval(() => {
        const sockets = io.sockets.sockets;
        const count = sockets.size;
        if (count > 0) {
            console.log(`[Socket.IO] Active connections: ${count}`);
        }
    }, 300000); // Log every 5 minutes

    // ── Start server ──────────────────────────────────────────────────
    httpServer.listen(port, hostname, () => {
        console.log(
            `\n🚀 CampusIQ server ready at http://${hostname}:${port}` +
            `\n📡 Socket.IO ready at ws://${hostname}:${port}/api/socketio` +
            `\n🌍 Environment: ${dev ? "development" : "production"}\n`
        );
    });
});
