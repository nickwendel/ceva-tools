# CEVA tools

Operational tools for CEVA sites, served with GitHub Pages.

| Tool | Path | What it does |
|---|---|---|
| Receiving dock board | [`dock-board/`](dock-board/) | Floor TV display of trailers in the drop and today's appointments, with priority, door, pathway owner and status. Supervisors update it from a phone. |
| NCI/Grief inbound exceptions | [`nci-inbound/`](nci-inbound/) | Shared log of error shipments (shortages, overages, damage, missing ASN…) worked by CEVA and NCI/Grief together. Either company raises an issue, posts updates, hands it to the other side and resolves it. A board shows what is open and who it is waiting on. |
| Inventory action tracker | [`action-tracker/`](action-tracker/) | The Inventory Action Tracker workbook as a shared page: actions with category, owner, frequency, priority, dates, status and percent complete, plus the update log. Exports to the original Excel workbook layout and imports that workbook back. |
| Inventory differences | [`inventory-differences/`](inventory-differences/) | Pulls the lines with a quantity difference (short and over picks) out of the SAP warehouse task export, keeps them as a running list by bin, product and associate, and tracks status, owner and notes on each one. Exports an action list for the Inventory Action Tracker. |
| Putaway audit | [`putaway-audit/`](putaway-audit/) | Lists every putaway out of the GR-ZONE from the SAP warehouse task export, prints an audit sheet, takes the audit results and tracks the errors by associate. |
| Picking audit | [`picking-audit/`](picking-audit/) | Lists every pick out of a storage bin from the SAP warehouse task export, prints an audit sheet, takes the audit results and tracks the errors by associate. |
| HU consolidation | [`consolidation/`](consolidation/) | Finds every location that holds more than one handling unit in the SAP stock export, shows which handling unit to keep and which to merge into it, prints a work sheet and tracks what has been consolidated. |
| Training documents | [`training-docs/`](training-docs/) | The site's training library: work instructions, procedures and guides by category, uploaded as files (up to 20 MB) or links, with every version kept. Supervisors and admins add and update; everyone at CEVA with a login can open and download. |
| Data upload | [`data/`](data/) | One place to load the SAP warehouse task export. The file is read once and every tool that uses it (warehouse transactions, inventory differences, putaway audit, picking audit) is updated together. Also takes the SAP stock export for HU consolidation. Shows what each tool holds now. |
| Access and people | [`access/`](access/) | One page to sign in, request access, see what your user group opens in each tool and change your password. Admins approve requests, place people in user groups and set each group's access to each tool here. |
| Warehouse transactions | [`transactions/`](transactions/) | Dashboard of SAP EWM warehouse tasks: completed work by hour, activity, process type and associate, open task aging, and trends over time. A supervisor loads the SAP export and everyone signed in sees it. |

The home page ([`index.html`](index.html), live at `https://nickwendel.github.io/ceva-tools/`) is the launcher: a card for every web tool, download cards for the templates in [`templates/`](templates/) (8D report in Word and Excel, action plan in Word, weekly staff meeting 4 Block deck in PowerPoint; the blank Inventory Action Tracker workbook there is what the action tracker's Excel export is built from), and a list of the site workbooks that are not published here because they hold site data. A search box filters the cards. To add a tool, copy a card in `index.html` and give it `data-tags` words for the search. Only blank templates belong in `templates/`; this repository is public.

Shared files live in [`assets/`](assets/): `sap-export.js` is the one loader for the SAP warehouse task export (see [Data upload](#data-upload)); `ceva-logo-whitered.png` is the white-and-red logo used on the dark headers and sign-in cards; `ceva-logo.svg` (navy and red) is only the browser-tab icon. Every page shares one look, matched to the Whitsett KPI dashboard: dark navy, card panels, CEVA red accent.

## Firebase (shared by all tools)

All tools use one Firebase project, **`ceva-tools`** (console: [console.firebase.google.com/project/ceva-tools](https://console.firebase.google.com/project/ceva-tools)). It holds Email/Password sign-in, one Firestore database and one people list, so a person added once can use every tool their role allows. GitHub Pages only serves the files; the pages talk to Firebase directly.

| File | What it is |
|---|---|
| [`firestore.rules`](firestore.rules) | Security rules for every tool. Deploy with `firebase deploy --only firestore:rules` or paste into **Firestore Database → Rules → Publish**. |
| [`firebase.json`](firebase.json), [`.firebaserc`](.firebaserc) | Firebase CLI config pointing at the `ceva-tools` project. |
| `*/firebase-config.js` | The web app config each tool loads. Same values in every tool; they identify the project and are not secrets. |

**People and roles** live in the Firestore collection `roles`, one document per login (document ID = the person's User UID from **Authentication → Users**):

| Field | Values |
|---|---|
| `role` | `viewer` (see only), `supervisor` (dock board updates + inbound issues + load transaction exports), `user` (inbound issues only), `admin` (everything, settings, people) |
| `company` | `ceva` or `partner` (NCI/Grief). Used by the inbound tool. |
| `name` | Shown on boards and in update threads |

**Passwords.** The sign-in screen has **Forgot password?**, which emails a reset link, and signed-in people can change their password under **Settings → Account**. For the reset link to open the tool's own "set new password" screen (instead of Firebase's generic page, which some mail clients break), set the email action URL once in the console: **Authentication → Templates → Password reset → pencil icon → Customize action URL** → `https://nickwendel.github.io/ceva-tools/nci-inbound/` → **Save**.

**User groups.** Access to each tool is set by user group. Every account is placed in one group on the access page, and each group has a level for each tool: **No access**, **View**, **Edit** (change things) or **Full** (also delete and change the tool's settings). The starting groups are **Lenovo**, **CEVA White Collar** and **CEVA Blue Collar**; admins change their levels, rename them and add more under **User groups** on the access page. The built-in **Admin** group has full access to everything and is the only group that can change people and groups. Loading a SAP export fills several tools at once, so it follows the **Data upload** row. Groups are stored in the Firestore collection `groups` and a person's group in the `group` field of their `roles` document. The tool list and levels live in `assets/access.js`, and `firestore.rules` enforces the same levels. Accounts that are not in a group yet keep the access of their old `role` until an admin places them in a group. Where the sections below mention viewers, supervisors and admins, read View, Edit and Full.

**Access page.** `https://nickwendel.github.io/ceva-tools/access/` is the one link to send to new people. They request access there (or on any tool's sign-in screen), and once approved it lists what their role can do in each tool. Admins get the **Access requests** list and the full **People** list on the same page, and can change a person's role or company, remove them, or add a TV login by User UID. It uses the existing `roles` and `requests` rules, so no rules change is needed.

**Getting access.** New people tap **New here? Request access** on the access page or any tool's sign-in screen, enter their name, work email, a password and (on the inbound tool) which company they work for. That creates their login and files a request. Admins see a count on the **Settings** tab and an **Access requests** list at the top of Settings → People, pick a role and tap **Approve**; the requester is let in automatically, even if they left the page open. **Decline** removes the request. Someone who already has a login but no role sees the same request form after signing in.

Admins can still add people by hand from **Settings → People**: Firebase console → **Authentication → Users → Add user**, copy the User UID, then paste it in with a name, company and role. That is the way to set up TV screens, which don't request access themselves.

**Network:** screens and phones need to reach `gstatic.com`, `googleapis.com` and `firebaseapp.com`. The transactions dashboard and the inventory differences tool also need `cdnjs.cloudflare.com`.

---

## Receiving dock board

**Live page:** `https://nickwendel.github.io/ceva-tools/dock-board/`

- **TV:** open the page, sign in once with the TV's account, tap **Full screen**. It stays signed in, keeps the screen awake where the browser allows, and pages through long lists every 12 seconds.
- **Supervisors:** open the same page on a phone. It opens on the update screen: add trucks, move them along (Arrived → At door → Unloading → Received), set priority and pathway owner, post a notice.
- **No connection:** the TV keeps showing the last saved board and marks itself Offline. Supervisor changes save on the phone and sync when the network is back.

Data lives in a Firebase project (Firestore + Authentication). The page only talks to Firebase; GitHub just serves the files.

### Setup

Done once for the shared `ceva-tools` project (see **Firebase** above). Supervisors use **Request access** on the sign-in screen and an admin approves them. TVs are added by hand: create the TV's login in **Authentication → Users**, then add its UID under **Settings → People** as Viewer.

### Changing the logo

Replace [`assets/ceva-logo-whitered.png`](assets/ceva-logo-whitered.png) with the same file name. It sits directly on the dark header, so use a transparent PNG with white lettering, about 240 pixels tall.

### Limits

Firebase's free Spark plan allows 50,000 reads and 20,000 writes per day. A board with a few screens and a few hundred truck updates a day uses a small fraction of that. Clear received trucks weekly from **Settings → Received trucks**.


---

## NCI/Grief inbound exceptions

**Live page:** `https://nickwendel.github.io/ceva-tools/nci-inbound/`

One page for both companies. Each login belongs to a company (CEVA or NCI/Grief), and every issue is always *waiting on* exactly one of them.

- **Raise an issue:** tap **Raise issue**, enter the shipment (ASN, PO, BOL or trailer), the issue type, quantities and what happened, then pick who needs to act first. The other company is notified.
- **Work it:** the **Needs us** tab lists everything waiting on your company. Open an issue to read the full update thread, then **Post update**, **Hand to &lt;other company&gt;** (with a note saying what you need) or **Resolve** (with the disposition). Resolved issues can be reopened; reopening hands the issue back to the other company.
- **Board:** the **Board** view is for a big screen or a TV: two columns, *Waiting on CEVA* and *Waiting on NCI/Grief*, oldest and most urgent first, with overdue items flagged after a configurable number of hours. It paginates long lists and keeps the screen awake.
- **Notifications:** two kinds.
  - **Browser alerts** (per device): turn on with the bell button. The device shows a notification when an issue lands on your company or the other company posts an update, and the tab title shows how many items need your company.
  - **Email** (optional, both companies): admins enter notification addresses per company under **Settings → Companies and emails**. Emails are sent through the Firebase *Trigger Email* extension (setup below). Without the extension, email settings are ignored and browser alerts still work.
- **History and export:** every update is kept with who posted it, which company and when. **Settings → Export** downloads all issues as CSV.
- **No connection:** the page shows the last saved list, and changes made offline sync when the network is back.

### Setup

Done once for the shared `ceva-tools` project (see **Firebase** above). Sign in, open **Work items → Settings** and set the company names, overdue hours and notification emails.

### Adding people from both companies

Send people the link to the tool. They tap **New here? Request access**, pick their company (CEVA or NCI/Grief) and create a password. You approve them from **Settings → Access requests** with a role; they're in immediately. The company decides which items show under **Needs us**, which alerts they get, and which side their updates are posted as.

| Role | Can do |
|---|---|
| Viewer | See the board and read issues |
| User | Also raise issues, post updates, hand off, resolve and reopen |
| Admin | Also change settings, manage people and delete issues |

### Email notifications (optional)

Emails are queued in a Firestore collection called `mail`, which the Firebase **Trigger Email from Firestore** extension turns into real emails. The extension needs the project on the Blaze (pay as you go) plan; at a few hundred emails a month the cost is a few cents.

1. Firebase console → **Build → Extensions → Explore** → **Trigger Email from Firestore** → **Install**.
2. Set **Email documents collection** to `mail`, and fill in the SMTP connection URI and default FROM address for the mailbox that should send (your IT team can give you SMTP details for a shared mailbox, or use a service such as SendGrid).
3. Leave the other options at their defaults and finish the install.
4. On the tool, **Settings → Companies and emails** → enter the addresses for each company → **Save settings**.

Each email names the shipment, issue type, who posted and what they wrote, with a link straight to the issue.

### Limits

Firebase's free Spark plan allows 50,000 reads and 20,000 writes a day across both tools, far more than a few people working exceptions will use. Admins can delete resolved issues older than 30 days from **Settings**.


---

## Warehouse transactions

**Live page:** `https://nickwendel.github.io/ceva-tools/transactions/`

Warehouse task activity from SAP EWM, by day and over time. Sign in with the same account as the other tools.

The page has three sections:

- **Completed:** confirmed task lines, units, associates and peak hour; a chart of confirmations by hour; breakdowns by activity and warehouse process type; a sortable associate table (select a row to filter the page to that person); and exceptions, or quantity differences when the export has no exception codes.
- **Open tasks:** every task line with a blank or `B` status in the most recent export, oldest first with its age since creation, counted in five age bands and broken down by activity and by who created it. Age runs to the latest activity time in that file. Amber from 4 hours, red from 8 hours.
- **Trends:** lines, units, lines per associate hour and exceptions, **By day** for the selected range or **By month** for every day that has been loaded, plus a day by day or month over month table. Each chart has a dashed average line and a solid red straight-line trend (it needs at least 3 days or months), with the average and the rate of change written underneath. In By month the current month is drawn lighter and left out of the average and trend because it is not finished. With the Pick activity selected, By day also draws a dotted line at the expected picking capacity of 300 pick lines a day (`PICK_CAP` in `transactions/index.html`), and Completed shows pick lines as a percentage of that capacity. **Export to PowerPoint** saves a deck of the charts as shown: a title slide, then one slide per chart with the chart as a picture and the average, trend, highest and latest figures. The deck is built in the browser, so nothing is uploaded.

**Date range:** Today, Week (last 7 days), Month (last 30 days), All, or pick one day. The range applies to Completed and Trends. With a single day selected, Trends shows the 14 days up to it. The tabs under the tiles limit the page to one activity (pick, putaway, internal move, posting change, goods issue, goods receipt).

### Loading exports

A supervisor or admin selects **Load export** (or drops the file on the page) and picks the SAP warehouse task export (`.xlsx`). The page reads the file in the browser and saves a summary of each day to Firebase, and every signed-in screen updates on its own.

- **History builds up.** Each load adds the days in the file to what is already saved. A file can hold one day or many, so a historical export loads the same way as today's.
- **Loading a day again replaces it.** Every day that appears in a file is replaced by that file's lines for that day, so load whole days. Reloading today's export through the day is fine.
- **Duplicates are removed.** A line that appears more than once in the file, identical in every column, is kept once. When SAP lists one task as two lines, one with only the source bin or handling unit and one with only the destination bin or handling unit, and everything else the same, they are joined into one line. The message after a load says how many lines were removed.
- **Open tasks follow the newest file.** The open task list is replaced only when the file is at least as recent as the one it came from, so loading old history doesn't wipe today's open tasks.
- **Very large files:** the file is read in the browser, so a file with hundreds of thousands of lines can be slow or run out of memory. Load history a month or a quarter at a time.

### The export

Run the warehouse task list in SAP EWM, include open and confirmed tasks, and export to Excel. Columns are matched by name, so their order doesn't matter. Two layouts are accepted:

| Needed | Column names |
|---|---|
| Always | `Warehouse Task`, `Warehouse Task Status`, `Confirmed By`, `Confirmation Date`, `Confirmation Time`, `Created On`, `Created At`, `Whse Process Type` |
| Activity | `Whse Process Category Desc.` (preferred) or `Activity` |
| Quantity | `Act Dest Qty Alt UoM` or `Act. Qty Dest. BUoM` |
| Optional | `Src Trgt Qty AUoM` / `Src Trgt Qty BUoM`, `Diff. Qty in Alt.Un`, `Exception Code`, `Created By`, `Product`, `Product Short Description`, `Source Storage Bin`, `Destination Bin`, `Warehouse Order`, `Wave`, `Pull header ID`, `Queue` |

### Who can do what

| Role | Can do |
|---|---|
| Viewer, User | See the dashboard |
| Supervisor, Admin | Also load exports for everyone |

### Data and limits

No task data is stored in this repository. In Firestore:

| Where | What |
|---|---|
| `wtdays/{YYYY-MM-DD}` | One document per confirmation date: line and unit counts per associate, activity, process type and hour, each associate's first and last confirmation, and up to 300 exception lines. The confirmed task lines themselves are not kept. |
| `wt/open`, `wt/open/chunks` | The open task lines from the most recent export. |

To remove a day that was loaded by mistake, an admin deletes its document under `wtdays` in the Firebase console.

Loading a file is one write per day in it. A screen reads one document per day in the range it shows (Today reads one, All reads every day), which stays far inside the free Spark plan for a handful of screens. The page loads the SheetJS spreadsheet reader from `cdnjs.cloudflare.com`, so screens need to reach that host as well as the Firebase ones.

---

## Data upload

**Live page:** `https://nickwendel.github.io/ceva-tools/data/`

Every SAP pull is the same warehouse task export, so it is loaded once for all tools.

- **Load:** a supervisor or admin selects **Load SAP export** on the Data upload page (or drags the file onto it). The page lists what each tool received from that file, and a table shows what each tool holds now, who loaded it and when.
- **Same result from inside a tool:** the load buttons in Warehouse transactions and Inventory differences run the same loader, so a file loaded anywhere updates every tool.
- **What is saved:** warehouse transactions gets one summary per confirmation date and the open task list; inventory differences gets the lines with a quantity difference, added to its running list. Loading the same days again refreshes them and does not double anything.
- **How it is built:** [`assets/sap-export.js`](assets/sap-export.js) reads the workbook once and holds each tool's parse and save step. `SapExport.loadAll(...)` runs them all and reports per tool. To feed another tool from the export, add its step there and to `loadAll`; no page needs its own upload code. It writes the same Firestore documents as before, so no rules change is needed.
- An older export layout without a difference quantity column still loads into warehouse transactions; the page says inventory differences was not updated.

---

## Inventory action tracker

**Live page:** `https://nickwendel.github.io/ceva-tools/action-tracker/`

The Inventory Action Tracker workbook as a shared page, so everyone works from one list instead of passing a file around. The Excel workbook is kept: the page exports to it and imports from it.

- **Actions:** number, category, action item, details, owner, frequency, priority, start and due date, status, percent complete, days left and notes, the same columns as the workbook's Action Tracker sheet. Search, filter by status, category and owner, and sort by any heading. Overdue dates are red.
- **Totals:** total actions, not started, in progress, complete, on hold or blocked, overdue and overall percent complete, counted the same way as the workbook's summary row.
- **Updating:** a supervisor or admin selects an action to change it, or **New action** to add one. A line can be added to the update log while saving.
- **Update log:** date, action number, update and who made it, the workbook's Update Log sheet. **Add update** adds a line; select a line to correct it.
- **Export Excel:** downloads the tracker in the original workbook layout: logo, summary row with its formulas, colour rules, dropdowns, frozen panes and print setup, with the Action Tracker and Update Log sheets filled in. The export is built in the browser from the blank copy in [`templates/CEVA_Inventory_Action_Tracker.xlsx`](templates/CEVA_Inventory_Action_Tracker.xlsx), so to change the workbook's look, change that file. The sheets grow when there are more than 22 actions or 50 log lines.
- **Import Excel:** reads the workbook (or an export) back in. Actions are matched on their number: a number already in the tracker is overwritten with the workbook's row, new numbers are added, and nothing is removed. Log lines already present are skipped. The page shows what it found before anything is saved.

**Roles.** Viewers see everything and can export. Supervisors and admins add and update actions and log lines and import. Admins delete and set the site name.

**Data.** `atrk/{id}` holds one action, `atrklog/{id}` one log line, `atrkcfg/settings` the site name. Publish [`firestore.rules`](firestore.rules) after merging, or saving and importing will be refused.

---

## Training documents

**Live page:** `https://nickwendel.github.io/ceva-tools/training-docs/`

The site's training library: work instructions, procedures, guides and other training material in one place, with every version kept.

- **Finding a document:** search by title, number, category or owner, or pick a category. The list shows the current version, when it was updated and by whom, and the review date. Sort by any heading.
- **Opening:** select a document to see its details and version history. PDFs and images open in a browser tab with **View**; every file can be saved with **Download**. A document can also be a link (for large files and video kept in SharePoint, OneDrive or Teams), which opens in a new tab.
- **Adding:** a supervisor or admin selects **Add document**, fills in the title, optional document number, category, owner, review date and description, and uploads a file or pastes a link. **Add several** takes many files at once: each becomes its own document, with the title, document number and category read from the file name (for example `WI LNV NC-0003 PUTAWAY.docx`) and shown for checking before anything is saved. A file whose number or title is already in the library is left unticked.
- **Updating:** open the document and select **Upload new version**. The new file or link becomes the current version with the next version number, and a note on what changed is required. Older versions stay in the history and can still be downloaded. **Edit details** changes the title, category and the other details without making a new version.
- **Review dates:** a document with a review date turns amber in its last 30 days and red once overdue, and both are counted at the top of the page.
- **Archive and delete (admins):** **Archive** takes a document out of the list and puts it under the **Archived** filter, where it can be restored. **Delete** removes the document and every version. An admin can also **Remove** an old version to free space.
- **Categories (admins):** the **Categories** button edits the list. It starts as Safety, Onboarding, Inbound and receiving, Putaway, Picking, Outbound and shipping, Inventory control, Quality, Equipment (PIT), SAP EWM and Other.

**Roles.** Viewers and users open and download. Supervisors and admins add documents, edit details and upload new versions. Admins archive, restore, delete and set the categories. Partner (NCI/Grief) accounts cannot see the library, in the page or in the rules.

**Files and limits.** Files are stored in the same Firestore database as the other tools, in pieces, so a file can be up to 20 MB. Larger files go in as a link. Program and web page files (`.exe`, `.js`, `.html` and similar) are refused. The free Firebase plan holds 1 GiB in total and allows 20,000 writes and 50,000 reads a day; a 10 MB file is 15 writes to upload and 15 reads to open (a 20 MB file, 30), so the library has room for a few hundred typical documents before old versions need removing. The files sit behind the sign-in; nothing uploaded is in this public repository.

**Data.** `tdocs/{id}` holds one document and a copy of its current version's details, `tdocs/{id}/vers/{verId}` one version (written once, never edited), `tdocs/{id}/vers/{verId}/chunks/{i}` the file in pieces, and `tdoccfg/settings` the category list. Publish [`firestore.rules`](firestore.rules) after merging, or the page will say the documents can't be read.

---

## Inventory differences

**Live page:** `https://nickwendel.github.io/ceva-tools/inventory-differences/`

Pulls the differences out of the SAP warehouse task export (the same layout used for every SAP pull, and the same file the transactions dashboard loads) and keeps them as a running list to work.

- **What a difference is:** a task line whose `Diff. Qty in Alt.Un` is not zero. Positive is a **short pick** (less confirmed than the task asked for), negative an **over pick** (more confirmed than asked).
- **Load:** a supervisor or admin selects **Load SAP export** (or drags the file onto the page). The page reads the tab with the task lines and adds its differences to the list. Nothing already on the list is removed, and loading the same days again does not double up: a difference is kept once, by warehouse task, product and bin, on its confirmation date.
- **Action list:** date, product, bin, asked and confirmed quantity, difference, associate, document and priority. Search, filter by priority, short or over and status, sort by any heading, and switch between the last 7 days, 30 days and everything.
- **Working a difference:** select a row to set its status (New, Recount, Researching, Ready to post, Closed), an owner and notes.
- **By bin, By product, By associate, By day:** counts and units short and over. Bins and products with three or more differences are marked **Repeat**; those are the likeliest to need a count.
- **Export action list:** downloads the filtered list as Excel. Columns A to I follow the Inventory Action Tracker (category, action item, details, owner, priority, status, notes).

**Columns used:** `Warehouse Task`, `Product`, `Source Storage Bin`, `Confirmation Date`, `Confirmation Time`, `Confirmed By`, `Diff. Qty in Alt.Un` (or `Diff. Qty in BUoM`), `Src Trgt Qty AUoM`, `Act Dest Qty Alt UoM`, plus `Warehouse Order`, `Document`, `Wave`, `Pull header ID`, `Whse Process Type`, `Whse Process Category Desc.` and `Activity Area` for the detail view. Columns are found by name, so their order does not matter.

**Priority.** P1 from 500 units, P2 from 50 units, otherwise P3. Admins change these under **Thresholds**.

**Roles.** Viewers see everything. Supervisors and admins load exports and work differences. Admins set thresholds.

**Data.** `invdays/{YYYY-MM-DD}` holds the differences confirmed on each date, `invact/{task|product|bin}` the action on each one, `invcfg/settings` the thresholds. Publish [`firestore.rules`](firestore.rules) after merging, or loading and saving will be refused.

---

## Putaway audit

**Live page:** `https://nickwendel.github.io/ceva-tools/putaway-audit/`

Lists the putaways from the SAP warehouse task export so they can be audited on the floor, and tracks the errors found by associate. It is fed by the same load as the other tools: load the export on the Data upload page or inside any tool and this list updates.

- **What a putaway is:** confirmed stock that left the goods receipt zone (a source bin ending in `GR-ZONE`, such as `9010-GR-ZONE`) for another bin. SAP often lists the pick-up from the zone and the drop into the bin as two tasks in one warehouse order; they are joined on warehouse order, product and quantity into one line with the final bin. The associate is the person who confirmed the drop. Moves that stay inside the GR-ZONE, posting changes and open tasks are left out.
- **Putaway list:** date and time, associate, product, quantity, bin, warehouse order and task. Show the latest day, one chosen day, 7 days, 30 days or everything; search; filter by associate and audit result; sort by any heading.
- **Print audit sheet:** prints the list as filtered and sorted (landscape, CEVA document style) with an OK box, an Error box and room to write what was found.
- **Entering results:** select a line and mark it Correct or Error. An error needs a type (wrong bin, wrong quantity, wrong product, not found in bin, label or handling unit, damaged, other) and can carry notes. **Save and next** moves down the list.
- **Errors by associate:** putaways, audited, correct, errors and error rate (errors out of putaways audited) for each associate, plus errors by type. Select an associate to see their lines.
- **Export to Excel:** the filtered list with audit results, and a By associate tab.

**Columns used:** `Warehouse Task`, `Warehouse Order`, `Product`, `Source Storage Bin`, `Destination Bin`, `Confirmation Date`, `Confirmation Time`, `Confirmed By`, `Warehouse Task Status`, the quantity column, `Whse Process Type` and `Whse Process Category Desc.` or `Activity`.

**Roles.** Viewers see everything. Supervisors and admins load exports and enter audit results.

**Data.** `putdays/{YYYY-MM-DD}` holds the putaways confirmed on each date, `putaud/{task|product}` the audit result on each one. Loading adds to the list and never removes a line. Publish [`firestore.rules`](firestore.rules) after merging, or loading and saving will be refused.

---

## Picking audit

**Live page:** `https://nickwendel.github.io/ceva-tools/picking-audit/`

Lists the picks from the SAP warehouse task export so the pick locations can be audited on the floor, and tracks the errors found by associate. It works the same way as the Putaway audit and is fed by the same load: load the export on the Data upload page or inside any tool and this list updates.

- **What a pick is:** a confirmed stock removal task out of a storage bin, with the bin it was picked from and the associate who confirmed it. The drop into the goods issue zone (a second task with no source bin), the goods issue posting and open tasks are left out. When the quantity confirmed differs from the quantity asked, the quantity asked is shown beside it.
- **Pick list:** date and time, associate, bin picked from, product, quantity, warehouse order and task. Show the latest day, one chosen day, 7 days, 30 days or everything; search; filter by associate and audit result; sort by any heading (sort by **Picked from** to walk the bins in order).
- **Print audit sheet:** prints the list as filtered and sorted (landscape, CEVA document style) with an OK box, an Error box and room to write what was found.
- **Entering results:** select a line and mark it Correct or Error. An error needs a type (wrong bin, wrong quantity, wrong product, bin count off, label or handling unit, damaged, other) and can carry notes. **Save and next** moves down the list.
- **Errors by associate:** picks, audited, correct, errors and error rate (errors out of picks audited) for each associate, plus errors by type. Select an associate to see their lines.
- **Export to Excel:** the filtered list with audit results, and a By associate tab.

**Columns used:** `Warehouse Task`, `Warehouse Order`, `Product`, `Source Storage Bin`, `Destination Bin`, `Confirmation Date`, `Confirmation Time`, `Confirmed By`, `Warehouse Task Status`, the quantity columns, `Whse Process Type`, `Wave` and `Whse Process Category Desc.` or `Activity`.

**Roles.** Viewers see everything. Supervisors and admins load exports and enter audit results.

**Data.** `pickdays/{YYYY-MM-DD}` holds the picks confirmed on each date, `pickaud/{task|bin}` the audit result on each one. Loading adds to the list and never removes a line. Publish [`firestore.rules`](firestore.rules) after merging, or loading and saving will be refused.

## HU consolidation

**Live page:** `https://nickwendel.github.io/ceva-tools/consolidation/`

Lists every location that holds more than one handling unit (HU), so the stock can be merged and one HU left in the location. It is fed by the SAP stock export (stock by storage bin and handling unit), which is a different file from the warehouse task export. Load it with **Load stock export** on the page, or on the Data upload page; the shared loader tells the two files apart by their columns.

- **What is listed:** a storage bin with two or more different handling units. Stock with no handling unit is not counted.
- **What to merge:** for each product in the location, the HU with the most stock is the one to keep (the oldest goods receipt when equal) and the others are merged into it. A location with different products is listed too, because it still holds more than one HU, but only HUs of the same product are suggested for merging. A flag shows when the HUs of one product hold different stock types.
- **List:** location, storage type, HUs, product, total quantity, the HU to keep, the HUs to merge into it and how many HUs come out. Search; filter by storage type, status and same product or different products; sort by any heading.
- **Status:** select a location to see every HU in it and mark it Open, Consolidated or Leave as is, with notes. **Save and next** moves down the list. Consolidated holds only while the location keeps the same HUs: on the next load it drops off the list when SAP shows one HU, and opens again if the HUs changed. Leave as is stays, for locations meant to hold several HUs.
- **Print work sheet:** the list as filtered and sorted (landscape, CEVA document style) with the HU to keep, the HUs to merge, a Done box and room for notes.
- **Export to Excel:** one row per handling unit with what to do, and a Locations tab.

**Columns used:** `Storage Bin`, `Handling Unit`, `Product`, `Quantity`, `Product Short Description`, `Stock Type`, `Storage Type` and `Goods Receipt Date`.

**Roles.** Viewers see everything. Supervisors and admins load the stock export and set status.

**Data.** `hucons/current` holds the locations from the newest stock export (each load replaces it), `huconsst/{bin}` the status of each location. Publish [`firestore.rules`](firestore.rules) after merging, or loading and saving will be refused.
