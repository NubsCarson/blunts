import type { WalletProvider } from "./wallet-provider.js";
export class NativeWalletError extends Error {}
/** Only the SDK's connection/session routes may launch a native app. Never
 * accept send/buy/transfer links, arbitrary web URLs or URLs from app input. */
export function nativeWalletLink(raw: string): string {
  if (raw.length > 32768)
    throw new NativeWalletError("Wallet link was not valid.");
  // Connect 2.1.1 emits metamask:////connect/mwp. Normalize only this observed
  // SDK spelling; route and encoded session query must remain intact.
  const canonical = raw.startsWith("metamask:////connect/mwp?")
    ? raw.replace("metamask:////connect/mwp?", "metamask://connect/mwp?")
    : raw;
  let url: URL;
  try {
    url = new URL(canonical);
  } catch {
    throw new NativeWalletError("Wallet link was not valid.");
  }
  if (
    url.protocol !== "metamask:" ||
    url.hostname !== "connect" ||
    url.username ||
    url.password ||
    url.port ||
    url.hash ||
    !["", "/", "/mwp"].includes(url.pathname)
  )
    throw new NativeWalletError("Wallet link was not valid.");
  return url.href;
}
export type NativeSdk = {
  connect(options: {
    chainIds: ["0x1237"];
  }): Promise<{ accounts: string[]; chainId: string }>;
  getProvider(): WalletProvider;
  disconnect(): Promise<void>;
};
export type NativeConnection = {
  provider: WalletProvider;
  accounts: string[];
  chainId: string;
  disconnect: () => Promise<void>;
};
export type NativeConnectionDependencies = {
  canOpen(): Promise<boolean>;
  open(link: string): Promise<boolean>;
  createClient(open: (link: string) => void): Promise<NativeSdk>;
};
/** Read-only connection orchestration. No signing, sending, account creation or
 * automatic retry. Injectable services qualify cancellation and native failures. */
export async function connectMetaMaskApp(
  deps: NativeConnectionDependencies,
  signal: AbortSignal,
  timeoutMs = 60000,
): Promise<NativeConnection> {
  let sdk: NativeSdk | undefined,
    failed = true,
    cancelled = signal.aborted;
  let cleanup: Promise<void> | undefined;
  const close = async () => {
    cancelled = true;
    if (sdk) {
      cleanup ??= sdk.disconnect();
      try {
        await cleanup;
      } catch (error) {
        cleanup = undefined;
        throw error;
      }
    }
  };
  let abort!: () => void, failLink!: (error: NativeWalletError) => void;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const stopped = new Promise<never>((_, reject) => {
    failLink = (error) => {
      cancelled = true;
      if (!failed) void close().catch(() => {});
      reject(error);
    };
    abort = () =>
      failLink(new NativeWalletError("Wallet connection was cancelled."));
    timer = setTimeout(
      () =>
        failLink(
          new NativeWalletError(
            "Wallet connection timed out. Return here and try connecting again.",
          ),
        ),
      timeoutMs,
    );
  });
  signal.addEventListener("abort", abort, { once: true });
  if (cancelled) abort();
  const check = () => {
    if (cancelled)
      throw new NativeWalletError("Wallet connection was cancelled.");
  };
  const openings: Promise<void>[] = [];
  const operation = (async () => {
    check();
    if (!(await deps.canOpen()))
      throw new NativeWalletError(
        "Install the MetaMask app to connect this device.",
      );
    check();
    sdk = await deps.createClient((link) => {
      if (cancelled) return;
      try {
        const checked = nativeWalletLink(link);
        const opening = deps.open(checked).then((opened) => {
          if (!opened)
            throw new NativeWalletError(
              "MetaMask could not be opened. Return here and try connecting again.",
            );
        });
        if (failed) openings.push(opening);
        void opening.catch(() =>
          failLink(
            new NativeWalletError(
              "MetaMask could not be opened. Return here and try connecting again.",
            ),
          ),
        );
      } catch {
        failLink(new NativeWalletError("Wallet link was not valid."));
      }
    });
    check();
    const connected = await sdk.connect({ chainIds: ["0x1237"] });
    await Promise.all(openings);
    check();
    if (
      !connected.accounts.length ||
      connected.accounts.length > 100 ||
      !connected.accounts.every((a) => /^0x[0-9a-fA-F]{40}$/.test(a)) ||
      !/^0x[0-9a-fA-F]+$/.test(connected.chainId) ||
      !Number.isSafeInteger(Number(connected.chainId))
    )
      throw new NativeWalletError("Wallet connection could not be verified.");
    const provider = sdk.getProvider();
    if (typeof provider.request !== "function")
      throw new NativeWalletError("Wallet connection could not be verified.");
    return { ...connected, provider, disconnect: close };
  })();
  try {
    const result = await Promise.race([operation, stopped]);
    failed = false;
    return result;
  } catch (error) {
    cancelled = true;
    await close().catch(() => {});
    throw error instanceof NativeWalletError
      ? error
      : new NativeWalletError(
          "Wallet connection was cancelled or unavailable. Try again.",
        );
  } finally {
    if (timer) clearTimeout(timer);
    signal.removeEventListener("abort", abort);
    if (failed)
      void operation
        .then(
          () => close(),
          () => close(),
        )
        .catch(() => {});
  }
}
