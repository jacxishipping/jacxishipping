// Some hosting environments (e.g. the v0 preview sandbox) inject this project's
// secrets only under a `_2`-suffixed name (NEXTAUTH_SECRET_2, RESEND_API_KEY_2, ...)
// while the application code reads the canonical, un-suffixed name. This side-effect
// module runs at the earliest import and back-fills each un-suffixed variable from
// its `_2` counterpart when the canonical one is missing. In production, where the
// canonical names exist, this is a no-op because we never overwrite a set value.
function backfillSuffixedEnv() {
  try {
    for (const key of Object.keys(process.env)) {
      if (!key.endsWith("_2")) continue;
      const base = key.slice(0, -2);
      if (!base) continue;
      const value = process.env[key];
      if (value && !process.env[base]) {
        process.env[base] = value;
      }
    }
  } catch {
    // process.env may be read-only in some runtimes; inline fallbacks cover those cases.
  }
}

backfillSuffixedEnv();

export {};
