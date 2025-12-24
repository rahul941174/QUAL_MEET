import { createProxyMiddleware } from "http-proxy-middleware";
import type { Options } from "http-proxy-middleware";
import type { ClientRequest,IncomingMessage } from "http";

const authProxyOptions: Options = {
  target: "http://localhost:4001/auth",
  changeOrigin: true,

  on: {
    proxyReq: (proxyReq: ClientRequest, req: IncomingMessage) => {
      const body = (req as any).body;

      if (!body) return;

      const bodyData = JSON.stringify(body);

      proxyReq.setHeader("Content-Type", "application/json");
      proxyReq.setHeader("Content-Length", Buffer.byteLength(bodyData));

      proxyReq.write(bodyData);
    },
  },
};

export const authProxy = createProxyMiddleware(authProxyOptions);

//room-service proxy - private route(jwt required)
// export const roomProxy=createProxyMiddleware({
//     target:"https://localhost:4002",
//     changeOrigin:true,
// })