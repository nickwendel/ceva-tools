# CEVA tools

Operational tools for CEVA sites, served with GitHub Pages.

| Tool | Path | What it does |
|---|---|---|
| Receiving dock board | [`dock-board/`](dock-board/) | Floor TV display of trailers in the drop and today's appointments, with priority, door, pathway owner and status. Supervisors update it from a phone. |
| NCI/Greif inbound exceptions | [`nci-inbound/`](nci-inbound/) | Shared log of error shipments (shortages, overages, damage, missing ASN…) worked by CEVA and NCI/Greif together. Either company raises an issue, posts updates, hands it to the other side and resolves it. A board shows what is open and who it is waiting on. |

Shared files live in [`assets/`](assets/): `ceva-logo-white.svg` is the logo used on the navy headers; `ceva-logo.svg` (navy and red) is only the browser-tab icon.

---

## Receiving dock board

**Live page:** `https://bigmuffuletta.github.io/ceva-tools/dock-board/`

- **TV:** open the page, sign in once with the TV's account, tap **Full screen**. It stays signed in, keeps the screen awake where the browser allows, and pages through long lists every 12 seconds.
- **Supervisors:** open the same page on a phone. It opens on the update screen: add trucks, move them along (Arrived → At door → Unloading → Received), set priority and pathway owner, post a notice.
- **No connection:** the TV keeps showing the last saved board and marks itself Offline. Supervisor changes save on the phone and sync when the network is back.

Data lives in a Firebase project (Firestore + Authentication). The page only talks to Firebase; GitHub just serves the files.

### One-time Firebase setup

1. Go to [console.firebase.google.com](https://console.firebase.google.com) → **Add project** → name it (e.g. `ceva-dock-board`) → Google Analytics off → **Create**.
2. **Build → Authentication → Get started → Email/Password → Enable → Save.**
3. **Authentication → Settings → Authorized domains → Add domain:** `bigmuffuletta.github.io`.
4. **Build → Firestore Database → Create database →** pick a US location → **Start in production mode**.
5. **Firestore → Rules:** replace everything with the contents of [`dock-board/firestore.rules`](dock-board/firestore.rules) → **Publish**.
6. **Project settings (gear) → General → Your apps → Web (`</>`)** → nickname `dock-board` → **Register app** (skip Hosting). Copy the `firebaseConfig` values into [`dock-board/firebase-config.js`](dock-board/firebase-config.js) and commit.
7. **Authentication → Users → Add user:** your email and a password. Copy your **User UID** from the list.
8. **Firestore → Data → Start collection** `roles` → Document ID = your User UID → fields: `role` (string) = `admin`, `name` (string) = your name → **Save**.
9. Open the live page, sign in, go to **Update board → Settings → People**.

### Adding people and TVs

1. Firebase console → **Authentication → Users → Add user** (email + password). Copy the new **User UID**.
2. On the board: **Settings → People** → paste the UID, add a name, pick a role → **Add or update person**.

| Role | Use for | Can do |
|---|---|---|
| Viewer | TV screens | See the board |
| Supervisor | Floor leads | Add and update trucks, notice, owner names, clock format |
| Admin | You | Everything, plus site name, TV colors and people |

Anyone who signs in without a role sees only their User UID and a request to send it to the admin.

### Changing the logo

Replace [`assets/ceva-logo-white.svg`](assets/ceva-logo-white.svg) with the same file name. It sits directly on the navy header, so use the white (reversed) version of the logo.

### Limits

Firebase's free Spark plan allows 50,000 reads and 20,000 writes per day. A board with a few screens and a few hundred truck updates a day uses a small fraction of that. Clear received trucks weekly from **Settings → Received trucks**.

### Network

The TV and phones need to reach `gstatic.com`, `googleapis.com` and `firebaseapp.com`, plus `fonts.googleapis.com` for the typeface. If the floor network blocks any of these, ask IT to allow them.

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

### One-time Firebase setup

You can reuse the dock board's Firebase project or make a new one. The steps are the same as for the dock board, with this tool's files:

1. If you are not reusing a project: [console.firebase.google.com](https://console.firebase.google.com) → **Add project** → Google Analytics off → **Create**, then **Build → Authentication → Get started → Email/Password → Enable**, and **Build → Firestore Database → Create database** (US location, production mode).
2. **Authentication → Settings → Authorized domains:** make sure `bigmuffuletta.github.io` is listed.
3. **Firestore → Rules:** if this project is only for this tool, replace everything with [`nci-inbound/firestore.rules`](nci-inbound/firestore.rules). If the project also hosts the dock board, paste the `match /issues/…`, `match /mail/…` and `match /admin/…` blocks from this file into the existing rules, and extend the `roles` rule so `role` may also be `user` and `company` may be `ceva` or `partner`. **Publish.**
4. **Project settings → General → Your apps → Web (`</>`)** → nickname `nci-inbound` → **Register app**. Copy the `firebaseConfig` values into [`nci-inbound/firebase-config.js`](nci-inbound/firebase-config.js) and commit. (Reusing the dock board's app config also works.)
5. **Authentication → Users → Add user:** your email and a password. Copy your **User UID**.
6. **Firestore → Data → Start collection** `roles` → Document ID = your User UID → fields: `role` (string) = `admin`, `company` (string) = `ceva`, `name` (string) = your name → **Save**.
7. Open the live page, sign in, go to **Work items → Settings**: set the company names, overdue hours and notification emails, then add people.

### Adding people from both companies

1. Firebase console → **Authentication → Users → Add user** (email + password). Copy the new **User UID**. NCI/Greif people get a login the same way; share the password with them directly.
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

### Limits and network

Same as the dock board: Firebase's free Spark plan allows 50,000 reads and 20,000 writes a day, far more than a few people working exceptions will use. Admins can delete resolved issues older than 30 days from **Settings**. Browsers need to reach `gstatic.com`, `googleapis.com` and `firebaseapp.com`, plus `fonts.googleapis.com`.
