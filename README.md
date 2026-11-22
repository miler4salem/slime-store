# Slime Boutique — 2.5D Slime Store Game

A cozy top-down (simulated 45-degree 2.5D) slime store simulator where you mix custom slimes, stock shelves around your shop, set prices, and serve customers.

## Features
- **Simulated 45-Degree Top-Down View**: 2.5D boutique interior with Y-sorted shopkeeper, customers, wall shelves, and central display stands.
- **Character Selection**: Choose between a **Female** or **Male** shopkeeper when you start (or switch anytime from the HUD).
- **Slime Mixing Station (Pop-up UI)**:
  - Pick container / toy styles (**Slime Jar**, **Swirl Tub**, **Slime Toy Pack**).
  - Mix primary and secondary swirl colors with a live blend slider and custom color pickers.
  - Add mix-ins: **Sprinkles**, **Glitter**, and **Small Plastic Balls**.
- **Shelf Stocking & Pricing**: Place crafted slimes on wall shelves or middle-of-store stands and set custom retail prices with live fairness feedback.
- **Session Accounting**: Tracks cash balance, revenue, expenses, net profit, items crafted/sold, and a full transaction ledger stored in `sessionStorage` (browser session cache).

## Running Locally
Because the app uses ES Modules, serve the folder with any static web server:

```bash
npx serve .
```

Then open the local URL in your browser.
