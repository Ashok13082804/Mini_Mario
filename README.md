# Super Mini Mario Platformer Adventure 🎮

A premium, modern 2D platformer adventure built with clean HTML5 Canvas, Vanilla CSS, and JavaScript. The project utilizes a sophisticated Single Page Application (SPA) dashboard styled with glassmorphism and a light, cheerful aesthetic. It is completely self-contained and operates entirely offline using browser storage and dynamic Web Audio synthesis.

---

## 🌟 Core Features

- **5 Unique Worlds**:
  - 🌲 **Forest World**: Basic platforming introduction, patrolling Goombas.
  - 🏜️ **Desert World**: Slippery quicksand pitfalls, Paratroopas.
  - ❄️ **Ice World**: Slippery ice sliding physics, vertical moving platforms.
  - ☁️ **Sky World**: Fragile clouds, horizontal wind currents pushing you.
  - 🏰 **Castle World**: Lava pools, jumping fireballs, Bowser Boss fight.
- **Dynamic Skill Tree**: Unlock Air Dashing, Slide actions, Double Jumps, Wall Clinging, Shields, and Coin Magnet modifiers using Gems found in secret rooms.
- **Wardrobe Shop**: Spend gold coins to equip Classic, Fire Red, Ice Blue, Gold Emperor, and Cosmic Star skins.
- **Local Progression Slots**: Save, load, and clear your gameplay progress across 3 distinct offline browser slots.
- **Analytics & Trophy Cabinet**: Keep track of total completion percentage, levels cleared, coins collected, enemies defeated, deaths, and local high score boards.
- **Daily Chest Rewards**: Open a gift chest once every 24 hours to earn random coin and gem boosts.
- **Web Audio Synthesis**: Retro sound effects (jumping, damage, power-ups, defeat, clear) and chiptune theme loops synthesized programmatically in real-time.

---

## 🎮 Gameplay Controls

| Action | Keyboard Input | Touch Control (Mobile) |
| --- | --- | --- |
| **Walk Left** | ⬅️ or `A` | D-pad Left Button |
| **Walk Right** | ➡️ or `D` | D-pad Right Button |
| **Crouch / Slide** | ⬇️ or `S` | D-pad Down Button |
| **Jump / Double Jump** | `Space` or `W` or ⬆️ | JUMP Action Button |
| **Air Dash** | `Shift` or `J` | DASH Action Button |
| **Pause Game** | `P` or `Escape` | Pause (⏸️) Header Icon |

---

## 🚀 Running the Game Locally

Since the game does not use any external APIs or dependencies, it runs entirely inside modern web browsers. 

Choose one of the simple steps below depending on your operating system:

### 🍎 For macOS

#### Option A: Built-in Python Server (Recommended)
1. Open your **Terminal** app.
2. Navigate to the game directory and start the server:
   ```bash
   cd /Users/ashokkumar/Downloads/mini_mario
   python3 -m http.server 8000
   ```
3. Open your web browser and navigate to:
   [http://localhost:8000](http://localhost:8000)

#### Option B: Node.js Serve
1. If you have Node.js installed, open **Terminal** and run:
   ```bash
   cd /Users/ashokkumar/Downloads/mini_mario
   npx serve
   ```
2. Open your web browser and go to the link shown in the output (usually `http://localhost:3000`).

---

### 🪟 For Windows

#### Option A: Built-in Python Server
1. Open **Command Prompt** (cmd) or **PowerShell**.
2. Navigate to the game folder and run:
   ```cmd
   cd C:\path\to\your\folder\mini_mario
   python -m http.server 8000
   ```
3. Open your web browser and navigate to:
   [http://localhost:8000](http://localhost:8000)

#### Option B: Node.js Serve
1. Open **Command Prompt** or **PowerShell** and run:
   ```cmd
   cd C:\path\to\your\folder\mini_mario
   npx serve
   ```
2. Open your web browser and go to the link shown in the terminal (usually `http://localhost:3000`).

#### Option C: Direct File Execution
Since the game doesn't load external resources via AJAX requests, you can simply **double-click the `index.html`** file in your File Explorer to run the game immediately without launching any local servers.
