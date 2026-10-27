import { useState } from "react";

type Challenge = { type: "totp" | "sms"; challengeId: string };
type LoginResult = { csrf?: string; mfaRequired?: boolean; mfa?: Challenge };

export function StewardLogin({
  api,
  onSuccess,
  providerLabel,
}: {
  api: <T = any>(path: string, body?: unknown, key?: string) => Promise<T>;
  onSuccess: (csrf: string) => Promise<void>;
  providerLabel: "Steward" | "Eliza Cloud";
}) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      if (!sent) {
        await api("/auth/steward/send", { email });
        setSent(true);
      } else {
        const result = await api<LoginResult>(
          challenge ? "/auth/steward/mfa" : "/auth/steward/verify",
          challenge ? { ...challenge, code } : { email, code },
        );
        if (result.mfaRequired && result.mfa) {
          setChallenge(result.mfa);
          setCode("");
        } else if (result.csrf) await onSuccess(result.csrf);
        else
          throw new Error(
            "Steward could not complete sign-in. Please try again.",
          );
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="welcome setup-overlay"
      role="dialog"
      aria-label="Wallet setup"
    >
      <section className="card auth">
        <h2>Your wallet.</h2>
        <p>
          Sign in with {providerLabel}. Your wallet stays with your account.
        </p>
        <form onSubmit={submit}>
          <label>
            Email
            <input
              type="email"
              required
              maxLength={254}
              autoComplete="email"
              autoCapitalize="none"
              value={email}
              disabled={sent || busy}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          {sent && (
            <label>
              {challenge ? "Verification code" : "Email code"}
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                autoComplete="one-time-code"
                inputMode="numeric"
                pattern="[0-9]{6,12}"
                required
                maxLength={12}
                autoFocus
                disabled={busy}
              />
            </label>
          )}
          {sent && (
            <p role="status">
              {challenge?.type === "totp"
                ? "Enter the code from your authenticator."
                : challenge?.type === "sms"
                  ? "Enter the code sent to your Steward phone."
                  : "Enter the six-digit code from your email."}
            </p>
          )}
          <button className="primary" disabled={busy}>
            {busy
              ? "Please wait…"
              : sent
                ? "Open wallet"
                : `Continue with ${providerLabel}`}
          </button>
        </form>
        {sent && (
          <button
            className="quiet"
            disabled={busy}
            onClick={() => {
              setSent(false);
              setCode("");
              setChallenge(null);
              setError("");
            }}
          >
            Use another email
          </button>
        )}
        <small>
          Investments and money flows in this preview are simulated.
        </small>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </section>
    </section>
  );
}
