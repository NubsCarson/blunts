import { test } from "node:test";
import assert from "node:assert/strict";
import { setImmediate } from "node:timers/promises";
import {
  connectMetaMaskApp,
  nativeWalletLink,
  type NativeConnectionDependencies,
  type NativeSdk,
} from "../shared/native-wallet.js";
const account = "0x1111111111111111111111111111111111111111";
const link = "metamask://connect/mwp?id=local-test-session";
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}
function fixture() {
  let created = 0,
    closed = 0,
    opened: string[] = [],
    openLink!: (link: string) => void;
  const options: unknown[] = [];
  const sdk: NativeSdk = {
    connect: async (value) => {
      options.push(value);
      openLink(link);
      return { accounts: [account], chainId: "0x1237" };
    },
    getProvider: () => ({ request: async () => "0x1237" }),
    disconnect: async () => {
      closed++;
    },
  };
  const deps: NativeConnectionDependencies = {
    canOpen: async () => true,
    open: async (url) => {
      opened.push(url);
      return true;
    },
    createClient: async (open) => {
      created++;
      openLink = open;
      return sdk;
    },
  };
  return {
    deps,
    sdk,
    options,
    triggerLink: (url: string) => openLink(url),
    created: () => created,
    closed: () => closed,
    opened: () => opened,
  };
}
test("native connection launches only SDK connection routes and never transaction/web links", () => {
  assert.equal(nativeWalletLink(link), link);
  assert.equal(
    nativeWalletLink("metamask://connect?test=public"),
    "metamask://connect?test=public",
  );
  for (const bad of [
    "https://evil.example/connect",
    "metamask://send/0x123",
    "metamask://connect/buy",
    "metamask://user@connect/mwp",
    "metamask://connect/mwp#fragment",
    "not-a-url",
    "metamask://connect:123/mwp",
    "metamask://connect/mwp?" + "x".repeat(32768),
  ])
    assert.throws(() => nativeWalletLink(bad));
});
test("successful native connection returns a verified public provider with explicit disconnect", async () => {
  const f = fixture(),
    result = await connectMetaMaskApp(f.deps, new AbortController().signal);
  assert.deepEqual(result.accounts, [account]);
  assert.equal(result.chainId, "0x1237");
  assert.deepEqual(f.options, [{ chainIds: ["0x1237"] }]);
  assert.deepEqual(f.opened(), [link]);
  assert.equal(f.closed(), 0);
  await result.disconnect();
  await result.disconnect();
  assert.equal(f.closed(), 1);
});
test("missing MetaMask and pre-cancelled connection never load SDK or open a link", async () => {
  const f = fixture();
  f.deps.canOpen = async () => false;
  await assert.rejects(
    connectMetaMaskApp(f.deps, new AbortController().signal),
    /Install the MetaMask app/,
  );
  assert.equal(f.created(), 0);
  assert.deepEqual(f.opened(), []);
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    connectMetaMaskApp(f.deps, controller.signal),
    /cancelled/,
  );
  assert.equal(f.created(), 0);
});
test("native launch failure cannot become an accepted connected session", async () => {
  for (const reason of ["unavailable", "throws", "bad-link"]) {
    const f = fixture();
    f.deps.open = async () => {
      if (reason === "throws") throw Error("private upstream context");
      return false;
    };
    if (reason === "bad-link")
      f.sdk.connect = async () => {
        f.triggerLink("metamask://send/0x123");
        return { accounts: [account], chainId: "0x1237" };
      };
    await assert.rejects(
      connectMetaMaskApp(f.deps, new AbortController().signal),
      (error) =>
        error instanceof Error && !error.message.includes("private upstream"),
    );
    assert.equal(f.closed(), 1);
  }
});
test("cancellation during SDK loading closes a late client without requesting connection", async () => {
  const f = fixture(),
    gate = deferred<NativeSdk>(),
    started = deferred<void>(),
    controller = new AbortController();
  f.deps.createClient = async () => {
    started.resolve();
    return gate.promise;
  };
  const task = connectMetaMaskApp(f.deps, controller.signal);
  await started.promise;
  controller.abort();
  await assert.rejects(task, /cancelled/);
  gate.resolve(f.sdk);
  await setImmediate();
  assert.equal(f.closed(), 1);
  assert.deepEqual(f.options, []);
  assert.deepEqual(f.opened(), []);
});
test("timeout during wallet availability cannot later start an SDK or open a wallet", async () => {
  const f = fixture(),
    gate = deferred<boolean>();
  f.deps.canOpen = () => gate.promise;
  await assert.rejects(
    connectMetaMaskApp(f.deps, new AbortController().signal, 10),
    /timed out/,
  );
  gate.resolve(true);
  await setImmediate();
  assert.equal(f.created(), 0);
  assert.deepEqual(f.opened(), []);
});
test("late wallet approval after cancellation cannot return a connection or escape cleanup", async () => {
  const f = fixture(),
    gate = deferred<{ accounts: string[]; chainId: string }>(),
    started = deferred<void>(),
    controller = new AbortController();
  f.sdk.connect = async () => {
    started.resolve();
    return gate.promise;
  };
  const task = connectMetaMaskApp(f.deps, controller.signal);
  await started.promise;
  controller.abort();
  await assert.rejects(task, /cancelled/);
  assert.equal(f.closed(), 1);
  gate.resolve({ accounts: [account], chainId: "0x1237" });
  await setImmediate();
  assert.equal(f.closed(), 1);
});
test("invalid wallet identity and arbitrary SDK error text never reach app state", async () => {
  for (const value of [
    { accounts: [], chainId: "0x1237" },
    { accounts: ["not-an-address"], chainId: "0x1237" },
    { accounts: [account], chainId: "0x20000000000000" },
  ]) {
    const f = fixture();
    f.sdk.connect = async () => value;
    await assert.rejects(
      connectMetaMaskApp(f.deps, new AbortController().signal),
      /could not be verified/,
    );
    assert.equal(f.closed(), 1);
  }
  const f = fixture();
  f.sdk.connect = async () => {
    throw Error("private relay content");
  };
  await assert.rejects(
    connectMetaMaskApp(f.deps, new AbortController().signal),
    /^Error: Wallet connection was cancelled or unavailable/,
  );
});
