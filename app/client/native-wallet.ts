import { Capacitor } from "@capacitor/core";
import { AppLauncher } from "@capacitor/app-launcher";
import { connectMetaMaskApp, NativeWalletError } from "../shared/native-wallet";
import { robinhood } from "../shared/robinhood";
type Client = Awaited<
  ReturnType<(typeof import("@metamask/connect-evm"))["createEVMClient"]>
>;
let client: Promise<Client> | undefined;
let openCurrent: ((link: string) => void) | undefined;
let generation = 0;
export async function connectNativeWallet(signal: AbortSignal) {
  if (
    !Capacitor.isNativePlatform() ||
    import.meta.env.VITE_NATIVE_BUILD !== "true"
  )
    throw new NativeWalletError(
      "Native wallet connection is available only in the installed app.",
    );
  return connectMetaMaskApp(
    {
      canOpen: async () =>
        (await AppLauncher.canOpenUrl({ url: "metamask://" })).value,
      open: async (url) => (await AppLauncher.openUrl({ url })).completed,
      createClient: async (open) => {
        const attempt = ++generation;
        openCurrent = open;
        const { createEVMClient } = await import("@metamask/connect-evm");
        client ??= createEVMClient({
          dapp: {
            name: "Blunts",
            url: window.location.origin,
            nativeScheme: "com.lalalune.blunts://wallet-return",
          },
          api: {
            supportedNetworks: { "0x1237": robinhood.rpcUrls.default.http[0] },
          },
          analytics: { enabled: false },
          debug: false,
          skipAutoAnnounce: true,
          ui: {
            headless: true,
            preferExtension: false,
            showInstallModal: false,
          },
          mobile: {
            useDeeplink: true,
            preferredOpenLink: (link) => openCurrent?.(link),
          },
        }).catch((error) => {
          client = undefined;
          throw error;
        });
        const sdk = await client;
        return {
          connect: (options) => {
            if (attempt !== generation)
              throw new NativeWalletError("Wallet connection was cancelled.");
            return sdk.connect(options);
          },
          getProvider: () => sdk.getProvider(),
          disconnect: async () => {
            if (attempt !== generation) return;
            openCurrent = undefined;
            await sdk.disconnect();
          },
        };
      },
    },
    signal,
  );
}
