"use client";

import { useActionState } from "react";
import { Button, FieldError, FormBanner, Input, Label } from "@/components/ui/field";
import { loginAction, type LoginState } from "./actions";

const initial: LoginState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initial);

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {state.message ? <FormBanner kind="error">{state.message}</FormBanner> : null}

      <div>
        <Label htmlFor="email" required>
          อีเมล
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          error={state.errors?.email}
        />
        <FieldError id="email-error" message={state.errors?.email} />
      </div>

      <div>
        <Label htmlFor="password" required>
          รหัสผ่าน
        </Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          error={state.errors?.password}
        />
        <FieldError id="password-error" message={state.errors?.password} />
      </div>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
      </Button>
    </form>
  );
}
