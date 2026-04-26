# ClubMS — Tester's Guide
### Complete walkthrough for every module and workflow

---

## Table of Contents

1. [Getting Started & Login](#1-getting-started--login)
2. [Who Can See What — Role Reference](#2-who-can-see-what--role-reference)
3. [Dashboard](#3-dashboard)
4. [Procurement Module](#4-procurement-module)
   - Requirements (Purchase Requests)
   - Vendors
   - Purchase Orders
   - Order Tracking
   - Quality & GRC
5. [Store Module](#5-store-module)
   - Inventory
   - GRC / Delivery
   - Internal Requests
   - Order Tracking
   - Assistants
6. [Kitchen Module](#6-kitchen-module)
7. [Banquet Module](#7-banquet-module)
8. [Rooms & Hotel Module](#8-rooms--hotel-module)
9. [Accounts Module](#9-accounts-module)
10. [HR & Staff Module](#10-hr--staff-module)
11. [Directors Module](#11-directors-module)
12. [End-to-End Test Flows](#12-end-to-end-test-flows)
13. [Notifications](#13-notifications)
14. [Club Settings](#14-club-settings)
15. [User Management](#15-user-management)

---

## 1. Getting Started & Login

### How to Log In
1. Open the website URL in your browser.
2. Enter your **Email** and **Password** that the admin provided.
3. Click **Login**.

You will be taken directly to your **Dashboard**, which is personalised based on your role.

### Logging Out
Click the **Logout** icon at the bottom-left of the sidebar.

### Forgot your password?
Contact your system admin (GM / Chairman). They can reset it from User Management.

---

## 2. Who Can See What — Role Reference

| Role | What they can access |
|---|---|
| **Chairman** | Everything — all modules, dashboards, settings |
| **Secretary** | Everything (same as Chairman) |
| **GM** (General Manager) | Everything except Directors page |
| **AGM** (Asst. General Manager) | Everything except Directors page |
| **Procurement Manager** | Dashboard, Procurement module, Store (read-only view) |
| **Procurement Assistant** | Dashboard, Procurement module, Store (read-only view) |
| **Store Manager** | Dashboard, Store module (full), Procurement (view only) |
| **Store Assistant** | Dashboard, Store module (limited — no Assistants tab) |
| **Kitchen Manager** | Dashboard, Kitchen module |
| **Food Control** | Dashboard, Kitchen module |
| **Banquet Manager** | Dashboard, Banquet module |
| **Rooms Manager** | Dashboard, Rooms & Hotel module |
| **Bar Manager** | Dashboard (Bar section) |
| **Sports Manager** | Dashboard (Sports section) |
| **Accounts Manager** | Dashboard, Accounts module |
| **HR Manager** | Dashboard, HR & Staff module |
| **Maintenance Manager** | Dashboard, Maintenance section |

> **Tip:** The sidebar will only show the modules your role has access to. If you don't see a section, you don't have permission for it.

---

## 3. Dashboard

Every role gets a personalised dashboard when they log in.

### What each dashboard shows

**Chairman / Secretary**
- Monthly revenue, occupancy rate, banquet bookings, pending approvals
- Alerts requiring attention (overdue payments, pending PRs)

**GM / AGM**
- Same as Chairman — full operational overview
- Pending Purchase Requests waiting for approval
- Overdue PO payments, GRC alerts

**Procurement Manager**
- Open requirements, POs awaiting approval, overdue deliveries
- Quick action buttons for common tasks

**Store Manager**
- Current stock levels, low-stock alerts
- Incoming deliveries, pending GRC entries

**Kitchen Manager**
- Active material requests, utilization stats

**Banquet Manager**
- Today's events, upcoming bookings, payment due alerts

**Rooms Manager**
- Today's check-ins/check-outs, occupancy stats, payment dues

**Accounts Manager**
- Revenue vs expense summary, PO payments due, overdue installments
- Quick Pay buttons for pending POs

**HR Manager**
- Total staff count, active vs inactive staff

---

## 4. Procurement Module

**Who can access:** Chairman, Secretary, GM, AGM, Procurement Manager, Procurement Assistant

The Procurement module has 5 tabs: **Requirements, Vendors, Purchase Orders, Order Tracking, Quality & GRC**

---

### Tab 1 — Requirements (Purchase Requests)

This is where a procurement request is raised before creating a formal PO.

#### How to create a Requirement
1. Go to **Procurement → Requirements**
2. Click **+ New Requirement**
3. Fill in:
   - **Title** — brief name (e.g. "Monthly kitchen supplies")
   - **Department** — which department needs the items
   - **Priority** — Low / Medium / High / Urgent
   - **Items** — add each item with name, quantity, unit, estimated price
   - **Notes** — any special instructions
4. Click **Submit**

The request is now **pending** and goes to the GM and AGM for approval.

#### What happens next
- The **GM or AGM** will see this in their dashboard and in Procurement → Requirements
- They can **Approve** or **Reject** it
- On approval: Store dept is notified, Procurement is notified
- On rejection: a reason is shown in the requirement card

#### Status flow
```
Draft → Pending → Approved / Rejected
```

---

### Tab 2 — Vendors

Manage suppliers that the club works with.

#### How to add a Vendor
1. Go to **Procurement → Vendors**
2. Click **Add Vendor** sub-tab
3. Fill in:
   - Vendor Name, Contact Person, Phone, Email
   - Address, GST Number
   - Category (e.g. Food, Beverages, Stationery)
   - Payment Terms (e.g. Net-30)
4. Click **Save**

#### Vendor Relations
- Click on any vendor in the **List** to see their full history
- View past POs, total spend, agreement documents
- Upload agreement documents or contracts

---

### Tab 3 — Purchase Orders (POs)

A PO is a formal order raised to a vendor.

#### How to create a PO
1. Go to **Procurement → Purchase Orders**
2. Click **+ New PO**
3. Fill in:
   - **Department** — who is ordering
   - **Vendor** — select from the vendor list (required)
   - **Linked Request** — optionally link to an approved Requirement
   - **Payment Type** — Full / Advance / Installment (this is set initially, Accounts will finalize)
   - **Items** — for each item:
     - Start typing in the item search box → select the matching **store inventory item**
     - The item name, category, unit, and price will auto-fill
     - Enter the **Quantity** needed
     - Adjust **Unit Price** if different
     - Total is auto-calculated
   - **Expected Delivery Date**
   - **Notes**
4. Click **Create PO**

> **Important:** Items must be selected from the store inventory list. This links the PO to the inventory so that when goods arrive, stock updates automatically.

#### PO Approval (GM / AGM only)
1. Open any PO in **Draft** status
2. Click **Approve** — this dispatches the order
3. Or click **Reject/Cancel** with a reason

On approval, notifications are sent to:
- Store (to expect delivery)
- Accounts (to arrange payment)
- Procurement (confirmation)

#### Download PO as PDF
- On any approved PO, click the **Download PDF** button
- The PDF includes: club name & logo, vendor details, item table, totals, approved-by name and timestamp, signature lines

---

### Tab 4 — Order Tracking

Shows all POs and their delivery status at a glance.

- **Draft** — PO created, not yet approved
- **Approved** — approved and sent to vendor
- **Dispatched** — vendor has dispatched the goods
- **Delivered** — goods received (GRC submitted by Store)
- **Cancelled** — PO cancelled

You can update the delivery status for dispatched orders from this tab.

---

### Tab 5 — Quality & GRC

GRC = **Goods Received Certificate** — the document that confirms what was actually delivered.

> This tab is mainly used by the **Store department** (see Store module). Procurement can view GRC records here.

#### Viewing GRC records
- **Upcoming Deliveries** — POs that are approved/dispatched but GRC not yet submitted (sorted by expected delivery date, oldest first)
- **Completed GRCs** — POs where GRC has been submitted and verified (sorted by GRC submission date, newest first)

---

## 5. Store Module

**Who can access:** Chairman, Secretary, GM, AGM, Store Manager, Store Assistant, Procurement Manager (view)

The Store module has up to 6 tabs: **Inventory, GRC / Delivery, Internal Requests, Procurement Reqs, Order Tracking, Assistants**

---

### Tab 1 — Inventory

Complete view of all stock in the store.

#### Viewing inventory
- See all items with current quantity, unit, category, and low-stock alerts
- Filter by category or search by name
- Items highlighted in red/orange are at or below minimum stock level

#### Adding a new inventory item
1. Click **+ Add Item**
2. Fill in:
   - Item Name, Category, Unit (kg/litre/pieces/etc.)
   - Current Quantity, Minimum Quantity (threshold for low-stock alert)
   - Unit Cost (approx.)
3. Click **Save**

#### Manual stock adjustment
1. Click on any item → **Adjust Stock**
2. Choose **Add** (incoming stock) or **Remove** (wastage/issue)
3. Enter quantity and reason
4. Submit — this creates a transaction record

#### View transaction history
Click on any item → **View Transactions** to see every stock movement with date and reason.

---

### Tab 2 — GRC / Delivery

This is where the store records what goods were actually received against a PO.

#### How to submit a GRC (when goods arrive)
1. Go to **Store → GRC / Delivery**
2. Click **+ Submit GRC**
3. **Select the PO** from the dropdown (only shows POs that are approved or dispatched and not yet GRC'd)
4. The items from that PO will auto-load (read-only):
   - Item name
   - Quantity ordered
5. For each item, enter:
   - **Received Quantity** — how much actually arrived
   - **Notes** — any mismatch, damage, or quality issue
6. Upload the **Delivery Challan / Invoice** if available
7. Click **Submit GRC**

**What happens immediately on submission:**
- Inventory quantities are updated automatically (received qty added to stock)
- PO status changes to "Delivered"
- Procurement is notified with ordered vs received comparison
- Accounts is notified that payment is now unlocked (for full payment type)
- GM is notified

#### Verify GRC (Store Manager only)
After submission, the Store Manager reviews and clicks **Verify** to mark the GRC as officially accepted.

#### Viewing records
- **Upcoming Deliveries** — POs expected but not yet received (sorted by expected delivery date)
- **Completed** — GRCs already submitted (sorted by submission date, newest first)

---

### Tab 3 — Internal Requests

Departments within the club request items from the store (e.g. Kitchen asking for cooking oil).

#### How to create an Internal Request
1. Go to **Store → Internal Requests**
2. Click **+ New Request**
3. Select:
   - **Department** requesting
   - **Items** — each with quantity needed
   - **Priority** and **Notes**
4. Submit

#### How Store fulfills a request
1. Open the request in the list
2. Click **Fulfill** — stock is deducted from inventory
3. The requesting department is notified

---

### Tab 4 — Procurement Reqs

Read-only view of approved Procurement Requirements that have been released to the store. The store can see what is incoming.

---

### Tab 5 — Order Tracking

Same as Procurement's Order Tracking — shows all POs and their status. The store uses this to know what deliveries to expect.

---

### Tab 6 — Assistants (Store Manager only)

Store Manager can create and manage Store Assistant accounts from here.

---

## 6. Kitchen Module

**Who can access:** Chairman, Secretary, GM, AGM, Kitchen Manager, Food Control

---

### Requests

Kitchen requests raw materials or ingredients from the Store.

#### How to create a Kitchen Request
1. Go to **Kitchen → Requests**
2. Click **+ New Request**
3. Select items needed with quantities and required date
4. Submit — Store is notified

#### Viewing requests
- See all active and fulfilled requests
- Track which items have been issued by store

---

### Utilization

Tracks how much of each ingredient is being used and returned.

#### Logging returns
1. Click **+ Log Return**
2. Enter items returned to store with quantity and reason
3. Submit — inventory is updated

---

## 7. Banquet Module

**Who can access:** Chairman, Secretary, GM, AGM, Banquet Manager

Manages event hall bookings for weddings, conferences, parties, etc.

---

### How to create a Banquet Booking
1. Go to **Banquet**
2. Click **+ New Booking**
3. Fill in:
   - **Client Name**, Phone, Email
   - **Banquet Type** — Hall A, Hall B, etc.
   - **Slot** — Morning / Afternoon / Evening / Full Day
   - **Booking Date** — pick from calendar
   - **Event Type** — Wedding, Conference, Birthday, etc.
   - **Expected Guests**
   - **Total Amount** and **Advance Payment** collected
   - **Notes**
4. Click **Check Availability** first to confirm the slot is free
5. Click **Create Booking**

### Check Availability
Before creating, you can check if a hall+slot combination is free for a given date using the **Check Availability** button.

### Calendar View
Switch to **Calendar** to see all bookings in a monthly calendar view — very useful for spotting available dates.

### Update Payment
Once advance is received or full payment is cleared:
1. Open the booking
2. Click **Update Payment**
3. Enter amount received and payment mode (Cash / UPI / Card / Cheque)
4. Status updates to Partial or Paid

### Cancel a Booking
Open the booking → click **Cancel** → provide reason. The slot becomes available again.

### Payment Alerts
The system auto-flags bookings where payment is overdue. These appear as alerts in the Banquet dashboard.

---

## 8. Rooms & Hotel Module

**Who can access:** Chairman, Secretary, GM, AGM, Rooms Manager

Manages room inventory and guest bookings.

---

### Setting up Rooms
1. Go to **Rooms & Hotel**
2. Click **+ Add Room**
3. Enter Room Number, Type (Single / Double / Suite / etc.), Floor, Rate per Night
4. Save

### How to create a Room Booking
1. Click **+ New Booking**
2. Fill in:
   - **Guest Name**, Phone, Email, ID Proof
   - **Room** — select from available rooms
   - **Check-In Date** and **Check-Out Date**
   - **No. of Guests**, Special Requests
   - **Total Amount** (auto-calculated from nights × rate)
   - **Advance Payment**
3. Click **Check Availability** to confirm room is free
4. Click **Create Booking**

### Booking Statuses
- **Confirmed** — booking is active
- **Checked In** — guest has arrived
- **Checked Out** — guest has left
- **Cancelled** — booking cancelled

### Updating Booking Status
Open a booking → click **Check In**, **Check Out**, or **Cancel** as appropriate.

### Payment Update
Open a booking → **Update Payment** → enter amount and mode.

---

## 9. Accounts Module

**Who can access:** Chairman, Secretary, GM, AGM, Accounts Manager

The Accounts module has 4 tabs: **P&L Overview, Sales, Expenses, PO Payments**

---

### Tab 1 — P&L Overview

Profit & Loss report for any date range.

- Select **From** and **To** dates
- View total Revenue, total Expenses, and Net Profit/Loss
- See breakdown by category (rooms, banquet, food, etc.)

---

### Tab 2 — Sales

Record and view all revenue transactions.

#### Add a Sale Record
1. Click **+ Add Sale**
2. Enter:
   - Date, Amount, Category, Description
   - Payment Mode
3. Save

---

### Tab 3 — Expenses

Record and view all expense transactions.

#### Add an Expense
1. Click **+ Add Expense**
2. Enter:
   - Date, Amount, Category, Description
   - Payment Mode, Vendor (optional)
3. Save

---

### Tab 4 — PO Payments

This is where Accounts manages all payments against Purchase Orders.

#### Understanding the PO Payment flow
After a PO is approved by GM/AGM, Accounts needs to:
1. **Set a Payment Plan** — choose how the payment will be made
2. **Execute the payment(s)** — mark advance, installments, or full payment as paid

#### How to set a Payment Plan
1. Go to **Accounts → PO Payments**
2. Find the PO (filter by Unpaid tab to see those needing attention)
3. Click **Set Payment Plan**
4. Choose one of three types:

**Full Payment**
- Pay the entire amount after goods are received and GRC is submitted
- No advance, no installments
- Mark as paid after GRC is confirmed

**Advance Payment**
- Pay a portion upfront to the vendor before delivery
- Enter the advance amount
- Accounts can pay the advance immediately (before GRC)
- Remaining balance is paid after GRC is submitted

**Installment / EMI**
- Split the total into monthly or weekly installments
- Enter:
  - Number of installments
  - Interest rate (% per annum — can be 0)
  - Start date (first installment due date)
  - Frequency — Monthly or Weekly
- The system **auto-calculates** the full schedule showing:
  - Interest amount
  - Total payable (principal + interest)
  - EMI per installment
  - Due date for each installment
- Review and confirm — schedule is saved to the PO

#### Paying an Installment
1. On a PO with installment plan, each installment row shows a **Pay** button
2. Click Pay → enter amount, payment mode (Cash/UPI/Card/Cheque/Online), notes
3. Submit — installment marked as Paid with date and who paid it

#### Mark Fully Paid
- Only available after **GRC has been submitted by Store**
- If you try before GRC exists, the system will block and show an error
- Click **Mark Fully Paid** → enter payment mode and notes → Confirm

#### Alert Banners
At the top of PO Payments you will see alert banners:
- **Red banner** — POs with advance type where advance is still pending (urgent)
- **Orange banner** — Installments that are overdue (past due date, not yet paid)

#### Filter Tabs
- **Unpaid** — all POs needing payment action
- **Advance** — POs with advance payment type
- **Installment** — POs with EMI/installment plan
- **All** — everything

---

## 10. HR & Staff Module

**Who can access:** Chairman, Secretary, GM, AGM, HR Manager

---

### Staff List
View all staff members with their role, department, contact, and status.

#### Editing staff details
1. Go to **HR → Staff List**
2. Click **Edit** on any staff member
3. Update Name, Mobile, Department, etc.
4. Save

#### Activate / Deactivate staff
Toggle the **Active/Inactive** switch on any staff card to enable or disable their login.

> **Note:** Deactivating a user prevents them from logging in until reactivated.

---

## 11. Directors Module

**Who can access:** Chairman, Secretary only

Manage the club's Board of Directors.

### How to add a Director
1. Go to **Directors**
2. Click **+ Add Director**
3. Enter Name, Designation, Term Period, Contact, Photo
4. Save

### Editing / Archiving Directors
- Click **Edit** on any director card to update their details
- Click **Archive** to remove them from active listing (they remain in history)

---

## 12. End-to-End Test Flows

These are the complete workflows that span multiple departments. Use these to test how the system works as a whole.

---

### Flow 1 — Procurement Request → PO → GRC → Payment

This is the **core operational flow**. Follow these steps with different user accounts.

**Step 1: Create a Purchase Requirement** *(Login as procurement_manager)*
1. Procurement → Requirements → New Requirement
2. Title: "Kitchen Monthly Supplies", Department: Kitchen, Priority: High
3. Add items: Rice (50 kg), Oil (20 litres), Sugar (30 kg)
4. Submit

**Step 2: Approve the Requirement** *(Login as gm or agm)*
1. Go to Procurement → Requirements
2. Find the new requirement (status: Pending)
3. Click **Approve**
4. Check: notification appears for Store and Procurement

**Step 3: Create a Purchase Order** *(Login as procurement_manager)*
1. Procurement → Purchase Orders → New PO
2. Select Vendor (must have vendors added already)
3. Link the approved Requirement
4. Add items — type in search box, select from store item list
5. Enter quantities and prices
6. Expected Delivery: next week
7. Create PO

**Step 4: Approve the PO** *(Login as gm or agm)*
1. Procurement → Purchase Orders → find the new PO (status: Draft)
2. Click **Approve**
3. Check: notifications go to Store, Accounts, Procurement

**Step 5: Set Payment Plan** *(Login as accounts_manager)*
1. Accounts → PO Payments → find the approved PO
2. Click **Set Payment Plan**
3. Choose Installment: 3 installments, 12% interest, monthly, starting next month
4. Review the calculated schedule (EMI, total with interest)
5. Confirm

**Step 6: Submit GRC** *(Login as store_manager or store_assistant)*
1. Store → GRC / Delivery → Submit GRC
2. Select the PO from dropdown
3. Items auto-load — enter received quantities for each item
4. If any item quantity is less than ordered, note the discrepancy
5. Submit GRC
6. Check: inventory quantities have increased for received items

**Step 7: Pay Installments** *(Login as accounts_manager)*
1. Accounts → PO Payments → find the PO
2. The first installment due date is shown
3. Click **Pay** next to the installment → enter mode and confirm
4. When all installments are paid, PO payment status shows as Paid

---

### Flow 2 — Banquet Booking → Payment

**Step 1:** *(Login as banquet_manager)*
1. Banquet → New Booking
2. Client: Ramesh Sharma, Hall A, Morning slot, next Saturday
3. Event: Wedding, 200 guests
4. Total: ₹50,000, Advance: ₹10,000
5. Check Availability → Create

**Step 2:** *(Login as accounts_manager)*
1. Go to Accounts → Dashboard → find the banquet booking
2. Click Update Payment → enter ₹40,000 balance, UPI → Confirm
3. Payment status shows Paid

---

### Flow 3 — Room Booking → Check-In → Check-Out

**Step 1:** *(Login as rooms_manager)*
1. Rooms → New Booking
2. Guest: Priya K, Deluxe Room, 2 nights
3. Total: ₹3,000, Advance: ₹1,500
4. Check Availability → Create

**Step 2:** On arrival day — open the booking → **Check In**

**Step 3:** On departure day — open the booking → **Check Out**

**Step 4:** *(Login as accounts_manager or rooms_manager)*
Update final payment → Mark as Paid

---

### Flow 4 — Kitchen Request → Store Fulfillment

**Step 1:** *(Login as kitchen_manager)*
1. Kitchen → Requests → New Request
2. Items: Cooking Oil 5 litres, Salt 2 kg
3. Priority: High, Required by: today
4. Submit

**Step 2:** *(Login as store_manager)*
1. Store → Internal Requests → find the kitchen request
2. Click **Fulfill**
3. Inventory deducts automatically
4. Kitchen is notified

---

## 13. Notifications

A **bell icon** at the top of every page shows your unread notifications.

- Click the bell → see all recent notifications with priority colour coding
- **Red alerts** — urgent (overdue payments, blocked actions)
- **Orange warnings** — time-sensitive items
- **Blue info** — general updates (PO approved, GRC submitted)
- **Green success** — completed actions

Click **Mark All as Read** to clear the count.

Notifications are role-specific — you only see notifications relevant to your department.

---

## 14. Club Settings

**Who can access:** Chairman, Secretary, GM

This is where you set up the club's identity. This information appears on all PDFs and documents.

1. Go to Settings (accessible from the top bar or GM/Chairman dashboard)
2. Enter:
   - Club Name
   - Address, City, State, Pincode
   - Phone, Email, Website
   - GST Number
   - Upload Club Logo (image file)
3. Save

> **First-time setup:** Always fill in Club Settings before generating any PO PDFs so the documents show the correct club name and logo.

---

## 15. User Management

**Who can access:** Chairman, Secretary, GM (can create any role), AGM, Store Manager (can create Store Assistants only)

### Creating a new user
1. Go to your Dashboard → User Management (or Settings → Users)
2. Click **+ Add User**
3. Fill in: Name, Email, Password, Role, Department, Mobile
4. Save — the user can now log in with those credentials

### Resetting a password
1. Find the user in the list
2. Click **Edit** → change the password field
3. Save — user should change it after first login

### Deactivating a user
Toggle the **Active** switch to OFF — the user cannot log in until reactivated. All their historical data is preserved.

---

## Quick Reference — Common Actions

| What you want to do | Where to go |
|---|---|
| Raise a purchase request | Procurement → Requirements → + New |
| Approve a purchase request | Procurement → Requirements (as GM/AGM) |
| Create a PO with vendor | Procurement → Purchase Orders → + New PO |
| Approve a PO | Procurement → Purchase Orders (as GM/AGM) |
| Record goods received | Store → GRC / Delivery → Submit GRC |
| Check current stock levels | Store → Inventory |
| Set payment plan for a PO | Accounts → PO Payments → Set Payment Plan |
| Pay a PO installment | Accounts → PO Payments → Pay (on installment row) |
| Book a banquet hall | Banquet → + New Booking |
| Book a hotel room | Rooms & Hotel → + New Booking |
| See P&L report | Accounts → P&L Overview |
| Create a kitchen material request | Kitchen → Requests → + New |
| Add or manage staff | HR → Staff List |
| Manage board of directors | Directors (Chairman/Secretary only) |
| Download PO as PDF | Procurement → Purchase Orders → open PO → Download PDF |
| Set up club name/logo | Settings → Club Settings |
| Add a new system user | User Management (GM/Chairman/Secretary) |
| View all notifications | Bell icon (top right of any page) |

---

*For any issues or questions while testing, please report to the system administrator.*
