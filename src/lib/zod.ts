import { z } from 'zod';

// Import `z` from here, not from 'zod', so this config is always applied first.
//
// Zod 4 changed its built-in messages: a missing value went from "Required" to
// "Invalid input: expected string, received undefined", and an empty enum
// select to "Invalid option: expected one of …". Our schemas set their own
// messages almost everywhere; these defaults only surface for a field that has
// no value at all, and those used to read "Required". Keep it that way.
z.config({
  customError: (issue) => {
    if (issue.input === undefined || issue.input === '') {
      if (issue.code === 'invalid_type' || issue.code === 'invalid_value') return 'Required';
    }
    return undefined; // fall back to the schema's own message, then Zod's default
  },
});

export { z };
