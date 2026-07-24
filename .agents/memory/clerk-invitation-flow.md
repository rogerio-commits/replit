---
name: Clerk invitation ticket flow blocked
description: Why Clerk email invitations (tickets/accept) don't work here and what to use instead
---
Clerk's email-invitation ticket flow does not work through the Replit-managed Clerk proxy: the emailed link hits `/v1/tickets/accept` via the FAPI proxy and returns 403 in production, even with the canonical proxy middleware (selfHandleResponse + buffering) deployed.

**Why:** Confirmed empirically — fresh deploy with the fixed proxy still 403'd on a newly created invitation. The ticket-acceptance endpoint appears blocked/unsupported in the proxied setup.

**How to apply:** Never use `clerkClient.invitations.createInvitation` in this project. Team invites are app-managed: a row in `invitesTable` + JIT role assignment in `requireAuth` matched by e-mail on first sign-in. Invitees just sign up at `/sign-up` with the invited e-mail (link is copyable in the Equipe page; Resend e-mail is best-effort and requires RESEND_API_KEY, which may be unset).
