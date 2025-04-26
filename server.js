const express = require("express");
const cors = require("cors");
const { createProxyMiddleware } = require("http-proxy-middleware");

const app = express();
const port = 3001;

// Enable CORS for all routes
app.use(cors());

// Serve static files from the React app
app.use(express.static("build"));

// Proxy requests to the Llama.cpp API
app.use(
  "/api",
  createProxyMiddleware({
    target: "http://localhost:12434",
    changeOrigin: true,
    pathRewrite: {
      "^/api": "", // Remove /api prefix when forwarding
    },
    onProxyReq: (proxyReq, req, res) => {
      // Log the incoming request
      console.log("Proxying request:", {
        method: req.method,
        path: req.path,
        headers: req.headers,
      });
    },
    onProxyRes: (proxyRes, req, res) => {
      // Add CORS headers
      proxyRes.headers["Access-Control-Allow-Origin"] = "*";
      proxyRes.headers["Access-Control-Allow-Methods"] =
        "GET, POST, PUT, DELETE, OPTIONS";
      proxyRes.headers["Access-Control-Allow-Headers"] =
        "Content-Type, Authorization";

      // Log the response
      console.log("Proxy response:", {
        statusCode: proxyRes.statusCode,
        headers: proxyRes.headers,
      });
    },
    onError: (err, req, res) => {
      console.error("Proxy error:", err);
      res.status(500).send("Proxy Error");
    },
  })
);

// For any request that doesn't match the above, send back React's index.html file
app.get("*", (req, res) => {
  res.sendFile("index.html", { root: "build" });
});

app.listen(port, () => {
  console.log(`Proxy server running at http://localhost:${port}`);
});
