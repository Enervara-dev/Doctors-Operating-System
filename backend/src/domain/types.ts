/**
 * Single import surface for the shared domain contract.
 *
 * The API and the frontend compile against the exact same type definitions in
 * `/types`. These are declaration-only re-exports, so nothing is emitted at
 * runtime and the backend has no build-time coupling to the Next.js app.
 */
export type * from "../../../types";
