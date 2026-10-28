type WalletEvent = "accountsChanged" | "chainChanged" | "disconnect";
export type WalletProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<any>;
  on?: (name: WalletEvent, fn: (...args: any[]) => void) => unknown;
  off?: (name: WalletEvent, fn: (...args: any[]) => void) => void;
  removeListener?: (name: WalletEvent, fn: (...args: any[]) => void) => void;
};
