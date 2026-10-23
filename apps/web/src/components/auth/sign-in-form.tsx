"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";

export function SignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailMissing, setEmailMissing] = useState(false);
  const [passwordMissing, setPasswordMissing] = useState(false);
  const [failed, setFailed] = useState(false);
  const [pending, setPending] = useState(false);
  const alertRef = useRef<HTMLDivElement>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const noEmail = email.trim() === "";
    const noPassword = password === "";
    setEmailMissing(noEmail);
    setPasswordMissing(noPassword);
    setFailed(false);
    if (noEmail || noPassword) return;

    setPending(true);
    try {
      const res = await fetch("/api/auth/sign-in", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        router.replace("/");
        return;
      }
    } catch {
      // Treated like a failed attempt below so the user can retry.
    }
    setPassword("");
    setFailed(true);
    setPending(false);
    // The alert mounts on this render; focus it once it exists.
    setTimeout(() => alertRef.current?.focus(), 0);
  }

  return (
    <form className="card stack signin-card" noValidate aria-labelledby="sign-in-title" onSubmit={onSubmit}>
      <h2 id="sign-in-title">Sign in</h2>
      <div className="field">
        <label htmlFor="email">Email</label>
        <input
          className={`input${emailMissing ? " is-invalid" : ""}`}
          id="email"
          type="email"
          autoComplete="username"
          placeholder="name@example.org"
          aria-invalid={emailMissing}
          aria-describedby="email-error"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        {emailMissing ? (
          <span className="field-error" id="email-error">
            Enter your email.
          </span>
        ) : null}
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
        <input
          className={`input${passwordMissing ? " is-invalid" : ""}`}
          id="password"
          type="password"
          autoComplete="current-password"
          placeholder="Password"
          aria-invalid={passwordMissing}
          aria-describedby="password-error"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {passwordMissing ? (
          <span className="field-error" id="password-error">
            Enter your password.
          </span>
        ) : null}
      </div>
      {failed ? (
        <div className="alert alert-danger" role="alert" tabIndex={-1} ref={alertRef}>
          <span className="text-bold">Email or password is incorrect</span>
          <p className="text-sm">Check both and try again.</p>
        </div>
      ) : null}
      <button className="btn btn-primary" type="submit" disabled={pending}>
        {pending ? <span className="spinner" aria-hidden="true" /> : null}
        <span>{pending ? "Signing in…" : "Sign in"}</span>
      </button>
    </form>
  );
}
