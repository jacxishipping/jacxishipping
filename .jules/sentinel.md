## 2025-02-28 - [Prevent Server-Side Request Forgery]
**Vulnerability:** Found an SSRF vulnerability where URLs were blindly fetched on the server in `src/app/api/photos/download/route.ts`.
**Learning:** External URL parameters used in API routes can easily lead to SSRF if not strictly validated against an allowed list of trusted domains.
**Prevention:** Implement an allowlist using native `URL` parsing to strictly validate the hostname against trusted origins, being careful about exact domain matching or strict subdomain matching logic, and enforce the HTTPS protocol.

## 2026-09-25 - [Strict Parameterization for Prisma SQL]
**Vulnerability:** Found uses of `$queryRawUnsafe` and `$executeRawUnsafe` which pose a high risk for SQL injection, as they rely on the caller to handle parameterization correctly.
**Learning:** While manual parameterization (e.g. `$1`) was used, these 'Unsafe' variants inherently bypass Prisma's built-in protections, making it far too easy for future code changes to accidentally introduce SQL injection via string concatenation.
**Prevention:** Strictly enforce the use of `$queryRaw` and `$executeRaw` alongside the `Prisma.sql` tagged template literal for all raw database queries to guarantee native parameterization and defend against injection.
## 2025-05-21 - Weak Random Number Generation (Math.random)
**Vulnerability:** Weak Random Number Generation for security purposes. `Math.random()` was being used for generating reference numbers for dispatches, transits, and ledger transfers, as well as condition report numbers.
**Learning:** `Math.random()` is not cryptographically secure and its outputs can be predicted. Using it for unique identifiers or references poses a security risk, particularly in generating sensitive financial or workflow transaction IDs.
**Prevention:** Use cryptographically secure pseudo-random number generators (CSPRNG) from the native `node:crypto` module, such as `crypto.randomBytes()` or `crypto.randomInt()`, when generating any unique IDs, tokens, or references.

## 2025-10-18 - Replacing Math.random() with Web Crypto API
**Vulnerability:** Weak random number generation using `Math.random()` for assigning critical identifiers like IDs and report numbers, which poses a security/predictability risk.
**Learning:** `Math.random()` is not cryptographically secure and should not be used in contexts where collisions or predictablity matter, especially for IDs (`id` values) and transaction reference numbers (`reportNumber`).
**Prevention:** Enforce the use of the Web Crypto API, specifically `crypto.randomUUID()` for IDs and `crypto.getRandomValues()` for other random value needs, across both backend and frontend applications.
