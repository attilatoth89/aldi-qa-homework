# Task 1 – Manual testing: "Add to Shopping List" on aldi.us

- [1. Test basis: how the feature works today](#1-test-basis-how-the-feature-works-today)
- [2. Test case fields](#2-test-case-fields)
- [3. Test cases](#3-test-cases)
- [4. Further scenarios](#4-further-scenarios)
- [5. Bug report fields](#5-bug-report-fields)
- [6. Sample bug report](#6-sample-bug-report)
- [7. Observation from the exploratory session](#7-observation-from-the-exploratory-session)

## 1. Test basis: how the feature works today

Since March 2026 aldi.us has run on Instacart's storefront technology. On this platform the
shopping list belongs to the **In-Store** shopping mode. With Delivery or Pickup selected, the
product tiles add to the cart. With In-Store selected, they add to a shopping list that is
organised by where the products are in the chosen store. Before writing the test cases, I ran
a short exploratory session on the live site.

| Item | Observed on 21 Nov 2026 |
| --- | --- |
| Environment | Windows desktop, Google Chrome (private window), production `https://www.aldi.us` |
| Store / ZIP | ALDI - BAT 18 - Geneva, IL, ZIP 60174 (preselected by the site; the visit came from outside the US) |
| First visit | A **Cookie Notice** (Cookie Preferences / Reject All Non-Essential / Accept All) and the **"How would you like to shop?"** dialog (Delivery / Pickup / In-Store + Confirm). Both appear again in every new private session. |
| In-Store mode | The header shows "In-Store · open 9am - 8pm, ALDI - BAT 18 - Geneva, IL". The "View cart" button becomes a **list button with a counter**. Product tiles show an **"Add"** button with a list icon, the stock level ("Many in stock") and the **in-store location** ("Cooler Doors", "Canned Food"). |
| After "Add" | The button turns into a quantity stepper ("− 1 ct +"), which collapses into a "1 ct" badge. The header counter shows the number of **different products** (1 × butter + 3 × pumpkin = **2**). |
| Shopping list drawer | Title "Shopping list", buttons "Manage", "Order online" and "Sort". Items are **grouped by store location**. Every line has a checkbox, image, name, size, line price (sale price × quantity, with the regular price struck through) and quantity. The footer shows **Est. total** and **Est. savings**. |
| Guest (not signed in) | Products can be added **without signing in**. The list is **kept after a page reload (F5)**. |

| First visit (fresh private window) | In-Store mode, empty list |
| --- | --- |
| ![First visit: shopping mode dialog and cookie notice](images/01-first-visit-shopping-mode-and-cookie-notice.png) | ![In-Store mode with an empty list](images/02-in-store-mode-empty-list.png) |
| **Products added: stepper, location, counter** | **Shopping list drawer: groups, totals** |
| ![Products added to the list](images/03-products-added-quantity-stepper.png) | ![Shopping list drawer](images/04-shopping-list-drawer.png) |

**Scope:** adding products to the shopping list on the desktop website, and checking the result
in the list (quantities, grouping, prices, totals, persistence) for guests and signed-in customers.

**Out of scope:** checkout and payment, the mobile app, and the Delivery/Pickup cart. The cart
is only touched where it borders on the list (see [section 4](#4-further-scenarios)).

**Assumptions:**

- The test cases use the store and products I observed. Prices come from the weekly ad that was
  running on 21 Nov 2026, so the expected amounts are recalculated from the prices shown at
  execution time.
- Signed-in runs need a dedicated test account. The guest flows were verified in the
  exploratory session.
- No written requirements were provided. The requirement IDs (`US-LIST-01` … `03`) are
  illustrative user stories derived from the observed behaviour and the platform documentation,
  so that each test case shows what it traces to.

## 2. Test case fields

| Field | Why it is needed |
| --- | --- |
| **ID** | Unique, stable reference for traceability and defect linking (e.g. `TC-ASL-001`). |
| **Title** | One line that says what is verified. |
| **Feature / component** | Groups test cases and routes defects to the right team. |
| **Requirement / user story** | Traceability: which acceptance criterion the test proves (shows coverage gaps). |
| **Type** | Positive / negative, functional / non-functional – shows the balance of the suite. |
| **Priority** | Execution order under time pressure (smoke → regression). |
| **Preconditions** | System and user state before step 1, so every tester starts from the same point. |
| **Test data** | Exact inputs (store, products, account), so results are reproducible. |
| **Environment** | URL, browser/OS, device/viewport – many web defects are environment-specific. |
| **Steps + expected result per step** | Verifiable checkpoints: a failure points to the exact step. |
| **Expected result (overall)** | The pass criterion of the whole test case. |
| **Postconditions / cleanup** | Leaves the system ready for the next run (no leftover list items). |
| **Automation candidate** | Feeds the automation backlog (stable, repeatable, high value = automate). |
| **Execution fields** – actual result, status (Pass / Fail / Blocked / Not run), tester, date, build, defect ID, attachments | Filled in during each run. They are the audit trail and the evidence for the release decision. |

In a test management tool (e.g. Jira Xray) these map to the Test issue fields. The steps table
maps to the manual test steps (Action / Data / Expected Result).

## 3. Test cases

### TC-ASL-001 – Add a single product to the shopping list

| Field | Value |
| --- | --- |
| ID | TC-ASL-001 |
| Feature / component | Shopping list – "Add" on the product tile (In-Store mode) |
| Requirement | US-LIST-01: *As a shopper planning a store visit, I can add a product to my shopping list.* |
| Type | Functional, **positive** (happy path) |
| Priority | High – smoke |
| Preconditions | 1. Signed in as test customer `TEST_USER_A`. 2. Cookie consent already given. 3. The shopping list is empty (counter shows 0). |
| Test data | Store: ALDI - BAT 18 - Geneva, IL. Product A: *Countryside Creamery Salted Butter Quarters, 16 oz* (location "Cooler Doors"; $1.99, regular $2.89 on 21 Nov 2026). Any in-stock product can replace it. |
| Environment | Desktop Chrome (latest stable), Windows 11, 1920 × 1080, production aldi.us |
| Automation candidate | Yes – smoke test with a dedicated test account |

| # | Action | Expected result |
| --- | --- | --- |
| 1 | Click the shopping-mode selector in the header (top right). | The "How would you like to shop?" dialog opens with Delivery, Pickup and In-Store; the current mode is highlighted. |
| 2 | Select **In-Store** (ALDI - BAT 18 - Geneva, IL) and click **Confirm**. | The dialog closes. The header shows "In-Store · open … / ALDI - BAT 18 - Geneva, IL". The cart button changes to a list button with counter **0**. Tiles show "Add" with a list icon, a stock level and an in-store location. |
| 3 | Search for `salted butter` (field "Search products, recipes, and more") and press Enter. | Product A is in the results with its price, stock level and location "Cooler Doors". |
| 4 | Note the price of Product A, then click its **Add** button. | The button changes to the quantity stepper showing **1 ct**. The header counter changes from 0 to **1**. No sign-in prompt and no error message. |
| 5 | Click the list button in the header. | The **Shopping list** drawer opens. Product A is listed **once** under the heading **Cooler Doors**: checkbox unchecked, image, name, "16 oz", the price noted in step 4, quantity **1 ct**. |
| 6 | Check the drawer footer. | **Est. total** = the price of Product A. **Est. savings** = regular price − sale price ($0.90 on 21 Nov 2026), or $0.00 if the product is not on sale. |
| 7 | Close the drawer and reload the page (F5). | Still In-Store mode. The counter still shows 1 and the tile still shows "1 ct". |

- **Expected result:** Product A is on the shopping list exactly once, with quantity 1, the
  correct price and location, and the header counter shows 1.
- **Postconditions:** Remove Product A ("Manage" in the drawer, or "−" on the stepper), so the
  list is empty again.

### TC-ASL-002 – Attempt to add a product without being logged in

| Field | Value |
| --- | --- |
| ID | TC-ASL-002 |
| Feature / component | Shopping list – guest (anonymous) session, sign-in transition |
| Requirement | US-LIST-02: *A visitor can build a shopping list without an account; it is kept for the visit and not visible to anybody else.* Guest shopping is the platform default: guests can add items without logging in and only need an account to check out. |
| Type | **Negative** / access control: the user is not authenticated |
| Priority | High |
| Preconditions | No ALDI session. **Close every private window first:** Chrome shares one private session between all open private windows. Steps 8–10 also need test account `TEST_USER_B` with an empty list. |
| Test data | Product B: *ALDI Canned Pumpkin, 15 oz* (location "Canned Food"; $0.99, regular $1.79 on 21 Nov 2026) |
| Environment | Desktop Chrome (latest stable), private window, production aldi.us |
| Automation candidate | Yes – every Playwright test starts in a fresh, incognito-like browser context, which is exactly this precondition |

| # | Action | Expected result |
| --- | --- | --- |
| 1 | Open a new private window and go to `https://www.aldi.us`. | The page loads in a fresh session. The **Cookie Notice** and the **"How would you like to shop?"** dialog are shown. The header shows **Sign In / Register**, so the user is not signed in. |
| 2 | Click **Reject All Non-Essential**. | The Cookie Notice closes. Rejecting optional cookies must not break the site. |
| 3 | In the dialog select **In-Store** and click **Confirm**. | In-Store mode is active and the list counter shows **0**. "Sign In / Register" is still visible. |
| 4 | Click **Add** on Product B. | The product is added **without a sign-in prompt** (guest shopping is allowed). The tile shows "1 ct" and the counter shows **1**. A forced login or an error message here is a defect. |
| 5 | Reload the page (F5). | The guest list is kept for the session: counter 1, Product B still "1 ct", still In-Store mode. |
| 6 | Open the list drawer. | Product B is listed under **Canned Food** with quantity 1 ct, price and Est. total. The list contains no data of any other user. |
| 7 | Close **all** private windows, open a new one, go to aldi.us and choose In-Store again. | A new guest session starts with an **empty** list (counter 0). The previous guest's list is not visible (session isolation). |
| 8 | In this new session add Product B again, then click **Sign In / Register** and sign in as `TEST_USER_B`. | Sign-in succeeds and the user returns to the storefront in In-Store mode. |
| 9 | Open the list drawer. | Product B, added as a guest, is **kept**: it is now in the account's list (merged with the account's items, if there were any). Counter 1. |
| 10 | Sign out. | The list is no longer shown (counter 0), so the account's list is not exposed on a shared computer. |

- **Expected result:** A user who is not logged in can use the shopping list for the current
  session. No other session can see the list, and its items are not lost when the user signs in.
- **Postconditions:** Sign in as `TEST_USER_B` and clear the list; close the private windows.
- **Note:** Steps 8–10 can catch the defect described in [BUG-ASL-001](#6-sample-bug-report).

### TC-ASL-003 – Add multiple products and verify the shopping list

| Field | Value |
| --- | --- |
| ID | TC-ASL-003 |
| Feature / component | Shopping list – multiple items, quantities, grouping, price totals, persistence |
| Requirement | US-LIST-03: *The shopping list groups my items by store location and shows the quantity, line price, estimated total and savings.* |
| Type | Functional, **positive** (with calculation checks) |
| Priority | High – regression |
| Preconditions | Signed in as `TEST_USER_A`; In-Store mode at ALDI - BAT 18 - Geneva, IL; the list is empty. |
| Test data | See the table below (prices observed on 21 Nov 2026). |
| Environment | Desktop Chrome (latest stable), Windows 11, production aldi.us |
| Automation candidate | Yes – regression; expected totals are calculated from the prices on the tiles |

| Product | Location | Unit price (regular) | Quantity | Line price (regular) |
| --- | --- | --- | --- | --- |
| A – Countryside Creamery Salted Butter Quarters, 16 oz | Cooler Doors | $1.99 ($2.89) | 1 | $1.99 ($2.89) |
| B – ALDI Canned Pumpkin, 15 oz | Canned Food | $0.99 ($1.79) | 3 | $2.97 ($5.37) |
| C – Countryside Creamery Sweet Cream Unsalted Butter – 4 Sticks, 16 oz | Cooler Doors | $1.99 ($2.89) | 1 | $1.99 ($2.89) |
| **Expected totals** | | | | **Est. total $6.95, Est. savings $4.20** |

| # | Action | Expected result |
| --- | --- | --- |
| 1 | Click **Add** on Product A. | A shows "1 ct"; the counter shows **1**. |
| 2 | Click **Add** on Product B, then **+** twice on its stepper. | The stepper shows 2 ct, then **3 ct**. The counter shows **2**, because it counts different products, not units. |
| 3 | Click **Add** on Product C. | C shows "1 ct"; the counter shows **3**. |
| 4 | Open the list drawer. | Two location groups: **Cooler Doors** with A and C, and **Canned Food** with B. Each line shows an unchecked checkbox, name, size and quantity (A 1 ct, B 3 ct, C 1 ct). |
| 5 | Check the line prices. | A $1.99 (~~$2.89~~); B **$2.97** = 3 × $0.99 (~~$5.37~~ = 3 × $1.79); C $1.99 (~~$2.89~~). |
| 6 | Check the footer. | **Est. total $6.95** (1.99 + 2.97 + 1.99) and **Est. savings $4.20** (0.90 + 2.40 + 0.90). Exploratory evidence: with A and B only, the drawer showed $4.96 and $3.30, which matches the same formula. |
| 7 | Close the drawer and reload the page (F5). | The list is unchanged: same 3 products, quantities and totals. |
| 8 | Sign out, sign in again as `TEST_USER_A` and open the list. | The same list is shown: it is stored with the account, not only in the browser. |

- **Expected result:** All three products are listed once, with the right quantities, grouped by
  store location. Line prices, Est. total and Est. savings are calculated correctly, and the list
  survives a reload and a new sign-in.
- **Postconditions:** Clear the list with **Manage**.

![The list is kept after a reload (F5)](images/05-list-kept-after-reload.png)

*Exploratory session: the guest list after a reload, with three products (counter 3).*

## 4. Further scenarios

These are scenarios I would add next, here only as one-liners.

### Functional

- Removing an item ("−" at 1 ct, or **Manage**) removes the line, lowers the counter and
  recalculates the totals.
- The same product added from different places (search, category page, Weekly Ad, a recipe's
  "add all ingredients") ends up as **one line** with the quantities added up.
- Ticking the checkbox while shopping: the state is kept after a reload and the totals stay
  consistent.
- **Order online** moves the list to a Delivery/Pickup cart with the same items and quantities;
  products not sold online are flagged.
- **Sort** options and collapsing the location groups.

### Negative and edge cases

- Boundary: the maximum quantity per product on the stepper (max, max + 1); quantity 0 removes the line.
- A product that is out of stock or not sold in the selected store cannot be added, or there is
  a clear message.
- Changing the store while the list has items: availability, locations and prices are updated,
  and unavailable items are flagged.
- Switching In-Store ↔ Delivery/Pickup keeps the list and the cart separate and loses nothing.
- Network failure while adding (DevTools "Offline"): an error message is shown, no phantom item
  appears and the counter does not change.
- Rapid repeated clicks on "+" (race condition): after a reload the tile, the drawer and the
  server show the same quantity.
- A weekly-ad promotion ends: the list shows the new price and the savings are recalculated.

### Non-functional

- Mobile web (iOS Safari, Android Chrome): the drawer and the stepper are usable at 375 px width.
- Accessibility: Add, the stepper and the drawer work with the keyboard only; the counter change
  is announced to screen readers; focus stays inside the open drawer.
- Performance: adding an item responds within about 1 s on a 4G profile; a list of 50+ items
  scrolls smoothly.
- Privacy: after signing out on a shared computer the previous user's list is not shown.

**Automation note:** In Playwright every test gets a fresh browser context, the equivalent of a
new incognito window. The Cookie Notice and the shopping-mode dialog therefore appear in every
test. A fixture should handle them once, or a prepared `storageState` should be loaded, so that
the tests stay focused on the list. Automated runs against production also need an agreed test
account and must respect bot protection, so they would normally target a staging environment.

## 5. Bug report fields

| Field | Why it is needed |
| --- | --- |
| **ID** | Unique reference (Jira key), used in test runs, commits and release notes. |
| **Title** | `[Area] what is wrong + when`. It must be searchable and understandable without opening the report. |
| **Reporter, date, status, assignee** | Ownership and workflow (New → Triaged → In progress → Fixed → Verified → Closed). |
| **Component / feature** | Routes the defect to the right team. |
| **Environment** | URL, build/release, browser + version, OS, device/viewport, account type, store/ZIP, shopping mode. Many defects only happen in one of these. |
| **Severity** | Impact on the user or business: Blocker / Critical / Major / Minor / Trivial. |
| **Priority** | How soon to fix: P1 immediately (hotfix) / P2 next release / P3 planned / P4 backlog. Decided with the product owner. |
| **Reproducibility** | Always / intermittent (x out of y) / once. Intermittent issues need more data. |
| **Preconditions, test data** | The starting state, so a developer can reproduce it at the first attempt. |
| **Steps to reproduce** | Numbered and minimal, each step one action. |
| **Expected result** | The correct behaviour, with the requirement it comes from. |
| **Actual result** | What happens instead, with exact messages and values. |
| **Impact** | Who is affected and how much; supports the priority decision. |
| **Attachments** | Screenshot or video, HAR file, console log, timestamps (UTC), request IDs. |
| **Workaround** | Whether users can get around it; influences severity and priority. |
| **Links** | Test case, user story, related or duplicate defects. |
| **Notes / analysis** | Suspected cause, what was ruled out, other environments tried. Saves developer time. |
| **Labels** | For filtering and reporting (e.g. `shopping-list`, `regression`). |

## 6. Sample bug report

> **This is a potential (hypothetical) bug, not one observed on production.** It is a realistic
> defect class for this feature: the state transition from guest to registered user. TC-ASL-002
> (steps 8–10) is designed to catch it. Reproducing it on production would need a test account.

| Field | Value |
| --- | --- |
| **ID** | BUG-ASL-001 |
| **Title** | [Shopping list / In-Store] Items added as a guest disappear after signing in |
| **Reporter / date** | Attila Tóth, 2026-11-21 |
| **Status / assignee** | New / unassigned (to be triaged) |
| **Component** | Web storefront → Shopping list (In-Store mode), Authentication |
| **Environment** | Production `https://www.aldi.us`, 21 Nov 2026 19:30 CET; Windows 11, Google Chrome (latest stable, exact version from `chrome://version`), private window; store ALDI - BAT 18 - Geneva, IL (ZIP 60174); shopping mode In-Store; account `TEST_USER_B` with an empty list |
| **Severity** | **Major**: data the user created is lost. A workaround exists (sign in first). |
| **Priority** | **P2 (high)**: hits every guest who signs in to keep a list, which is the default first-visit journey. |
| **Reproducibility** | Always (5/5) |
| **Linked test case** | TC-ASL-002, step 9 |
| **Preconditions** | Not signed in (new private window); `TEST_USER_B` exists and has an empty shopping list. |

### Steps to reproduce

1. Open `https://www.aldi.us` in a new private window. Click **Reject All Non-Essential**,
   choose **In-Store** (ALDI - BAT 18 - Geneva, IL) and click **Confirm**.
2. Add *ALDI Canned Pumpkin, 15 oz* and press **+** until the quantity is **3 ct**.
3. Add *Countryside Creamery Salted Butter Quarters, 16 oz* (1 ct).
4. Open the list drawer and check that it shows both items: counter 2, Est. total $4.96.
5. Close the drawer, click **Sign In / Register** and sign in as `TEST_USER_B`.
6. Open the list drawer.

**Expected result:** both items are in the signed-in user's list with their quantities (3 ct and
1 ct); counter 2; Est. total $4.96. If the account already has items, the guest items are merged
and the quantities of the same product are added up. This is the platform's guest-shopping
behaviour, also described in US-LIST-02.

**Actual result:** after signing in the list is **empty** and the counter shows **0**. Signing
out again does not bring the guest items back: they are lost.

| Field | Value |
| --- | --- |
| **Impact** | Shoppers who plan a trip as guests (the default first visit) lose their list when they sign in or register. This damages trust and conversion; "lost my list" complaints reach customer care. |
| **Attachments** | `BUG-ASL-001.mp4` (screen recording of steps 1–6), `BUG-ASL-001.har` (network log of the sign-in), console log, screenshots before and after signing in |
| **Workaround** | Sign in before building the list. |
| **Notes / analysis** | Suspected cause: the guest list is tied to the anonymous session and is not migrated to the user on sign-in. To check in the HAR: does the list request after sign-in still send the guest session id? Compare with the Delivery/Pickup cart: if the guest cart is merged but the list is not, the two behave inconsistently. Also try Pickup and Delivery mode, Firefox and Safari, and an account that already has a list (merge vs. overwrite). |
| **Labels** | `shopping-list`, `in-store`, `guest`, `sign-in`, `data-loss` |

## 7. Observation from the exploratory session

This one is real but minor, and should be confirmed with the content owner before it is filed.

| Field | Value |
| --- | --- |
| **Title** | [Content] US site shows the British spelling "Savoury Crackers" as an in-store location |
| **Where** | In-Store mode, location label on the tiles of *Specially Selected* Italian breadsticks ("📍 Savoury Crackers"); see [screenshot 03](images/03-products-added-quantity-stepper.png). The same label would appear as a group heading in the shopping list. |
| **Expected** | US English, "Savory Crackers", unless this is the official aisle name in ALDI US stores. |
| **Severity / priority** | Trivial / P4 – cosmetic, localisation consistency |

### Sources

- [ALDI U.S. debuts new nationwide digital experience using Instacart's enterprise technology (30 Mar 2026)](https://investors.instacart.com/news-releases/news-release-details/aldi-us-debuts-new-nationwide-digital-experience-using)
- [Instacart Storefront docs – Shopping contexts (In-store: "Add to list", list grouped by location, Manage)](https://docs.instacart.com/storefront/learn_about_your_storefront/shopping/shopping_contexts)
- [Instacart Storefront docs – Guest user shopping](https://docs.instacart.com/storefront/learn_about_your_storefront/sign_on_experience/guest_user)
