import { useState } from "react";
import { PIN_LENGTH, findWaiterByPin, saveActiveWaiter } from "../waiters.js";

// ⚠️ The PINs (PUBLIC_WAITERS_JSON) only LOCK THE SCREEN and tell the app who is using the phone.
// They are NOT security: they ship in the public JS and anyone can read them.
// The real protection of the data is the RLS policies in supabase/policies.sql.

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];

export default function Lock({ onUnlock }) {
  const [digits, setDigits] = useState("");
  const [wrong, setWrong] = useState(false);

  function press(key) {
    if (key === "⌫") {
      setDigits((value) => value.slice(0, -1));
      setWrong(false);
      return;
    }
    const next = (digits + key).slice(0, PIN_LENGTH);
    setDigits(next);
    setWrong(false);
    if (next.length === PIN_LENGTH) {
      const waiter = findWaiterByPin(next);
      if (waiter) {
        saveActiveWaiter(waiter);
        onUnlock(waiter);
      } else {
        setWrong(true);
        setTimeout(() => setDigits(""), 350);
      }
    }
  }

  return (
    <main className="lock">
      <p className="lock__brand">Pitteri 56</p>
      <h1 className="lock__title">Sala</h1>
      <p className="lock__hint">{wrong ? "PIN non valido" : "Inserisci il tuo PIN"}</p>
      <div className={`lock__dots${wrong ? " is-wrong" : ""}`} aria-live="polite">
        {Array.from({ length: PIN_LENGTH }, (_, i) => (
          <span key={i} className={i < digits.length ? "is-filled" : ""} />
        ))}
      </div>
      <div className="lock__pad">
        {KEYS.map((key, i) =>
          key === "" ? (
            <span key={i} />
          ) : (
            <button key={key} type="button" className="lock__key" onClick={() => press(key)}>
              {key}
            </button>
          ),
        )}
      </div>
    </main>
  );
}
