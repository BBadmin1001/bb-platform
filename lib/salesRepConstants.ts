/**
 * Constants shared between the master UI (client-side) and the server
 * actions for the per-client link generator. Lives outside the
 * "use server" file so it can be a plain const export — Next.js
 * action files only allow async function exports.
 */

/** Platform floor — sales reps cannot price a deal under this. */
export const SETUP_FEE_MIN_CENTS = 60000; // $600.00
