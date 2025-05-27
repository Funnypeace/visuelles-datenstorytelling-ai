[01:09:19.649] Running build in Washington, D.C., USA (East) – iad1
[01:09:19.650] Build machine configuration: 2 cores, 8 GB
[01:09:19.698] Cloning github.com/Funnypeace/visuelles-datenstorytelling-ai (Branch: main, Commit: 9a40cca)
[01:09:20.544] Cloning completed: 846.000ms
[01:09:20.802] Restored build cache from previous deployment (CsK4kh8D7cvjuKemLhi5e3LoWLRR)
[01:09:21.334] Running "vercel build"
[01:09:21.766] Vercel CLI 42.1.1
[01:09:22.309] Installing dependencies...
[01:09:23.487] 
[01:09:23.487] up to date in 938ms
[01:09:23.488] 
[01:09:23.488] 26 packages are looking for funding
[01:09:23.488]   run `npm fund` for details
[01:09:23.521] Running "npm run build"
[01:09:23.630] 
[01:09:23.631] > visuelles-daten-storytelling-ai@0.0.0 build
[01:09:23.631] > vite build
[01:09:23.631] 
[01:09:23.940] [36mvite v6.3.5 [32mbuilding for production...[36m[39m
[01:09:24.016] 
[01:09:24.016] index.css doesn't exist at build time, it will remain unchanged to be resolved at runtime
[01:09:24.025] transforming...
[01:09:24.752] [32m✓[39m 20 modules transformed.
[01:09:24.755] [31m✗[39m Build failed in 782ms
[01:09:24.755] [31merror during build:
[01:09:24.755] [31m[vite:esbuild] Transform failed with 1 error:
[01:09:24.755] /vercel/path0/services/fileParserService.ts:65:0: ERROR: Unexpected end of file[31m
[01:09:24.755] file: [36m/vercel/path0/services/fileParserService.ts:65:0[31m
[01:09:24.755] [33m
[01:09:24.755] [33mUnexpected end of file[33m
[01:09:24.755] 63 |          // **WICHTIG**: hier nicht mehr raw, sondern das Pivot zurückgeben
[01:09:24.755] 64 |          const aggregated = aggregate
[01:09:24.755] 65 |  
[01:09:24.755]    |  ^
[01:09:24.755] [31m
[01:09:24.755]     at failureErrorWithLog (/vercel/path0/node_modules/esbuild/lib/main.js:1463:15)
[01:09:24.755]     at /vercel/path0/node_modules/esbuild/lib/main.js:734:50
[01:09:24.755]     at responseCallbacks.<computed> (/vercel/path0/node_modules/esbuild/lib/main.js:601:9)
[01:09:24.756]     at handleIncomingPacket (/vercel/path0/node_modules/esbuild/lib/main.js:656:12)
[01:09:24.756]     at Socket.readFromStdout (/vercel/path0/node_modules/esbuild/lib/main.js:579:7)
[01:09:24.756]     at Socket.emit (node:events:518:28)
[01:09:24.756]     at addChunk (node:internal/streams/readable:561:12)
[01:09:24.756]     at readableAddChunkPushByteMode (node:internal/streams/readable:512:3)
[01:09:24.756]     at Readable.push (node:internal/streams/readable:392:5)
[01:09:24.756]     at Pipe.onStreamRead (node:internal/stream_base_commons:189:23)[39m
[01:09:24.787] Error: Command "npm run build" exited with 1
[01:09:24.960] 
[01:09:27.727] Exiting build container
