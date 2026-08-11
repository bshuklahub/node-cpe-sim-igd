npx drizzle-kit generate // this will generate sql file
npx drizzle-kit migrate //this will update app.db

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