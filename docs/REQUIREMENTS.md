# Project Overview

Welcome new Tech Leads!!

You are all super talented leaders and programmers and we can't wait for you to begin leading your teams. Before we get to September we want to introduce two onboarding projects. The first is outlined in this document and the second one will be released later this summer. It is required for you to complete both projects before you begin your role as a Tech Lead for JumboCode.

This summer's first project will be built using a fairly familiar JumboCode tech stack (see details in the [Technical Criteria](#required-technical-criteria) section). The theme and general information for the first project is as follows:

## Theme

Make a Hacknight game! This can be anything you think would be fun to play at hacknight or within your own JumboCode team. The goal is that you will actually be able to use this game for the upcoming school year.

**Some tips:**

- Since we require you to have user logins (see the Technical Criteria) it might be useful to think of games that would require an "admin" role and "users"/"teams" role. But don't overthink it, you can also just have people login to access the game – this does not have to be a critical feature.
- Remember the goal is to help yourself out – it is better to learn now what works for you as a TL rather than during the school year.
- Have fun!

## FAQs

**Who should I contact with any questions?**
Slack William Goldman and Ha Nguyen on the 2025-26 JumboCode Slack

**Can I use AI?**
Yes!

**Do I need to set up my own account for sites such as Vercel, Supabase, etc?**
Yes!

---

# Required Technical Criteria

## VS Code

- Please use VSCode as your IDE for this project
- Feel free to use Cursor, Claude Code, Github Copilot or other AI tools as an alternative or within VSCode.
- Yes, these tools are all acceptable and are encouraged! Please reach out if you have any questions setting these up. Cursor is still available for free with your tufts .edu account.

## Frontend

- Must use React, TypeScript, and Tailwind CSS.
- Can use any framework built on React, such as Next.js or Vite.

## GitHub

- Must use GitHub for version control
- Can choose GitHub Desktop or Git to manage the codebase

**Getting started:**

- In your codebase you are required to create and use Issue and Pull Request (PR) templates. This will be a practice that will be enforced for all project code bases during the school year as well.
- To set up Issue and PR templates, see the [Template Setup Guide](#template-setup-guide) below.

**Create a README:**

- Edit your README.md file so that it includes instructions for how to run a dev and build server for your application. Include any other helpful information for yourself (remember a README is the document devs will be seeing every time they open the project's codebase!).

**Setting up Playwright for lint-checking:**

- Similarly to the required issue and PR templates, this year we will also be requiring the use of Playwright to help TLs manage their code.
- To set up Playwright in your codebase, see the [Playwright Setup Guide](#playwright-setup-guide) below.

**Branch Naming Convention:**

- When creating a new branch, name it in the format `[topic]/[feature]`. For example when working on a scheduling feature, complete the work on a branch called something like `feature/calendar-scheduler`.

## Deployment

- The app must be deployed and accessible through a live URL.
- Local-only projects do not satisfy this requirement.

## Backend

- Backend choice is flexible.
- The Tech Lead must be able to justify their backend choice.
- Examples: Next.js API routes, Express, FastAPI, etc.

## Database / Persistence

- Data must be persistent.
- Refreshing the page or restarting the app should not erase the data.
- The project should use a real database or backend persistence service.
- Examples: Supabase, Neon, etc.
- **NOTE:** We also HIGHLY recommend using Prisma or Drizzle to define database schema. This will make development more streamlined.

## Authentication

- The app must support user sign up and log in.
- At least one feature should depend on the authenticated user.

## CRUD Operations

- The app must support create, read, update, and delete operations for at least one core data model.
- Example: tasks, posts, events, products, reservations, users, etc.

## Security

- No secrets committed to GitHub
- No plaintext passwords
- Backend-enforced authorization
- Backend input validation
- Safe database queries
- No console logs that expose data

## Deployment (Platform)

- Use Vercel! You will need to set up your own personal account (which is free to do).

---

# Best Practices

It is important to develop this project in a similar manner to how your devs will be working during the school year. You should follow the branch naming conventions, create pull requests when merging your branches in (but you can be brief with these), and delete branches once they are merged into the main branch.

**Comment your code!**

- This can be done with AI but observe the caution below on AI slop comments.
- You are required to have a header comment at the top of each file that describes the intended functionality of the page/component/route/etc.
- Comments should be dispersed throughout the rest of the file at your discretion.

**Use AI the way you want your devs to use it** – try to put in some sort of prompt guardrails with every context window. For example, saying something like:

> "When you respond to me, do not agree with me about everything. You should not make any assumptions and instead should ask clarifying questions whenever you are unsure about something. Any code that you produce should maintain a maximum of 80 char width/limit and all comments should be precise and accurate. Do not write excessive comments. There should be no emojis in the code. For any code that requires packages or other imports, it is critical that you look online for the latest documentation."

...will drastically improve the performance of your vibe-coding. A prompt message like this can be shared with devs at the start of the school year to help them decrease AI slop as well.

---

# Template Setup Guide

See GitHub's documentation for a complete, detailed description of how to create templates:

- Pull Request template
- Issue template

Some suggested (albeit a bit long) formats:

### Pull Request Template

````markdown
## Summary

<!-- What does this PR do, in a sentence or two? -->

## Related Issue

Closes #

## Affected User Role(s)

<!-- Which roles can see or are impacted by this change? -->

- [ ] Guest / unauthenticated
- [ ] Standard user
- [ ] Admin
- [ ] All roles
- [ ] Other (specify):

## Description of Changes

<!-- Walk through what changed and why. -->

## Screenshots

## API Changes (if applicable)

- Endpoint: `METHOD /path/to/endpoint`
- Request shape:
  ```json

  ```
````

- Response shape:
  ```json

  ```
- Auth/permissions required:

## Database Changes (if applicable)

- [ ] Migration included
- [ ] Migration tested locally
- Summary of schema change:

### Testing performed

1.
2.
3.

## Checklist

- [ ] No console errors/warnings introduced
- [ ] Documentation updated (if applicable)
- [ ] No secrets or sensitive data committed

## Additional Notes

````

### Issue Template

```markdown
# Title:
### Assigned To:

## Summary

## Affected User Role(s)
- [ ] Guest / unauthenticated
- [ ] Standard user
- [ ] Admin
- [ ] Other (specify):

## Steps to Reproduce
1.

## Expected Behavior
<!-- What should have happened -->

## Actual Behavior
<!-- What actually happened -->

## Screenshots

## Additional Context
<!-- Error logs, console output, related issues, anything else useful -->
````

---

# Playwright Setup Guide

See the Playwright documentation for general overview and setup: https://playwright.dev/docs/ci-intro

**Goal:** Add end-to-end (often seen as E2E) tests for auth, list/create/edit/delete/etc flows.

## Installation

From a Next.js app root:

```
npm init playwright@latest
```

(if using npm)

**Choose:**

- TypeScript
- `tests/` or `e2e/` folder
- Add GitHub Actions workflow: Yes
- Install browsers: Yes

**Add scripts to `package.json`:**

```json
"test:e2e": "playwright test"
"test:e2e:ui": "playwright test --ui"
```

## Typical `playwright.config.ts`

- `baseURL`: `http://localhost:3000`
- `webServer`: start the app before tests
  - `command`: `"npm run build && npm run start"` (or `"npm run dev"` for faster local runs)
  - `url`: `"http://localhost:3000"`
  - `reuseExistingServer`: `!process.env.CI`
- `retries`: 1–2 in CI only
- `trace`: `"on-first-retry"` (helps debug CI failures)

**Example `webServer` block:**

```typescript
webServer: {
  command: 'npm run build && npm run start',
  url: 'http://localhost:3000',
  reuseExistingServer: !process.env.CI,
  timeout: 120_000,
},
```

## Environment Variables

- E2E tests need the same env vars as the app
- In GitHub Actions, pass secrets into the test job env block.

## Auth

- There are a few ways to go about setting up authentication testing in Playwright. We recommend using existing helpers built into Clerk or the supabase-js SDK if you are using either of those.
- Also, definitely create dedicated test users (as in fake emails/accounts you can test with)
  - E.g., `member@test.example.com`
  - E.g., `admin@test.example.com`

## Test Data

- Set up a branch within your database to run the testing on. This is important to avoid overwriting important existing data.

## Integrating GitHub Actions

Since we had you respond with "Yes" to the "Add GitHub Actions workflow" prompt when installing Playwright, you will get a `.github/workflows/playwright.yml` file in your codebase.

**A typical `playwright.yml` file:**

```yaml
name: Playwright
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    env:
      DATABASE_URL: ${{ secrets.DATABASE_URL }}
      # ... other secrets
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

## Running Tests Locally

```
npm run dev           # this is a normal run, no tests
npm run test:e2e      # run all tests
npm run test:e2e:ui   # debug with UI mode
```

**View last HTML report:**

```
npx playwright show-report
```

## What to Add to `.gitignore`

```
/test-results/
/playwright-report/
/playwright/.cache/
/playwright/.auth/     # saved login cookies
```

## File Layout Overview

```
e2e/
  auth.setup.ts          # login once, save storageState
  crud.spec.ts           # create/read/update/delete flows
playwright.config.ts
.github/workflows/playwright.yml
```

Happy testing!
