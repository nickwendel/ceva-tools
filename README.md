# CEVA tools

Operational tools for CEVA sites, served with GitHub Pages.

| Tool | Path | What it does |
|---|---|---|
| Receiving dock board | [`dock-board/`](dock-board/) | Floor TV display of trailers in the drop and today's appointments, with priority, door, pathway owner and status. Supervisors update it from a phone. |
| NCI/Grief inbound exceptions | [`nci-inbound/`](nci-inbound/) | Shared log of error shipments (shortages, overages, damage, missing ASN…) worked by CEVA and NCI/Grief together. Either company raises an issue, posts updates, hands it to the other side and resolves it. A board shows what is open and who it is waiting on. |
| Warehouse transactions | [`transactions/`](transactions/) | Dashboard of SAP EWM warehouse tasks: completed work by hour, activity, process type and associate, open task aging, and trends over time. A supervisor loads the SAP export and everyone signed in sees it. |

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

**Getting access.** New people tap **New here? Request access** on either tool's sign-in screen, enter their name, work email, a password and (on the inbound tool) which company they work for. That creates their login and files a request. Admins see a count on the **Settings** tab and an **Access requests** list at the top of Settings → People, pick a role and tap **Approve**; the requester is let in automatically, even if they left the page open. **Decline** removes the request. Someone who already has a login but no role sees the same request form after signing in.

Admins can still add people by hand from **Settings → People**: Firebase console → **Authentication → Users → Add user**, copy the User UID, then paste it in with a name, company and role. That is the way to set up TV screens, which don't request access themselves.

**Network:** screens and phones need to reach `gstatic.com`, `googleapis.com` and `firebaseapp.com`. The transactions dashboard also needs `cdnjs.cloudflare.com`.

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
- **Trends:** lines, units, lines per associate hour and exceptions, **By day** for the selected range or **By month** for every day that has been loaded, plus a day by day or month over month table. Each chart has a dashed average line and a solid red straight-line trend (it needs at least 3 days or months), with the average and the rate of change written underneath. In By month the current month is drawn lighter and left out of the average and trend because it is not finished. **Export to PowerPoint** saves a deck of the charts as shown: a title slide, then one slide per chart with editable charts and the average, trend, highest and latest figures. The deck is built in the browser, so nothing is uploaded.

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
