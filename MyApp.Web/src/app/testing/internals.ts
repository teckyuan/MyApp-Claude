/** Lets specs reach `protected` members (template-facing state and handlers) without per-line casts. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const internals = (component: object): any => component;
