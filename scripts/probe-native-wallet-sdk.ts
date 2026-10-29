// SDK-component probe on the task-owned emulator. No installed wallet is
// impersonated: the connection link is observed, not opened or approved.
import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { readdir, mkdir, writeFile } from "node:fs/promises";
const adb = "/Users/nubs/Library/Android/sdk/platform-tools/adb",
  serial = "emulator-5580";
if (
  !execFileSync(adb, ["-s", serial, "emu", "avd", "name"], {
    encoding: "utf8",
  }).startsWith("blunts_wallet_qa_20261028")
)
  throw Error("Refusing unrelated emulator.");
const sdkFile = (await readdir("dist-native/assets")).find((name) =>
  /^connect-evm-.*\.js$/.test(name),
);
if (!sdkFile) throw Error("SDK bundle was not found.");
const browser = await chromium.connectOverCDP("http://127.0.0.1:9226", {
  noDefaults: true,
  timeout: 15000,
});
try {
  const pages = browser.contexts().flatMap((c) => c.pages());
  if (pages.length !== 1 || pages[0].url() !== "https://localhost/")
    throw Error("Unexpected native WebView.");
  // SDK clients are singletons. Each probe starts a new WebView JS realm so
  // an earlier probe's link callback cannot consume this probe's request.
  await pages[0].reload({ waitUntil: "load" });
  const sockets: { host: string; errors: number; closed: boolean }[] = [];
  pages[0].on("websocket", (socket) => {
    const observation = {
      host: new URL(socket.url()).hostname,
      errors: 0,
      closed: false,
    };
    sockets.push(observation);
    socket.on("socketerror", () => observation.errors++);
    socket.on("close", () => {
      observation.closed = true;
    });
  });
  // String source prevents the TS runner from injecting __name into the
  // browser realm; SDK startup must be measured independently of that helper.
  const source = `(async ({sdkFile}) => {
    let stage = "import", client, timer;
    try {
      const module = await import('/assets/' + sdkFile);
      let received, failed;
      const linkReady = new Promise((resolve, reject) => { received = resolve; failed = reject; });
      stage = "initialize";
      client = await module.createEVMClient({
        dapp: { name: "Blunts", url: window.location.origin, nativeScheme: "com.lalalune.blunts://wallet-return" },
        api: { supportedNetworks: { "0x1237": "https://rpc.mainnet.chain.robinhood.com" } },
        analytics: { enabled: false }, debug: false, skipAutoAnnounce: true,
        ui: { headless: true, showInstallModal: false },
        mobile: { useDeeplink: true, preferredOpenLink: raw => {
          const link = new URL(raw);
          received({ protocol:link.protocol, host:link.hostname, path:link.pathname, queryKeys:[...link.searchParams.keys()] });
        } },
      });
      stage = "relay-session-request";
      void client.connect({chainIds:["0x1237"]}).catch(failed);
      const link = await Promise.race([linkReady, new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error("timeout")),30000);})]);
      return { observed:true, stage, origin:window.location.origin, userAgent:navigator.userAgent, linkShapeOnly:link, apiKeyProvided:false, analyticsEnabled:false, peerWalletConnected:false, walletLinkOpened:false, financialMethodsRequested:false };
    } catch(error) {
      return { observed:false, stage, errorType:error instanceof Error?error.name:"unknown", diagnostic:error instanceof Error?error.message.replace(/0x[a-f0-9]{16,}/gi,"[redacted]").slice(0,180):"unavailable", peerWalletConnected:false, walletLinkOpened:false, financialMethodsRequested:false };
    } finally { if(timer)clearTimeout(timer); if(client)await client.disconnect().catch(()=>{}); }
  })(${JSON.stringify({ sdkFile })})`;
  const report = await pages[0].evaluate<{ observed: boolean; stage: string }>(
    source,
  );
  const root = `data/review-20261028/evm/native-wallet-sdk-probe-${Date.now()}`;
  await mkdir(root, { recursive: true, mode: 0o700 });
  await writeFile(
    `${root}/receipt.json`,
    JSON.stringify(
      {
        scope:
          "real SDK/relay component on isolated native Android WebView; no MetaMask peer",
        sourceRevision: execFileSync("git", ["rev-parse", "HEAD"], {
          encoding: "utf8",
        }).trim(),
        report,
        sockets,
        rawLinkSaved: false,
        mainnetWrites: 0,
      },
      null,
      2,
    ) + "\n",
    { mode: 0o600 },
  );
  console.log(
    JSON.stringify({
      observed: report.observed,
      stage: report.stage,
      peerWalletConnected: false,
      mainnetWrites: 0,
      receipt: `${root}/receipt.json`,
    }),
  );
  if (!report.observed) process.exitCode = 2;
} finally {
  await browser.close();
}
