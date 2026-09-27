# Hannaford Shopping List Manager

A personal, single-user tool for reviewing Hannaford purchase history and monthly grocery spending. Built with Next.js, React, TypeScript and Puppeteer.

**Run only on your own computer. This is an experimental local tool, not a hosted service or production-ready authentication system.** It is not affiliated with Hannaford. Site changes can break scraping; live account access has not been validated by CI.

## Setup

Use Node.js 22 LTS and npm, plus a Hannaford account that you own.

```sh
git clone https://github.com/andreipdev/hannaford-orders.git
cd hannaford-orders
npm ci
npm run start:hannaford
```

The terminal prompts for your username and a hidden password, then starts the app at **http://127.0.0.1:3000**. Credentials are passed through the server process environment, not newly written to disk. Close the server when finished. A browser window opens for account login; complete any verification yourself.

If you previously used this tool, the old startup script may have left credentials in `.env.local`. Remove that file yourself if you no longer want the saved credentials. The new script does not delete or rewrite existing files. Next.js still supports reading an existing `.env.local` when you run `npm run dev` directly; such files contain unencrypted text.

## Privacy and access limits

- Standard development and production start commands bind to `127.0.0.1`.
- API routes require a local Host, a matching browser Origin when present, and a custom request header. These are safeguards against foreign websites and accidental exposure, **not authentication against other users or programs on your computer**.
- Do not publish the app through a tunnel, reverse proxy, public host or shared server. Hosting would require proper authentication, authorization, secure credential storage and a separate security review.
- `.chrome-profile/` can contain login cookies; `.cache/` contains purchase data. Both, along with environment files, are ignored by Git. They are not encrypted by this application. Protect your operating-system account and disk, and do not share these directories or terminal logs.
- The application returns purchase data with `Cache-Control: no-store` and does not send detailed scraper errors to the browser.

## Architecture

The React page requests purchase data from a local Next.js API route. The route uses the server's credentials to run Puppeteer, which reads the account's order history. Local cache files reduce repeated scraping. Category and price configuration supports monthly summaries; default prices are estimates, not a bank statement.

Coupon clipping is currently unimplemented and its endpoint returns HTTP 501.

## Checks

```sh
npm test
npm run typecheck
```

GitHub Actions runs these checks without real credentials or contacting Hannaford. Request-policy tests cover normal local access, foreign origins, unexpected hosts and missing custom headers. They do not verify the live login flow or guarantee the safety of a public deployment.

The dependency stack and scraper remain experimental. Before presenting this as production software, review dependencies, test current account flows and add data-processing coverage. Contributions and reproducible bug reports are welcome.
