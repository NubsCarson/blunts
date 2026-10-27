import { useRef, useState } from "react";
import {
  BanknoteArrowDown,
  Layers,
  ChartNoAxesCombined,
  Flame,
} from "lucide-react";
import { BluntIcon } from "./AmountPicker";

const lessons = [
  {
    title: "Fill it up.",
    body: "Fill adds demo funds and invests them. The 1% conversion fee comes out of the amount you choose.",
    facts: [
      ["$25", "$24.75 invested"],
      ["$100", "$99 invested"],
    ],
  },
  {
    title: "10 blunts. One band.",
    body: "One whole blunt represents $100 of confirmed investment value. Ten become a band. A partial blunt stays in the tray.",
    facts: [
      ["1 blunt", "$100 invested"],
      ["1 band", "$1,000 invested"],
    ],
  },
  {
    title: "What's inside?",
    body: "Shaw's concept is to invest in an ETF: a fund that holds a basket of investments. This preview uses a simulated QQQ instrument, not real ETF shares.",
    facts: [
      ["Demo price", "Fixed for testing"],
      ["Real shares", "Not connected"],
    ],
  },
  {
    title: "Up. And down too.",
    body: "Real investments can lose value. A live version must show confirmed market value and settled cash separately. This demo's fixed price does not show market returns.",
    facts: [],
  },
  {
    title: "Spark cashes out.",
    body: "Spark sells your demo investment with a 1% conversion fee. Once the sale settles, press Spark again to cash out to a test destination. No real money moves.",
    facts: [
      ["Sell $100", "$99 after the fee"],
      ["Demo payout", "No extra app fee"],
    ],
  },
];

export function HowItWorks({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const start = useRef<{ x: number; y: number } | null>(null);
  const lesson = lessons[step];
  function move(delta: number) {
    setStep((current) =>
      Math.max(0, Math.min(lessons.length - 1, current + delta)),
    );
  }
  return (
    <div
      className="menu-how"
      role="region"
      aria-label="How it works walkthrough"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
          event.preventDefault();
          move(event.key === "ArrowRight" ? 1 : -1);
        }
      }}
      onPointerDown={(event) => {
        if (
          !event.isPrimary ||
          (event.target instanceof Element &&
            event.target.closest("button, a, input, select, textarea, summary"))
        ) {
          start.current = null;
          return;
        }
        start.current = { x: event.clientX, y: event.clientY };
      }}
      onPointerCancel={() => {
        start.current = null;
      }}
      onPointerUp={(event) => {
        const previous = start.current;
        start.current = null;
        if (!previous) return;
        const dx = event.clientX - previous.x,
          dy = event.clientY - previous.y;
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5)
          move(dx < 0 ? 1 : -1);
      }}
    >
      <div className={`how-art how-art-${step}`} aria-hidden="true">
        {step === 0 ? (
          <BanknoteArrowDown size={80} strokeWidth={1.6} />
        ) : step === 1 ? (
          <div className="how-band">
            {Array.from({ length: 10 }, (_, i) => (
              <BluntIcon key={i} />
            ))}
          </div>
        ) : step === 2 ? (
          <Layers size={80} strokeWidth={1.6} />
        ) : step === 3 ? (
          <ChartNoAxesCombined size={80} strokeWidth={1.6} />
        ) : (
          <Flame size={80} strokeWidth={1.6} />
        )}
      </div>
      <div className="how-lesson" aria-live="polite" aria-atomic="true">
        <h3>{lesson.title}</h3>
        <p>{lesson.body}</p>
        {step === 2 && (
          <details className="how-more">
            <summary>What is an ETF?</summary>
            <p>
              An exchange-traded fund holds a basket of investments and trades
              as one security. Owning a fund is different from holding cash: its
              value can change.
            </p>
            <p>
              Blunts does not currently buy that security. A live version needs
              an enabled investment provider, its account setup and disclosures,
              and confirmed orders and holdings.
            </p>
          </details>
        )}
        {lesson.facts.length > 0 && (
          <dl className="how-facts">
            {lesson.facts.map(([value, detail]) => (
              <div key={value}>
                <dt>{value}</dt>
                <dd>{detail}</dd>
              </div>
            ))}
          </dl>
        )}
        <p className="how-progress">
          {step + 1} of {lessons.length}
        </p>
      </div>
      <div className="how-dots" aria-hidden="true">
        {lessons.map((_, index) => (
          <span key={index} className={index === step ? "current" : ""} />
        ))}
      </div>
      <div className="how-controls">
        <button
          className="quiet"
          disabled={step === 0}
          onClick={() => move(-1)}
        >
          Back
        </button>
        <button
          className="primary"
          onClick={() => (step < lessons.length - 1 ? move(1) : onDone())}
        >
          {step < lessons.length - 1 ? "Next" : "Got it"}
        </button>
      </div>
      <small>Demo only · no real money or investments</small>
    </div>
  );
}
