# CEVA tools

Operational tools for CEVA sites, served with GitHub Pages.

| Tool | Path | What it does |
|---|---|---|
| Receiving dock board | [`dock-board/`](dock-board/) | Floor TV display of trailers in the drop and today's appointments, with priority, door, pathway owner and status. Supervisors update it from a phone. |
| NCI/Grief inbound exceptions | [`nci-inbound/`](nci-inbound/) | Shared log of error shipments (shortages, overages, damage, missing ASN…) worked by CEVA and NCI/Grief together. Either company raises an issue, posts updates, hands it to the other side and resolves it. A board shows what is open and who it is waiting on. |
| Inventory differences | [`inventory-differences/`](inventory-differences/) | Pulls the lines with a quantity difference (short and over picks) out of the SAP warehouse task export, keeps them as a running list by bin, product and associate, and tracks status, owner and notes on each one. Exports an action list for the Inventory Action Tracker. |
| Access and people | [`access/`](access/) | One page to sign in, request access, see what your role opens in each tool and change your password. Admins approve requests and manage the people list for every tool here. |
| Warehouse transactions | [`transactions/`](transactions/) | Dashboard of SAP EWM warehouse tasks: completed work by hour, activity, process type and associate, open task aging, and trends over time. A supervisor loads the SAP export and everyone signed in sees it. |

The home page ([`index.html`](index.html), live at `https://nickwendel.github.io/ceva-tools/`) is the launcher: a card for every web tool, download cards for the templates in [`templates/`](templates/) (8D report in Word and Excel, action plan in Word, weekly staff meeting 4 Block deck in PowerPoint), and a list of the site workbooks that are not published here because they hold site data. A search box filters the cards. To add a tool, copy a card in `index.html` and give it `data-tags` words for the search. Only blank templates belong in `templates/`; this repository is public.

Shared files live in [`assets/`](assets/): `ceva-logo-whitered.png` is the white-and-red logo used on the dark headers and sign-in cards; `ceva-logo.svg` (navy and red) is only the browser-tab icon. Every page shares one look, matched to the Whitsett KPI dashboard: dark navy, card panels, CEVA red accent.

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
