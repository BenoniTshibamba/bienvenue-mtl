# MONETIZATION.md — Bienvenue 💰

How this free guide earns money. Every slot below is already placed in the UI;
"activating" a slot means replacing a plain official link with a tracked affiliate
URL and (where required) keeping the visible disclosure badge.

**Disclosure rule:** every affiliate link carries a visible
"Lien partenaire / Partner link" badge in the UI. Never remove it — it's the law
in Canada (Competition Bureau) and it keeps readers' trust.

## Slot inventory

### 1. `money-wise` — Wise (money transfer)
- **Where:** Money → "Envoyer de l'argent au pays / Send money home" partner card
- **Current:** plain link `https://wise.com`
- **Activate:** join the [Wise affiliate program](https://wise.com/affiliates)
  (or via Impact), get your referral URL, replace the `url` in the `partners`
  array in `frontend/src/content.js` (both `fr` and `en` entries with `slot: 'money-wise'`).
- **Why it fits:** newcomers sending money home is the #1 repeat transaction.

### 2. `money-remitly` — Remitly (money transfer)
- **Where:** same section, second partner card
- **Current:** plain link `https://remitly.com`
- **Activate:** join [Remitly affiliates](https://www.remitly.com/home/affiliates)
  (or via PartnerStack), replace the `url` for `slot: 'money-remitly'` in both languages.
- **Note:** having two transfer options lets readers compare — and lets you
  A/B test which converts better.

### 3. Newcomer banking (slot ready, not placed yet)
- **Idea:** a third partner card in the Money → "Ouvrir un compte / Open an account"
  section for a bank newcomer offer (e.g. Simplii, Tangerine, National Bank newcomer
  programs run affiliate/partner campaigns periodically).
- **Activate:** when you land a banking partner, add a third entry to the `partners`
  array with a new `slot` id (e.g. `money-bank`) and the same badge pattern.
- **Caution:** never state specific fees, rates, or bonus amounts — link to the
  bank's official offer page and let it speak.

### 4. Telecom / SIM (slot ready, not placed yet)
- **Idea:** partner card for a prepaid newcomer SIM (e.g. Public Mobile, Fizz referral
  programs) — newcomers buy a phone plan in week one.
- **Activate:** same pattern: new `partners` entry in a new "Téléphone / Phone" block
  or inside the checklist's phone item as a linked resource.

### 5. Display ads (Google AdSense)
- **Where:** not placed yet — recommended spots: below the hero on Home,
  between resource groups, bottom of Scams page.
- **Activate:** apply at [google.com/adsense](https://www.google.com/adsense/start/),
  add the AdSense script tag to `frontend/index.html`, and insert `<ins>` units
  in the chosen spots. Keep ads off the checklist — it must stay distraction-free.
- **Note:** AdSense needs meaningful traffic before approval; affiliates (1–4)
  pay from day one.

### 6. Sponsored guides (future)
- Immigration consultants (only licensed RCIC/lawyers), moving companies,
  French schools, and settlement-adjacent services will pay for honest sponsored
  placements. Keep the same badge pattern and label them clearly.

## Tracking

- Each partner card has a `data-affiliate-slot` attribute (e.g. `data-affiliate-slot="money-wise"`)
  so clicks can be measured later with any analytics tool.
- When you add a slot, document it here: slot id, partner, date activated.

## Activation log

| Date | Slot | Partner | Notes |
|------|------|---------|-------|
| — | — | — | No affiliate links active yet — all slots use plain official URLs. |

---
BUILT WITH LOVE AND CAFFEINE BY BB24
