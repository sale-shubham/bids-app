# Zod Form Validation

Form shapes are validated with [zod](https://zod.dev), wired into [react-hook-form](https://react-hook-form.com) via `@hookform/resolvers/zod`. Schemas live in `src/features/<feature>/<feature>.schema.ts` (one schema file per feature). `src/features/auth/auth.schema.ts` is the canonical reference.

> **Zod 4 (2026-10-20):** import `z` from **`@/lib/zod`**, never from `'zod'`. That module calls `z.config()` so a field with no value still reads **"Required"** — Zod 4's own defaults are "Invalid input: expected string, received undefined" / "Invalid option: expected one of …". Custom messages passed to `.min()`, `.regex()`, `addIssue()` etc. are unaffected (checked against Zod 3 on every schema in `src/features`). Two Zod 4 behaviours to know:
> - **Refinements are skipped once another field has failed.** `business.schema.ts` passes `{ when: () => true }` to `.superRefine(phoneRefine, …)` so the phone error still shows on the first submit with everything else, as in Zod 3. Do the same for any cross-field refine whose message the user must see up-front.
> - **`.default()` makes a field's input type optional**, and `@hookform/resolvers` 5 types a resolver by input and output separately, so `zodResolver(schema)` stops fitting `useForm<FormValues>`. `business.schema.ts` exports `registerBusinessResolver` / `updateBusinessResolver`, typed to the output (the forms seed every field). `literal(…, { error })` replaces `errorMap`. Resolver package: `@hookform/resolvers` 5.x (6.x has an unresolvable optional-peer tree).

## Purpose

> **Hard rule (`CLAUDE.md`):** form validation uses zod schemas in `src/features/<feature>/<feature>.schema.ts`, wired via react-hook-form + `@hookform/resolvers/zod`. Do not introduce yup/ajv/vest, and do not hand-roll validation in components.

Unlike a manual `parseWithZod` helper, this project uses **native RHF integration**: pass `zodResolver(schema)` to `useForm`, and RHF runs the schema on submit, populates `formState.errors`, and blocks `onSubmit` until the data is valid. `<FormInput>` then renders each field's error inline.

## Schema conventions

- **File:** `src/features/<feature>/<feature>.schema.ts`.
- **Schema export:** `<name>Schema` (e.g. `loginSchema`, `registerSchema`).
- **Type exports:** `export type <Name>FormValues = z.infer<typeof <name>Schema>` — the inferred type is the generic for `useForm<...>` and the `onSubmit` argument.
- **Single source of truth for shape:** schemas are written to **mirror the backend's validation** (the comment in `auth.schema.ts` notes this explicitly), so the client rejects bad input before it hits the API.
- **Normalize in the schema** with zod transforms: `.trim()`, `.toLowerCase()` (emails), `.toUpperCase()` (GSTIN). The transformed value is what RHF passes to the mutation.
- **Constrain with chained refinements:** `.min`/`.max`/`.length`/`.email`/`.regex`, each with a human-readable message as the second argument — that message string is exactly what surfaces under the field.

## Reference: `auth.schema.ts` (no password — mobile/email + OTP only)

```ts
import { z } from '@/lib/zod';

const mobileField = z
  .string()
  .trim()
  .min(1, 'Mobile number is required')
  .regex(/^[0-9]{10}$/, 'Enter a valid 10-digit mobile number');

const emailField = z.string().trim().toLowerCase().email('Enter a valid email');

export const requestMobileOtpSchema = z.object({ mobile: mobileField });
export const requestEmailOtpSchema = z.object({ email: emailField });

export const otpCodeSchema = z.object({
  code: z.string().trim().min(4, 'Enter the code').max(8),
});

export const signupSchema = z.object({
  name: z.string().trim().min(2, 'Name is required').max(200),
  mobile: mobileField,
  email: emailField,
});

export type RequestMobileOtpFormValues = z.infer<typeof requestMobileOtpSchema>;
export type RequestEmailOtpFormValues = z.infer<typeof requestEmailOtpSchema>;
export type OtpCodeFormValues = z.infer<typeof otpCodeSchema>;
export type SignupFormValues = z.infer<typeof signupSchema>;
```

Notes on this schema:
- `mobileField`/`emailField` are shared module constants, reused across `requestMobileOtpSchema` and `signupSchema` (and `requestEmailOtpSchema`/`signupSchema` for email) so the two forms stay in sync.
- `email` chains `.trim().toLowerCase().email(...)` — normalization happens **before** the format check, and the cleaned value is submitted.
- There is no `password` field anywhere in this app — see `readme/flows/auth.md`.

## Reference: `business.schema.ts` (GSTIN + address/contact array fields)

```ts
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

const businessBaseSchema = z.object({
  companyName: z.string().trim().min(2, 'Required').max(200),
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  addresses: z.array(addressSchema).length(1, 'Exactly one address is required'),
  contacts: contactsSchema,
});

export const registerBusinessSchema = businessBaseSchema
  .extend({
    gstNumber: z.string().trim().toUpperCase().min(1, 'GST Number is required')
      .refine((v) => v.length === 15 && GSTIN_REGEX.test(v), 'Invalid GSTIN format'),
    documents: documentsMetaSchema,
  })
  .superRefine(phoneRefine, phoneCheck); // contacts[0].phone required + valid 10-digit number; phoneCheck = { when: () => true }

export const updateBusinessSchema = businessBaseSchema.superRefine(phoneRefine, phoneCheck);
```

Notes on this schema:
- `gstNumber` chains `.toUpperCase()` then a combined length+regex `.refine(...)` — the single message covers both failure modes.
- `phoneRefine` is a plain (non-generic) function reused by both `.superRefine()` calls — a generic wrapper would collapse TS's inference to the constraint type instead of each schema's full shape.
- This is the **Business registration** form (seller entity — GST/company data), not Member signup. See `readme/flows/business.md`. Member identity (`auth.schema.ts`) never has GST/address/contact fields.

## Wiring with react-hook-form

`useForm` takes `resolver: zodResolver(schema)` and the inferred form-values type as its generic. `register('field')` is spread onto `<FormInput>`, and `formState.errors.<field>?.message` is passed as the `error` prop.

```tsx
// src/app/(auth)/login/page.tsx (Mobile tab)
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { requestMobileOtpSchema, type RequestMobileOtpFormValues } from '@/features/auth/auth.schema';

const {
  register,
  handleSubmit,
  formState: { errors },
} = useForm<RequestMobileOtpFormValues>({ resolver: zodResolver(requestMobileOtpSchema) });

const requestOtp = useRequestOtp();
const onSubmit = (values: RequestMobileOtpFormValues) =>
  requestOtp.mutate({ channel: 'MOBILE', mobile: values.mobile }, {
    onError: (e) => toast.error(apiErrorMessage(e, 'Could not send OTP')),
  });

<form onSubmit={handleSubmit(onSubmit)}>
  <FormInput label="Mobile Number" type="tel" required error={errors.mobile?.message} {...register('mobile')} />
  <Button type="submit" loading={requestOtp.isPending}>Send OTP</Button>
</form>
```

Two layers of error handling, by design:

1. **Shape errors (client)** — `zodResolver` validates on submit; `handleSubmit` only calls `onSubmit` when valid, otherwise fills `formState.errors`. These render inline via `<FormInput error=...>`.
2. **Server errors** — once the shape is valid the mutation fires; a backend rejection is surfaced with `toast.error(apiErrorMessage(e, '<fallback>'))` in the mutation's `onError` (it is not a form-shape issue, so it is a toast, not an inline message).

The signup page (`src/app/(auth)/signup/page.tsx`) follows the identical pattern with `signupSchema` / `SignupFormValues` for its first (name/mobile/email) step.

## How `<FormInput>` surfaces errors

`src/components/common/form-input.tsx` is a `forwardRef` wrapper over the base `<Input>` designed to consume RHF's `register()` spread and `errors.<field>?.message`:

- Props: `label?`, `error?`, `required?`, `hint?`, plus everything `InputProps` accepts. The forwarded `ref` and the spread `...props` (`name`, `onChange`, `onBlur`) come straight from `register(...)`.
- `inputId = id ?? props.name` ties the `<Label htmlFor>` to the input.
- `required` renders a `<span class="text-destructive">*</span>` after the label.
- When `error` is set: `aria-invalid` is applied and a `<p class="text-xs text-destructive">{error}</p>` is shown below the field.
- When there is no `error` but a `hint` is provided, the hint renders instead (muted). Error always takes precedence over hint.

So the full loop is: zod message → `formState.errors.field.message` → `<FormInput error=...>` → red text under the field, with `aria-invalid` for accessibility.

## Notes

- **Not every schema mirrors a strict backend shape.** `legalPagesFormSchema` (`src/features/legal/legal.schema.ts`) is just `{ contents: Record<slug, html> }` — the admin legal-page editor stores free-form HTML per page slug, so there's nothing to constrain beyond "string, may be empty". It exists so the editor still goes through the standard `zodResolver` + react-hook-form wiring (hard rule 3) rather than hand-rolled state.
- **Array fields use `useFieldArray`.** `addressSchema`/`contactsSchema` (in
  `src/features/members/member.schema.ts`) back the reusable
  `<AddressFields>` / `<ContactFields>` (`src/components/common/member-fields.tsx`) which wrap
  `useFieldArray`. They are composed into `registerBusinessSchema` and `updateBusinessSchema`
  (`src/features/business/business.schema.ts`) and shared by the Business registration, Business
  edit, and admin Business-edit forms — not by Member auth, which has no address/contact fields.
  See `readme/ui/components.md`.
- **Profile name edit (2026-10-22).** `profileNameSchema` (`src/features/members/profile.schema.ts`, exported with `ProfileNameValues`) is `{ name: z.string().trim().min(1, 'Enter your name').max(200, 'Name is too long') }`, mirroring the backend's `updateMeSchema` for `PATCH /members/me`. It backs the Edit name dialog on the member Profile page (`profile-identity-card.tsx`), wired the standard way: `useForm({ resolver: zodResolver(profileNameSchema), defaultValues: { name } })`, `register('name')` spread onto `<FormInput>`. It sits in `features/members/` next to `member.schema.ts` because name is a Member field; the mutation itself (`useUpdateMyName`) lives in `features/auth/`.
- **Not every form uses zod.** Forms with complex, dependent local state — e.g. `src/features/listings/listing-form.tsx` (product select → dynamic spec fields → image uploads) — drive their own `React.useState` and validate inline. Reach for a zod schema when the form is a flat set of fields you want validated as one shape (auth is the prototype).
- **Inferred types flow end-to-end:** `z.infer` → `useForm<...>` generic → `onSubmit(values)` → mutation payload. Keep the schema and the `*.api.ts` payload interface in agreement.
- **Add a new schema:** create `src/features/<feature>/<feature>.schema.ts`, export `<name>Schema` + `<Name>FormValues`, then `useForm<...>({ resolver: zodResolver(...) })` in the form and spread `register()` onto `<FormInput>` with `error={errors.field?.message}`.

### Reference files

- `src/features/auth/auth.schema.ts` (canonical, no-password OTP forms)
- `src/features/business/business.schema.ts` (array fields + refinements)
- `src/features/members/profile.schema.ts` (single-field Profile name edit)
- `src/app/(auth)/login/page.tsx`, `src/app/(auth)/signup/page.tsx` (wiring)
- `src/components/common/form-input.tsx` (error rendering)

*Last updated: 2026-10-22 (added `profileNameSchema` (`src/features/members/profile.schema.ts`) for the Profile page's Edit name dialog)*
*Previously: 2026-10-20 (Zod 4 + `@hookform/resolvers` 5: `z` from `@/lib/zod`, `when` on the phone refine, output-typed business resolvers)*
*Previously: 2026-07-21 (replaced the fictitious email+password loginSchema/registerSchema with the real OTP-based auth.schema.ts and business.schema.ts references)*
