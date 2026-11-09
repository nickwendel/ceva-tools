# CEVA tools

Operational tools for CEVA sites, served with GitHub Pages.

| Tool | Path | What it does |
|---|---|---|
| Receiving dock board | [`dock-board/`](dock-board/) | Floor TV display of trailers in the drop and today's appointments, with priority, door, pathway owner and status. Supervisors update it from a phone. |
| NCI/Greif inbound exceptions | [`nci-inbound/`](nci-inbound/) | Shared log of error shipments (shortages, overages, damage, missing ASN…) worked by CEVA and NCI/Greif together. Either company raises an issue, posts updates, hands it to the other side and resolves it. A board shows what is open and who it is waiting on. |

Shared files live in [`assets/`](assets/): `ceva-logo-white.svg` is the logo used on the navy headers; `ceva-logo.svg` (navy and red) is only the browser-tab icon.

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
| `role` | `viewer` (see only), `supervisor` (dock board updates + inbound issues), `user` (inbound issues only), `admin` (everything, settings, people) |
| `company` | `ceva` or `partner` (NCI/Greif). Used by the inbound tool. |
| `name` | Shown on boards and in update threads |

Admins manage people from either tool's **Settings → People** screen. To add a login: Firebase console → **Authentication → Users → Add user**, copy the User UID, then paste it into **Settings → People** with a name, company and role.

**Network:** screens and phones need to reach `gstatic.com`, `googleapis.com` and `firebaseapp.com`, plus `fonts.googleapis.com` for the typeface.

---

## Receiving dock board

**Live page:** `https://bigmuffuletta.github.io/ceva-tools/dock-board/`

- **TV:** open the page, sign in once with the TV's account, tap **Full screen**. It stays signed in, keeps the screen awake where the browser allows, and pages through long lists every 12 seconds.
- **Supervisors:** open the same page on a phone. It opens on the update screen: add trucks, move them along (Arrived → At door → Unloading → Received), set priority and pathway owner, post a notice.
- **No connection:** the TV keeps showing the last saved board and marks itself Offline. Supervisor changes save on the phone and sync when the network is back.

Data lives in a Firebase project (Firestore + Authentication). The page only talks to Firebase; GitHub just serves the files.

### Setup

Done once for the shared `ceva-tools` project (see **Firebase** above). Each new TV or supervisor needs a login in **Authentication → Users** and an entry under **Settings → People** on the board: Viewer for TVs, Supervisor for floor leads.

### Changing the logo

Replace [`assets/ceva-logo-white.svg`](assets/ceva-logo-white.svg) with the same file name. It sits directly on the navy header, so use the white (reversed) version of the logo.

### Limits

Firebase's free Spark plan allows 50,000 reads and 20,000 writes per day. A board with a few screens and a few hundred truck updates a day uses a small fraction of that. Clear received trucks weekly from **Settings → Received trucks**.


---

## NCI/Greif inbound exceptions

**Live page:** `https://bigmuffuletta.github.io/ceva-tools/nci-inbound/`

One page for both companies. Each login belongs to a company (CEVA or NCI/Greif), and every issue is always *waiting on* exactly one of them.

- **Raise an issue:** tap **Raise issue**, enter the shipment (ASN, PO, BOL or trailer), the issue type, quantities and what happened, then pick who needs to act first. The other company is notified.
- **Work it:** the **Needs us** tab lists everything waiting on your company. Open an issue to read the full update thread, then **Post update**, **Hand to &lt;other company&gt;** (with a note saying what you need) or **Resolve** (with the disposition). Resolved issues can be reopened; reopening hands the issue back to the other company.
- **Board:** the **Board** view is for a big screen or a TV: two columns, *Waiting on CEVA* and *Waiting on NCI/Greif*, oldest and most urgent first, with overdue items flagged after a configurable number of hours. It paginates long lists and keeps the screen awake.
- **Notifications:** two kinds.
  - **Browser alerts** (per device): turn on with the bell button. The device shows a notification when an issue lands on your company or the other company posts an update, and the tab title shows how many items need your company.
  - **Email** (optional, both companies): admins enter notification addresses per company under **Settings → Companies and emails**. Emails are sent through the Firebase *Trigger Email* extension (setup below). Without the extension, email settings are ignored and browser alerts still work.
- **History and export:** every update is kept with who posted it, which company and when. **Settings → Export** downloads all issues as CSV.
- **No connection:** the page shows the last saved list, and changes made offline sync when the network is back.

### Setup

Done once for the shared `ceva-tools` project (see **Firebase** above). Sign in, open **Work items → Settings** and set the company names, overdue hours and notification emails.

### Adding people from both companies

1. Firebase console → **Authentication → Users → Add user** (email + password). Copy the new **User UID**. NCI/Greif people get a login the same way; share the password with them directly, or have them use **Forgot password** on the sign-in screen once their login exists.
2. On the tool: **Settings → People** → paste the UID, add a name, pick the **company** and a **role** → **Add or update person**.

| Role | Can do |
|---|---|
| Viewer | See the board and read issues |
| User | Also raise issues, post updates, hand off, resolve and reopen |
| Admin | Also change settings, manage people and delete issues |

The company decides which items show under **Needs us**, which alerts the person gets, and which side their updates are posted as.

### Email notifications (optional)

Emails are queued in a Firestore collection called `mail`, which the Firebase **Trigger Email from Firestore** extension turns into real emails. The extension needs the project on the Blaze (pay as you go) plan; at a few hundred emails a month the cost is a few cents.

1. Firebase console → **Build → Extensions → Explore** → **Trigger Email from Firestore** → **Install**.
2. Set **Email documents collection** to `mail`, and fill in the SMTP connection URI and default FROM address for the mailbox that should send (your IT team can give you SMTP details for a shared mailbox, or use a service such as SendGrid).
3. Leave the other options at their defaults and finish the install.
4. On the tool, **Settings → Companies and emails** → enter the addresses for each company → **Save settings**.

Each email names the shipment, issue type, who posted and what they wrote, with a link straight to the issue.

### Limits

Firebase's free Spark plan allows 50,000 reads and 20,000 writes a day across both tools, far more than a few people working exceptions will use. Admins can delete resolved issues older than 30 days from **Settings**.
