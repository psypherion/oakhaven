/* A local PeerJS signalling server for tests (IPv4 only).
   node tests/peer_server.js <port> ; needs the `peer` npm package (PEER_DIR). */
const http=require('http'), express=require((process.env.PEER_DIR||'/tmp/claude-0/npm/node_modules')+'/express');
const {ExpressPeerServer}=require((process.env.PEER_DIR||'/tmp/claude-0/npm/node_modules')+'/peer');
const port=+process.argv[2]||9177, app=express(), server=http.createServer(app);
app.use('/',ExpressPeerServer(server,{path:'/',allow_discovery:false}));
server.listen(port,'127.0.0.1',()=>console.log('peer server on',port));
