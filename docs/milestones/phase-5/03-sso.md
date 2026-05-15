# Step 3: SSO & OAuth

> **When:** Week 4
>
> **Goal:** Enterprise clients can log in with their company's identity provider. Everyone else gets Google and Apple social login.

---

## Social login (all plans)

Google and Apple OAuth on the login and signup pages. Uses Supabase Auth providers — straightforward to add. Users who sign in with Google get their org matched by email domain if one already exists.

---

## SSO for enterprise

Enterprise clients often require that all their employees log in through the company's identity provider — Okta, Microsoft Entra, Google Workspace. SAML 2.0 and OIDC cover the major providers.

Each enterprise org gets one SSO config. When enabled, password login is disabled for that org — everyone must go through the IdP.

```sql
CREATE TABLE sso_configs (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id        uuid REFERENCES organizations(id) UNIQUE NOT NULL,
  provider      text NOT NULL,      -- 'saml' | 'oidc'
  entity_id     text,               -- SAML entity ID
  sso_url       text,               -- IdP SSO endpoint
  certificate   text,               -- IdP signing certificate
  oidc_issuer   text,               -- OIDC issuer URL
  oidc_client_id text,
  oidc_client_secret text,          -- encrypted at rest
  attribute_mapping jsonb,          -- maps IdP claims to Seenly fields
  enabled       boolean DEFAULT false,
  created_at    timestamptz DEFAULT now()
);
```

**Flow:**
1. User hits the login page, types their email
2. Seenly checks if the email domain matches an org with SSO enabled
3. If yes, redirect to the IdP
4. IdP authenticates, sends back a SAML assertion or OIDC token
5. Seenly creates or updates the user profile, creates a session

**Just-in-time provisioning:** If a user authenticates via SSO but doesn't have a Seenly account yet, create one automatically. Assign the default role set in the SSO config.

---

## Done when

- [ ] Google OAuth on login/signup
- [ ] Apple OAuth on login/signup
- [ ] `sso_configs` table with migration
- [ ] SAML 2.0 flow working end-to-end with at least one IdP (Okta)
- [ ] OIDC flow working end-to-end
- [ ] SSO enforced for orgs with it enabled (password login disabled)
- [ ] Just-in-time provisioning creates accounts on first SSO login
- [ ] SSO setup UI in org settings (admin only)
