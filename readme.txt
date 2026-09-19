npx drizzle-kit generate // this will generate sql file
npx drizzle-kit migrate //this will update app.db

## This is for building Docker image and running 
docker build -t node-cpe-sim . 
docker run  --add-host=trm-bs.fibercop.local:host-gateway --add-host=trm-dm.fibercop.local:host-gateway -p 8080:5000 --name my-cpe-sim-app node-cpe-sim:latest

docker save -o cpe-sim.tar node-cpe-sim:latest

podman load -i cpe-sim.tar

podman run   -p 8981:5000 --name my-cpe-sim-app node-cpe-sim:latest

///in lab
podman load -i cpe-sim.tar
podman images
[hdmadmin@hdm-core fibercop-custom]$ podman images
REPOSITORY                                  TAG               IMAGE ID      CREATED      SIZE
docker.io/library/node-cpe-sim              latest            8110ba8aa5c6  6 hours ago  938 MB

podman tag docker.io/library/node-cpe-sim localhost:5000/node-cpe-sim:latest

[hdmadmin@hdm-core fibercop-custom]$ podman images
REPOSITORY                                  TAG               IMAGE ID      CREATED      SIZE
localhost:5000/node-cpe-sim                 latest            8110ba8aa5c6  6 hours ago  938 MB

podman push localhost:5000/node-cpe-sim <===Most important

podman run -it --add-host trm-wg.fibercop.local:trm-wg.fibercop.local localhost:5000/node-cpe-sim:latest 
podman run --rm -it -p 8080:5000 --network slirp4netns:allow_host_loopback=true localhost:5000/node-cpe-sim:latest

podman run -d --rm -it -p 8080:5000 --network slirp4netns:allow_host_loopback=true localhost:5000/node-cpe-sim:latest

//This is final changes working fine
podman run  --rm -it -p 8183:5000 --network slirp4netns:allow_host_loopback=true  docker.io/library/node-cpe-sim:latest
//This is final changes working fine 
npm run dev -- -u http://trm-wg.fibercop.local:7080/cwmpWeb/CPEMgt -s SIMCPE898989899 -o 00D0D0 -p "H5745 V3" -i 90
localhost trm-wg.fibercop.local trm-dm.fibercop.local wscr.fibercop.local

//run as administrator
netsh winsock reset

npm run dev -- -u http://trm-wg.fibercop.local:7080/cwmpWeb/CPEMgt -s SIMCPE3311111220 -o 00D0D0 -p "H5745 V3" -i 90

podman run --rm -it -p 8080:5000 --network slirp4netns:allow_host_loopback=true localhost:5000/node-cpe-sim:latest

npm run dev -- -u https://acsfe.edge.fibercop.local:11101/cwmpWeb/WGCPEMgt -s SIMCPESPV401889 -o 00D0D0 -p "H5745 V3" -i 90 -k YES

npm run dev -- -u https://acsfe.edge.fibercop.local:11101/cwmpWeb/WGCPEMgt -s SIMCPESPV401889 -o 00D0D0 -p "H5745 V3" -i 90 -k YES

npm run dev -- -u http://acs.fibercop.local:18013/cwmpWeb/WGCPEMgt -s SIMCPESPV40131889 -o 00D0D0 -p "H5745 V3" -i 90 -k NO

npm run dev -- -u https://acsfe.edge.fibercop.local:11101/cwmpWeb/WGCPEMgt -s SIMCPESPV407791 -o 00D0D0 -p "H5745 V3" -i 90 -k YES

npm run dev -- -u https://trm-wg.fibercop.local:7080/cwmpWeb/WGCPEMgt -s SIMCPESPV407791 -o 00D0D0 -p "H5745 V3" -i 90 -k YES

npm run dev -- -u https://trm-wg.fibercop.local:7080/cwmpWeb/WGCPEMgt -s SIMCPESPV40H2640111 -o 00D0D0 -p "H2640W" -i 90 -k NO

npm run dev -- -u https://trm-wg-acscoll.azure.fibercop.local:37443/cwmpWeb/WGCPEMgt -s SIMCPESPV40H2640111 -o 00D0D0 -p "H2640W" -i 90 -k NO

npm run dev -- -u https://trm-wg-acscoll.azure.fibercop.local:37443/cwmpWeb/WGCPEMgt -s SIMCPESPV40H2640211 -o 00D0D0 -p "H2640W" -i 90 -k Yes -c No


//for running websocket 
#podman run -d -p 8080:8080 --restart=always --name crtool crtool:2
Used on 13-may and 21st may
podman run --replace -d -p 8080:8080 --restart=always --name crtool crtool:2

10-Aug-2026
//generating input.jso file 
npx tsx gpvtodata.ts
npm run dev -u https://trm-wg-acscoll.azure.fibercop.local:37443/cwmpWeb/WGCPEMgt -s SIMCPESPV40H2640299 -o 00040E -p "FRITZ!Box" -i 90 -k Yes -c No


npx drizzle-kit push
> In 2026, you have two primary ways to sync your model to the database:
> Method Command Best Use Case
> Drizzle Push npx drizzle-kit push Local Development: Directly pushes schema changes to the DB without creating migration files.
> Migrations npx drizzle-kit generate Production/Teams: Generates version-controlled .sql files that you can review and apply.

[bshukla@BRIJESH-PC node-cpe-sim]$ npx drizzle-kit migrate
No config path provided, using default 'drizzle.config.ts'
Reading config file '/home/bshukla/node-cpe-sim/drizzle.config.ts'
[bshukla@BRIJESH-PC node-cpe-sim]$ npx drizzle-kit push
No config path provided, using default 'drizzle.config.ts'
Reading config file '/home/bshukla/node-cpe-sim/drizzle.config.ts'
[✓] Pulling schema from database...
SqliteError: index users_email_unique already exists
    at Database.prepare (/home/bshukla/node-cpe-sim/node_modules/better-sqlite3/lib/methods/wrappers.js:5:21)
    at Object.run (/home/bshukla/node-cpe-sim/node_modules/drizzle-kit/bin.cjs:81314:20)
    at sqlitePush (/home/bshukla/node-cpe-sim/node_modules/drizzle-kit/bin.cjs:84519:24)
    at process.processTicksAndRejections (node:internal/process/task_queues:103:5)
    at async Object.handler (/home/bshukla/node-cpe-sim/node_modules/drizzle-kit/bin.cjs:93884:9)
    at async run (/home/bshukla/node-cpe-sim/node_modules/drizzle-kit/bin.cjs:93117:7) {
  code: 'SQLITE_ERROR'
}
[bshukla@BRIJESH-PC node-cpe-sim]$ npx drizzle-kit push
No config path provided, using default 'drizzle.config.ts'
Reading config file '/home/bshukla/node-cpe-sim/drizzle.config.ts'
[✓] Pulling schema from database...
[✓] Changes applied
[bshukla@BRIJESH-PC node-cpe-sim]$



//tunneling 

The 502 Bad Gateway error happens because your server configuration has fs.strict: true enabled. This security feature blocks external requests from reading anything outside your explicit workspace root. When LocalTunnel requests your code components over its public address, Vite flags it as an illegal file system access and rejects it.
Additionally, you are working on a project structured for a production backend architecture (building to dist/public). If you want to keep coding live, you must adapt your Vite configuration to explicitly permit proxy tunnels.
Here is the fixed vite.config.ts (or vite.config.js). Replace your file's contents with the following:

import { defineConfig } from "vite";import react from "@vitejs/plugin-react";import path from "path";import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    host: "0.0.0.0",         // 1. Force Vite to bind to all local network interfaces
    allowedHosts: true,      // 2. Prevent Vite from blocking LocalTunnel domain names
    hmr: {
      clientPort: 443,       // 3. Keep WebSockets working over LocalTunnel's HTTPS link
    },
    fs: {
      strict: false,         // 4. CRITICAL: Turn off strict file restrictions so tunnel can read files
      deny: ["**/.*"],
    },
  },
});

## 🏃‍♂️ Next Steps to Launch

   1. Restart your dev server: Stop your existing terminal process and run your standard build tool command (like npm run dev) so it parses the new file guidelines.
   2. Launch LocalTunnel: Point your tunnel to your current client port. Assuming it's running on the typical Vite default 5173:
   
   lt --port 5173
   
   3. Open the tunnel URL: When you click the generated address, look closely for LocalTunnel's default protection page. Press "Click to Continue" to bypass it, allowing your internal assets to load without a hitch.

Let me know if you run into any new error codes or if your backend application runs on a separate port (like 5000 or 5001) that also needs to be linked.




//GITHUB bshuklahub
rm ~/.git-credentials
git config --global --unset credential.helper
git config user.name "bshuklahub"
git config user.email "brijeshk.shukla@outlook.com"
git remote set-url origin <hub url>
