# Zod Form Validation

Form shapes are validated with [zod](https://zod.dev) 4, wired into [react-hook-form](https://react-hook-form.com) via `@hookform/resolvers/zod` (5.x). Schemas live in `src/features/<feature>/<feature>.schema.ts`. `src/features/auth/auth.schema.ts` is the canonical reference.

> **Import `z` from `@/lib/zod`, never from `'zod'`.** That module calls `z.config()` so a field with no value (`undefined` or `''`) that fails with `invalid_type` or `invalid_value` reads **"Required"** instead of Zod 4's defaults ("Invalid input: expected string, received undefined", "Invalid option: expected one of …"). Messages passed to `.min()`, `.regex()`, `.refine()`, `addIssue()` etc. are unaffected. Zod 4 points to know:
> - **Object-level `.refine()` / `.superRefine()` is skipped while another field has a type-level failure** (missing value, wrong type, a failed `z.literal` or `z.enum`). A failed check such as `.min()` does not stop it. So on signup, "Passwords do not match" does not appear while the Terms checkbox (`z.literal(true)`) is unticked. Pass the refinement a `when` option if its message must show up front.
> - Custom messages for `z.literal` / `z.enum` go in `{ error }` (e.g. `z.literal(true, { error: '…' })`); there is no `errorMap`.

## Purpose

> **Hard rule (`CLAUDE.md`):** forms use zod + react-hook-form. Do not introduce yup / joi / valibot, and do not hand-roll validation for a flat form.

The project uses **native RHF integration**: pass `zodResolver(schema)` to `useForm`, and RHF runs the schema on submit, fills `formState.errors`, and calls `onSubmit` only once the data is valid. `<FormInput>` renders each field's error inline.

## Schema conventions

- **File:** `src/features/<feature>/<feature>.schema.ts` (`members.schema.ts` for the members feature).
- **Schema export:** `<name>Schema` (e.g. `loginSchema`, `signupSchema`). A schema that depends on runtime input is a factory: `makeAuctionFormSchema(originalStart?, maxPricePaise?)`.
- **Type exports:** `export type <Name>FormValues = z.infer<typeof <name>Schema>`, used as the `useForm<...>` generic and the `onSubmit` argument. The auction form is the exception: its values are the hand-written `AuctionFormValues` interface, because the schema comes from a factory.
- **Mirror the backend:** schemas copy bids-api's validation (comments in `auth.schema.ts`, `auctions.schema.ts`, `admin.schema.ts` say so), so the client rejects bad input before it hits the API.
- **Normalize in the schema** with `.trim()` and `.toLowerCase()` (emails). The transformed value is what reaches `onSubmit`.
- **Constrain with chained checks** (`.min` / `.max` / `.email` / `.regex` / `.refine`), each with a human-readable message. That message is exactly what shows under the field.
- **Money and numbers are strings in the form** (what an `<input>` holds), validated with `.refine(Number…)` and converted to paise or basis points by a helper (`toWritePayload`, `formToSettings`) right before the mutation.

## Schema catalog

| File | Exports | Used by |
|---|---|---|
| `features/auth/auth.schema.ts` | `passwordField`, `loginSchema`, `signupSchema`, `forgotPasswordSchema`, `resetPasswordSchema`, `changePasswordSchema` + `…FormValues` types | `/login`, `/signup`, `<ForgotPasswordFlow>` (both steps), `<ChangePasswordCard>` |
| `features/members/members.schema.ts` | `profileSchema`, `ProfileFormValues` | `<ProfileEditCard>` |
| `features/auctions/auctions.schema.ts` | `makeAuctionFormSchema`, `AuctionFormValues`, `republishSchema`, `RepublishValues`, helpers (`toWritePayload`, `defaultFormValues`, `resolveWindow`, `combineDateTime`, `rupeesToPaise`, `paiseToRupees`, `DURATION_PRESETS`) | `<AuctionForm>` (create / edit), `<RepublishDialog>` |
| `features/admin/admin.schema.ts` | `marketplaceSchema`, `MarketplaceValues`, `categoryNameSchema`, `settingsToForm`, `formToSettings`, `bpsToPercent`, `percentToBps`, `paiseToRupeesStr`, `rupeesToPaiseNum` | `/admin/settings` Marketplace tab (`marketplace-settings.tsx`) |
| `features/legal/legal.schema.ts` | `legalPagesFormSchema`, `LegalPagesFormValues` | no form at present (see Notes) |

## Reference: `auth.schema.ts`

```ts
import { z } from '@/lib/zod';

const emailField = z.string().trim().toLowerCase().email('Enter a valid email');

// Mirrors the API rule: 8-72 characters (bytes), at least one letter and one number.
export const passwordField = z
  .string()
  .min(8, 'At least 8 characters')
  .refine((v) => new TextEncoder().encode(v).length <= 72, 'At most 72 characters')
  .regex(/[A-Za-z]/, 'Include at least one letter')
  .regex(/\d/, 'Include at least one number');

const codeField = z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit code');

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, 'Password is required'),
});

export const signupSchema = z
  .object({
    name: z.string().trim().min(2, 'Name is required').max(200),
    email: emailField,
    password: passwordField,
    confirmPassword: z.string().min(1, 'Confirm your password'),
    terms: z.literal(true, { error: 'You must accept the Terms and Conditions to continue' }),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });

export const forgotPasswordSchema = z.object({ email: emailField });
// resetPasswordSchema: { code: codeField, password: passwordField, confirmPassword } + the same match refine
// changePasswordSchema: { currentPassword, newPassword: passwordField, confirmPassword } + match refine on newPassword
```

Notes on this schema:
- `emailField` and `passwordField` are shared constants, so login, signup, forgot / reset and change password stay in sync. `passwordField` counts **bytes** (`TextEncoder`), matching the API's 72-byte limit, so multi-byte characters count more than once.
- `email` chains `.trim().toLowerCase().email(...)`: normalization happens before the format check, and the cleaned value is submitted.
- There is no `role` field: every signup is a MEMBER (a `role` sent by an old client is stripped by zod, and the form does not send one). `terms` must be exactly `true` (the checkbox).
- The password-match refine puts its error on `confirmPassword` via `path`.
- The email OTP itself (signup verify, login's unverified-email branch) is not a zod form: `<VerifyEmailStep>` keeps the code in `useState` and submits it from `<OtpStep>`. The reset-password step does validate its code with `codeField` (6 digits).

## Reference: `auctions.schema.ts`

- `makeAuctionFormSchema(originalStart?, maxPricePaise = DEFAULT_MAX_PRICE_PAISE)` builds the create / edit schema. Field rules: title 5-120 characters; description 20-10,000 characters with at least 10 characters of text once HTML tags are stripped (it comes from the rich-text editor); category required; condition `NEW` / `USED`; 1-8 images; starting bid ₹1 to the platform maximum (`maxPricePaise` from public settings, default ₹10 crore); minimum increment blank, or ₹1 up to the same maximum. `marketplaceSchema` (admin) adds `maxPriceRupees` (₹1,000 to ₹1,000 crore, rupees in the form, paise on the wire).
- A `superRefine` checks the time window: a scheduled start must be chosen and not in the past (2-minute grace; when editing, an unchanged `originalStart` is allowed even if it has passed), a custom end must be chosen, and the auction must run between 1 hour and 30 days. Preset durations (`'1' | '3' | '7'` days) are added to the start by `resolveWindow()`.
- `toWritePayload(values)` converts rupee strings to paise, omits `minIncrementPaise` when blank (the server default applies) and turns the window into ISO `startTime` / `endTime`. `defaultFormValues(auction?)` gives an empty form, or prefills from an existing auction with `duration: 'custom'`.
- `republishSchema` validates the republish dialog's four date / time fields with the same past-start and 1 hour to 30 days rules.

## Reference: `admin.schema.ts`

`marketplaceSchema` validates the admin Marketplace settings: commission 0-30 % with at most 2 decimals, minimum increment at least ₹1 with at most 2 decimals, anti-sniping window 0-30 whole minutes, and 1-30 unique categories. `settingsToForm()` / `formToSettings()` convert between the API's `{ commissionRateBps, minIncrementPaise, antiSnipingMinutes, categories }` and the string form values. The categories list is edited through a `<Controller>`-driven `CategoriesEditor`, which validates each new name with `categoryNameSchema` (2-40 characters) before adding it.

## Wiring with react-hook-form

`useForm` takes `resolver: zodResolver(schema)` and the form-values type as its generic. Spread `register('field')` onto `<FormInput>` and pass `formState.errors.<field>?.message` as `error`.

```tsx
// src/app/(auth)/login/page.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginFormValues } from '@/features/auth/auth.schema';
import { authErrorMessage } from '@/features/auth/auth.errors';
import { useLogin } from '@/features/auth/use-auth';

const login = useLogin();
const form = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

const onSubmit = (values: LoginFormValues) =>
  login.mutate(values, {
    onError: (e) => {
      if (apiErrorCode(e) === 'EMAIL_NOT_VERIFIED') { /* switch to <VerifyEmailStep> */ return; }
      if (apiErrorCode(e) === 'ACCOUNT_SUSPENDED') return; // the interceptor redirects to /suspended
      toast.error(authErrorMessage(e, 'Could not log in'));
    },
  });

<form onSubmit={form.handleSubmit(onSubmit)} noValidate>
  <FormInput label="Email" type="email" error={form.formState.errors.email?.message} {...form.register('email')} />
  <FormInput label="Password" type="password" error={form.formState.errors.password?.message} {...form.register('password')} />
  <Button type="submit" loading={login.isPending || login.isSuccess}>Log in</Button>
</form>
```

Forms set `noValidate` so the browser's own validation bubbles do not compete with zod's messages.

Two layers of error handling, by design:

1. **Shape errors (client):** `zodResolver` validates on submit; `handleSubmit` calls `onSubmit` only when valid, otherwise it fills `formState.errors`, rendered inline by `<FormInput error=...>`.
2. **Server errors:** once the shape is valid the mutation fires. A backend rejection is shown with `toast.error(<feature>ErrorMessage(e, '<fallback>'))` in the mutation's `onError`. When the error belongs to one field, also put it there with `form.setError`: signup does this for `EMAIL_TAKEN` on `email`.

To keep a form in sync with fetched data, pass it as `values` rather than calling `reset()` in an effect: `<ProfileEditCard>` uses `values: { name, phone, address }` from the auth store. `<AuctionForm>` and the Marketplace tab seed `defaultValues` once instead.

## How `<FormInput>` surfaces errors

`src/components/common/form-input.tsx` is a `forwardRef` wrapper over `<Input>` built to take RHF's `register()` spread and `errors.<field>?.message`:

- Props: `label?`, `error?`, `required?`, `hint?`, `icon?` (leading icon inside the field), `prefix?` (leading display-only text such as "+91"), plus everything `InputProps` accepts. The forwarded `ref` and `name` / `onChange` / `onBlur` come from `register(...)`.
- The input id is `id ?? props.name ?? useId()`, so the `<Label htmlFor>` is always tied to the field.
- `required` renders a red `*` after the label.
- `type="password"` adds a show / hide eye button (`aria-label` "Show password" / "Hide password").
- When `error` is set, the input gets `aria-invalid` and a `<p class="text-xs text-destructive">` below it. Otherwise `hint` renders in muted text. The error always wins.

The full loop: zod message -> `formState.errors.field.message` -> `<FormInput error=...>` -> red text under the field, with `aria-invalid` for assistive tech.

## Notes

- **Not every form uses zod.** `<VerifyEmailStep>` (one OTP value) and the admin legal-page editor (`LegalEditor` in `legal-settings.tsx`: a title input and a rich-text body kept in `useState`, with an inline "Title is required" check) validate inline. Reach for a schema when the form is a set of fields validated as one shape.
- **`legalPagesFormSchema`** (`{ contents: Record<slug, html> }`) is covered by `misc-schemas.test.ts` but no form uses it; the legal editor saves one page at a time without it.
- **Inferred types flow end to end:** `z.infer` -> `useForm<...>` -> `onSubmit(values)` -> mutation payload. Keep the schema and the `*.api.ts` input type in agreement (e.g. `ContactFormValues` is `sendContact`'s parameter type).
- **Tests:** `auth.schema.test.ts`, `auctions.schema.test.ts` and `misc-schemas.test.ts` (contact, profile, legal, marketplace) cover the rules and the "Required" copy from `@/lib/zod`. See `readme/methods/testing.md`.
- **Add a new schema:** create or extend `src/features/<feature>/<feature>.schema.ts` with `import { z } from '@/lib/zod'`, export `<name>Schema` + `<Name>FormValues`, use `useForm<...>({ resolver: zodResolver(...) })` in the form, spread `register()` onto `<FormInput>` with `error={errors.field?.message}`, and add a test next to the schema.

### Reference files

- `src/lib/zod.ts`
- `src/features/auth/auth.schema.ts` (canonical)
- `src/features/auctions/auctions.schema.ts` (factory schema, time-window refine, rupee strings)
- `src/features/admin/admin.schema.ts`, `src/features/members/members.schema.ts`
- `src/app/(auth)/login/page.tsx`, `src/app/(auth)/signup/page.tsx` (wiring)
- `src/components/common/form-input.tsx` (error rendering)

*Last updated: 2026-11-15 (rewritten against the current code: email + password auth schemas, auction / republish / marketplace / profile / contact schemas, verified Zod 4 refine behaviour)*
