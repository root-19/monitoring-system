# Fiesta Gas PGI — LPG Monitoring & Delivery System

*A simple guide to what the system does and how to use it.*

---

## 1. What is this?

A website for Fiesta Gas PGI and its customers. It replaces the notebook, the text-message guessing, and the "ma'am, may gas pa ba kayo?" calls.

- **Customers** register once, pin their house on the map, and can request a refill or message PGI in one tap.
- **PGI staff** see every customer, who is running low, who requested a refill, and send SMS reminders from one screen.

It runs on any phone or computer with a browser. No app store download needed.

---

## 2. How it knows a customer is running low

The system does **not** need a sensor on the tank. It estimates:

1. PGI records each delivery (date, tank size, quantity).
2. Each customer has a usual consumption, for example *one 11 kg tank lasts about 30 days*. PGI can adjust this per customer.
3. From the last delivery date, the system computes how much gas is likely left and how many days remain.

| Status | Meaning |
|---|---|
| **Good** | Plenty left |
| **Getting low** | Around 40% left, plan a refill |
| **Almost empty** | Around 20% left, remind the customer now |
| **Empty** | Past the usual consumption, needs a delivery |

Every new delivery resets the estimate. The more deliveries recorded, the more accurate it becomes.

---

## 3. For customers

### Creating an account

1. Open the website and tap **Get started**.
2. Enter full name, mobile number, and a password.
3. Tap **Use my current location** while at home. The system saves the exact spot and turns it into a readable address.
4. Add a landmark if helpful, for example *beside the sari-sari store, blue gate*.
5. Done. The customer is logged in.

### What a customer can do

- **See gas status.** A gauge shows roughly how much gas is left and how many days remain.
- **Request a refill.** One tap. Choose tank size and quantity, add a note if needed.
- **Track the request.** Pending, accepted, scheduled, delivered. With the schedule date once PGI sets it.
- **Message PGI.** A chat thread with the shop, like Messenger but inside the system.
- **Notifications.** Reminders, delivery confirmations, and replies all in one list.
- **Profile.** Update name, location, landmark, and password.

### SMS reminders

Customers also receive **text messages** on their registered number when gas is running low or a delivery is scheduled. Even customers who never open the website still get the SMS.

---

## 4. For PGI staff (admin)

Log in with the admin number. The admin side has these pages:

| Page | What it is for |
|---|---|
| **Dashboard** | Totals at a glance: customers, pending requests, who is low on gas, queued SMS, unread messages |
| **Clients** | Full customer list with search. Open a customer to see status, history, and edit details |
| **Map** | Every pinned house on one map. Tap a pin to open directions for the rider |
| **Requests** | Refill requests from customers. Accept, schedule a date, mark delivered, or cancel |
| **Deliveries** | Record a delivery (date, tank, quantity, amount). This is what updates the gas estimate |
| **Reminders & SMS** | Send a reminder to one or many customers, and the SMS outbox |
| **Messages** | All customer chats in one inbox |
| **Notifications** | Activity log for the admin |

### Typical daily flow

1. Open **Dashboard**. Check who is *Almost empty* and the new refill requests.
2. In **Requests**, accept and set a schedule. The customer is notified automatically.
3. In **Reminders & SMS**, send the text messages (see below).
4. After the rider delivers, record it in **Deliveries** or mark the request as delivered. The customer's gauge resets.

### How SMS sending works

SMS goes out from **PGI's own SIM**, not a paid texting service, so there is no monthly fee.

1. The system prepares every text and lists it in the **SMS outbox**.
2. On the PGI phone, tap **Send** next to a message. The phone's messaging app opens with the number and text already filled in.
3. Tap send in the messaging app, then tap **Mark as sent** in the system.

Future option: a small PGI-only Android app can send the whole outbox automatically from the same SIM, no tapping per message.

### Adding a customer who cannot register alone

Admin can create the account from **Clients → Add client**, set a starting password, and tell the customer. The customer can change the password later.

---

## 5. Security and roles

- Two roles only: **Admin** (PGI staff) and **Client** (customer).
- Customers can only see and change their own records. Admin pages are blocked for customers, and the server rejects admin actions from customer accounts.
- Passwords are stored encrypted. Nobody, including PGI, can read a customer's password. Admin can **reset** it when asked.
- Sessions expire automatically after 30 days.

---

## 6. What PGI needs to run it

| Item | Needed for | Cost |
|---|---|---|
| A phone with the PGI SIM | Sending SMS reminders | Existing load or unli-text promo |
| Internet on the PGI phone or computer | Using the admin pages | Existing |
| Google Maps key *(optional)* | Interactive map instead of the drawn map | Free tier covers normal use |
| Hosting for the website and database | Keeping the system online 24/7 | Free tier to start, small monthly fee as customers grow |

Setup and hosting are handled by the developer. PGI only needs the phone and the login.

---

## 7. Frequently asked questions

**Does the customer need to install anything?**
No. It is a website. They can add it to their home screen so it looks like an app.

**What if a customer has no smartphone?**
Admin creates the account for them. They still get SMS reminders, and can call or text PGI as before. Everything is recorded on their account.

**What if the estimate is wrong for a customer?**
Open the customer in **Clients** and change *days per tank*. Big families burn gas faster, small households slower.

**Can PGI see the customer's location?**
Only the pin the customer chose, used for delivery. Customers can move or remove the pin anytime.

**Is the SMS automatic?**
The message is prepared automatically; sending is one tap per message from the PGI phone. Full automation from the same SIM is available as an add-on.

---

## 8. Demo script (5 minutes)

1. **Landing page.** Show the hero, the Philippines coverage map, and the signup button.
2. **Register as a customer** on a phone. Use current location, show the address appear.
3. **Customer portal.** Gas gauge, request a refill, send a message.
4. **Switch to admin.** Dashboard shows the new request and message. Accept and schedule it.
5. **Reminders & SMS.** Show the outbox and the one-tap Send on the phone.
6. **Record the delivery.** Go back to the customer portal: gauge is full again, delivery in history.
7. **Map.** Show the customer's pin and the directions button for the rider.
