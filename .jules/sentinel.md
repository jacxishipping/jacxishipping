## 2025-02-28 - [Prevent Server-Side Request Forgery]
**Vulnerability:** Found an SSRF vulnerability where URLs were blindly fetched on the server in `src/app/api/photos/download/route.ts`.
**Learning:** External URL parameters used in API routes can easily lead to SSRF if not strictly validated against an allowed list of trusted domains.
**Prevention:** Implement an allowlist using native `URL` parsing to strictly validate the hostname against trusted origins, being careful about exact domain matching or strict subdomain matching logic, and enforce the HTTPS protocol.
