// Super Mini Mario App State Controller
// Coordinates UI Views, LocalStorage Slot Profiles, Shops, Upgrades, Quests, and Canvas bindings.

const DEFAULT_STATE = {
  slot: 1,
  username: "Mario Hero",
  level: 1,
  xp: 0,
  xpNeeded: 100,
  coins: 0,
  gems: 0,
  totalCoinsCollected: 0,
  totalGemsFound: 0,
  enemiesDefeated: 0,
  deathCount: 0,
  bossesSlain: 0,
  completedLevelsCount: 0,
  unlockedLevels: {
    "1-1": true,
    "1-2": false,
    "1-3": false,
    "2-1": false,
    "2-2": false,
    "2-3": false,
    "3-1": false,
    "3-2": false,
    "3-3": false,
    "4-1": false,
    "4-2": false,
    "4-3": false,
    "5-1": false,
    "5-2": false,
    "5-3": false
  },
  completedLevels: {},
  levelStars: {},
  levelTimes: {},
  skills: {
    doubleJump: false,
    wallJump: false,
    dash: false,
    slide: false,
    shield: false,
    magnet: false
  },
  equippedSkin: "classic",
  unlockedSkins: ["classic"],
  achievements: [],
  dailyRewardClaimed: null, // timestamp
  questsProgress: {
    "first-step": 0,
    "coin-collector": 0,
    "vanquisher": 0,
    "speed-runner": 0,
    "boss-slayer": 0
  }
};

const QUESTS = [
  { id: "first-step", title: "First Steps", desc: "Complete level 1-1", target: 1, rewardXp: 50, rewardGems: 1 },
  { id: "coin-collector", title: "Gold Collector", desc: "Collect a total of 150 coins", target: 150, rewardXp: 100, rewardGems: 2 },
  { id: "vanquisher", title: "Vanquisher", desc: "Defeat 10 enemies total", target: 10, rewardXp: 150, rewardGems: 3 },
  { id: "speed-runner", title: "Speed Runner", desc: "Complete 1-2 under 40s", target: 1, rewardXp: 200, rewardGems: 2 },
  { id: "boss-slayer", title: "Dragon Slayer", desc: "Defeat Bowser in World 5-3", target: 1, rewardXp: 300, rewardGems: 5 }
];

const ACHIEVEMENTS = [
  { id: "first-jump", title: "First Leap", desc: "Start your very first run.", icon: "🏃" },
  { id: "first-death", title: "Oops!", desc: "Died for the first time.", icon: "💀" },
  { id: "double-jumper", title: "Anti-Gravity", desc: "Unlock the Double Jump skill.", icon: "🚀" },
  { id: "coin-hoarder", title: "Coin Hoarder", desc: "Possess 500 gold coins at once.", icon: "💰" },
  { id: "gem-collector", title: "Gem Hoarder", desc: "Collect 10 total gems.", icon: "💎" },
  { id: "slayer", title: "Koopa Crusher", desc: "Defeat 15 enemies.", icon: "🥾" },
  { id: "bowser-down", title: "Castle Conqueror", desc: "Defeat Bowser and save the kingdom.", icon: "👑" },
  { id: "perfect-clear", desc: "Clear a stage with full health.", title: "Immaculate Run", icon: "🌟" }
];

const SKIN_INFO = {
  classic: { name: "Classic Overalls", desc: "Default red-cap blue overalls style.", cost: 0, icon: "🔴" },
  fire: { name: "Fire Red Cap", desc: "Fiery red cap and white shirt style.", cost: 200, icon: "🔥" },
  ice: { name: "Ice Blue Cap", desc: "Deep frost design with icy details.", cost: 400, icon: "❄️" },
  gold: { name: "Gold Emperor", desc: "Shiny golden texture for royals.", cost: 800, icon: "👑" },
  cosmic: { name: "Cosmic Star", desc: "Space visual overlay, glows in dark areas.", cost: 1500, icon: "🌌" }
};

const WORLD_NAMES = {
  1: { name: "World 1: Whispering Forest", desc: "Lush green platforms, basic enemies, and simple jumping challenges.", theme: "forest" },
  2: { name: "World 2: Dusty Dunes", desc: "Slippery quicksands, heat spike hazards, and flying enemies.", theme: "desert" },
  3: { name: "World 3: Frozen Summit", desc: "Extremely slippery ice physics, falling icicle blocks, and moving ledges.", theme: "ice" },
  4: { name: "World 4: Sky Sanctuary", desc: "Horizontal wind currents, fragile blocks, and massive high-altitude gaps.", theme: "sky" },
  5: { name: "World 5: Bowser's Keep", desc: "Lava streams, jumping fireballs, spinning firebars, and the boss battle.", theme: "castle" }
};

class AppController {
  constructor() {
    this.state = JSON.parse(JSON.stringify(DEFAULT_STATE));
    this.game = null;
    this.currentActiveWorld = 1;
    this.currentActiveSaveSlot = 1;
    
    this.init();
  }

  init() {
    // 1. Load active save slot
    this.loadState(this.currentActiveSaveSlot);
    
    // 2. Bind View switching buttons
    document.querySelectorAll(".nav-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const targetView = btn.getAttribute("data-view");
        this.switchView(targetView);
      });
    });

    // Landing screen triggers
    document.getElementById("btn-start-adventure").addEventListener("click", () => {
      this.switchView("world-map");
    });
    
    document.getElementById("btn-view-profile").addEventListener("click", () => {
      this.switchView("profile");
    });

    // Sound mute trigger
    const muteBtn = document.getElementById("global-mute-btn");
    muteBtn.addEventListener("click", () => {
      if (window.RetroSynth) {
        const nextMuted = !window.RetroSynth.muted;
        window.RetroSynth.setMuted(nextMuted);
        muteBtn.innerText = nextMuted ? "🔇" : "🔊";
      }
    });

    // Start running Audio on first body interaction
    document.body.addEventListener("click", () => {
      if (window.RetroSynth) window.RetroSynth.init();
    }, { once: true });

    // Initialize Game Engine
    this.game = new GameEngine("game-canvas");
    this.setupGameCallbacks();

    // Map selection nodes
    document.querySelectorAll(".world-map-node").forEach(node => {
      node.addEventListener("click", () => {
        const worldVal = parseInt(node.getAttribute("data-world"));
        this.selectWorld(worldVal);
      });
    });

    // Setup skill upgrade triggers
    document.querySelectorAll(".skill-node").forEach(node => {
      node.addEventListener("click", () => {
        const skillKey = node.getAttribute("data-skill");
        this.purchaseSkill(skillKey);
      });
    });

    // Setup Costume purchase and equip
    document.getElementById("btn-equip-skin").addEventListener("click", () => {
      this.equipActivePreviewSkin();
    });

    document.querySelectorAll(".shop-action-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const skinKey = btn.getAttribute("data-skin-btn");
        this.purchaseOrSelectSkin(skinKey);
      });
    });

    // Daily reward chest claim trigger
    document.getElementById("btn-claim-daily").addEventListener("click", () => {
      this.claimDailyReward();
    });

    // Bind settings sliders
    const sfxSlider = document.getElementById("slider-sound-volume");
    sfxSlider.addEventListener("input", (e) => {
      const val = parseFloat(e.target.value);
      if (window.RetroSynth) window.RetroSynth.setSoundVolume(val);
      document.getElementById("sound-vol-txt").innerText = Math.round(val * 100) + "%";
    });

    const musicSlider = document.getElementById("slider-music-volume");
    musicSlider.addEventListener("input", (e) => {
      const val = parseFloat(e.target.value);
      if (window.RetroSynth) window.RetroSynth.setMusicVolume(val);
      document.getElementById("music-vol-txt").innerText = Math.round(val * 100) + "%";
    });

    // Slot managers bind
    document.querySelectorAll('[data-action="load-slot"]').forEach(btn => {
      btn.addEventListener("click", () => {
        const slotNum = parseInt(btn.getAttribute("data-slot"));
        this.loadState(slotNum);
        this.updateSlotUI();
      });
    });

    document.querySelectorAll('[data-action="reset-slot"]').forEach(btn => {
      btn.addEventListener("click", () => {
        const slotNum = parseInt(btn.getAttribute("data-slot"));
        if (confirm(`Are you sure you want to reset Save Slot ${slotNum}?`)) {
          this.resetState(slotNum);
          this.updateSlotUI();
        }
      });
    });

    // Settings adjustments Accessibility
    document.getElementById("toggle-high-contrast").addEventListener("change", (e) => {
      if (e.target.checked) {
        document.body.classList.add("high-contrast");
      } else {
        document.body.classList.remove("high-contrast");
      }
    });

    // Pause on Blur accessibility trigger
    window.addEventListener("blur", () => {
      const pauseOnBlur = document.getElementById("toggle-pause-on-blur").checked;
      if (this.game.isPlaying && !this.game.isPaused && pauseOnBlur) {
        this.pauseGame();
      }
    });

    // Keyboard shortcut for pausing (P or Escape)
    window.addEventListener("keydown", (e) => {
      if (e.key.toLowerCase() === "p" || e.key === "Escape") {
        if (this.game.isPlaying && this.game.isStarted) {
          if (this.game.isPaused) {
            this.resumeGame();
          } else {
            this.pauseGame();
          }
        }
      }
    });

    // Canvas overlay buttons
    document.getElementById("btn-play-now").addEventListener("click", () => {
      document.getElementById("overlay-start").classList.add("hidden");
      this.game.isStarted = true;
      
      // Start chiptune track
      const worldNum = parseInt(this.game.activeLevelId.split("-")[0]);
      const themeKey = WORLD_NAMES[worldNum].theme;
      if (window.RetroSynth) window.RetroSynth.playMusic(themeKey);

      // Trigger first run jump achievement
      this.triggerAchievement("first-jump");
    });

    document.getElementById("btn-pause").addEventListener("click", () => this.pauseGame());
    document.getElementById("btn-resume").addEventListener("click", () => this.resumeGame());
    document.getElementById("btn-restart").addEventListener("click", () => this.restartLevel());
    document.getElementById("btn-quit").addEventListener("click", () => this.quitToMap());

    document.getElementById("btn-go-retry").addEventListener("click", () => this.restartLevel());
    document.getElementById("btn-go-quit").addEventListener("click", () => this.quitToMap());

    document.getElementById("btn-victory-continue").addEventListener("click", () => this.quitToMap());
    document.getElementById("btn-victory-replay").addEventListener("click", () => this.restartLevel());

    // Game Mode selection card toggles
    document.querySelectorAll(".mode-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".mode-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        
        const mode = btn.getAttribute("data-mode");
        // Reload current stage with new mode
        this.startLevel(this.game.activeLevelId, mode);
      });
    });

    // Render initial views
    this.selectWorld(1);
    this.updateSlotUI();
    this.updateUI();

    // Start Animation Render loop
    let lastTime = 0;
    const gameLoop = (timestamp) => {
      if (!lastTime) lastTime = timestamp;
      const elapsed = timestamp - lastTime;
      lastTime = timestamp;

      // Restrict delta scaling for giant jumps during frame drops
      const cappedDelta = Math.min(elapsed, 100);
      
      this.game.update(cappedDelta);
      this.game.draw();

      requestAnimationFrame(gameLoop);
    };
    requestAnimationFrame(gameLoop);
  }

  // CORE VIEW SWITCHER
  switchView(viewId) {
    // Show top navigation bar
    const mainNav = document.getElementById("main-nav");
    const topBar = document.getElementById("top-bar");

    if (viewId === "landing") {
      mainNav.classList.add("hidden");
      topBar.classList.add("hidden");
    } else {
      mainNav.classList.remove("hidden");
      topBar.classList.remove("hidden");
      
      // Update top header title
      const titleMapping = {
        "world-map": "Adventure World Map",
        "game": "Play Level",
        "profile": "Player Profile & Analytics",
        "skills": "Upgrade Skills",
        "shop": "Wardrobe Shop",
        "missions": "Active Quests",
        "settings": "Game Settings"
      };
      document.getElementById("active-view-title").innerText = titleMapping[viewId] || "Adventure";
    }

    // Toggle active link indicator
    document.querySelectorAll(".nav-btn").forEach(btn => {
      if (btn.getAttribute("data-view") === viewId) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

    // Toggle View DOM
    document.querySelectorAll(".view").forEach(view => {
      if (view.id === `${viewId}-view`) {
        view.classList.add("active");
      } else {
        view.classList.remove("active");
      }
    });

    // Stop active chiptune loop if leaving game screen
    if (viewId !== "game" && this.game.isPlaying) {
      this.game.isPlaying = false;
      if (window.RetroSynth) window.RetroSynth.stopMusic();
    }

    // If switching to Play Level and no level is active, load latest unlocked level
    if (viewId === "game" && !this.game.activeLevelId) {
      const latestLvl = this.getLatestUnlockedLevel();
      this.startLevel(latestLvl, this.game.currentMode || "standard");
    }

    // Update profile calculations when looking at profile tab
    if (viewId === "profile") {
      this.renderAchievementsGrid();
      this.renderLeaderboard("speedrun");
    }

    this.updateUI();
  }

  getLatestUnlockedLevel() {
    for (let w = 5; w >= 1; w--) {
      for (let l = 3; l >= 1; l--) {
        const lvlId = `${w}-${l}`;
        if (this.state.unlockedLevels[lvlId]) {
          return lvlId;
        }
      }
    }
    return "1-1";
  }

  // SLOT PROGRESS MANAGER
  loadState(slotNum) {
    this.currentActiveSaveSlot = slotNum;
    const loadedData = localStorage.getItem(`super_mario_save_slot_${slotNum}`);
    if (loadedData) {
      this.state = JSON.parse(loadedData);
      // Ensure backward compatibility of parameters if updates are made
      this.state = Object.assign({}, DEFAULT_STATE, this.state);
    } else {
      this.state = JSON.parse(JSON.stringify(DEFAULT_STATE));
      this.state.slot = slotNum;
    }
    
    // Update synth volumes based on slot load
    const sfxVal = parseFloat(document.getElementById("slider-sound-volume").value);
    const musicVal = parseFloat(document.getElementById("slider-music-volume").value);
    if (window.RetroSynth) {
      window.RetroSynth.setSoundVolume(sfxVal);
      window.RetroSynth.setMusicVolume(musicVal);
    }

    this.updateUI();
  }

  saveState() {
    localStorage.setItem(`super_mario_save_slot_${this.currentActiveSaveSlot}`, JSON.stringify(this.state));
    this.updateSlotUI();
  }

  resetState(slotNum) {
    localStorage.removeItem(`super_mario_save_slot_${slotNum}`);
    if (slotNum === this.currentActiveSaveSlot) {
      this.loadState(slotNum);
    }
  }

  updateSlotUI() {
    for (let slot = 1; slot <= 3; slot++) {
      const data = localStorage.getItem(`super_mario_save_slot_${slot}`);
      const infoEl = document.getElementById(`slot-${slot}-info`);
      const cardEl = document.querySelector(`.save-slot-card[data-slot="${slot}"]`);

      if (slot === this.currentActiveSaveSlot) {
        cardEl.classList.add("active");
      } else {
        cardEl.classList.remove("active");
      }

      if (data) {
        const parsed = JSON.parse(data);
        const count = Object.values(parsed.completedLevels).filter(Boolean).length;
        infoEl.innerText = `Coins: ${parsed.coins} | Levels Clear: ${count}`;
      } else {
        infoEl.innerText = "Empty Save Slot";
      }
    }
  }

  // VIEW RENDERS & UI UPDATES
  updateUI() {
    // Top Bar numbers
    document.getElementById("global-coins").innerText = this.state.coins;
    document.getElementById("global-gems").innerText = this.state.gems;
    document.getElementById("global-xp").innerText = `${this.state.xp} XP`;

    // Sidebar small stats
    document.getElementById("nav-level").innerText = this.state.level;
    document.getElementById("nav-username").innerText = this.state.username;

    // Profile card parameters
    document.getElementById("profile-lvl-num").innerText = this.state.level;
    document.getElementById("profile-xp-curr").innerText = this.state.xp;
    document.getElementById("profile-xp-next").innerText = this.state.xpNeeded;
    
    const xpPercent = Math.round((this.state.xp / this.state.xpNeeded) * 100);
    document.getElementById("profile-xp-pct").innerText = `${xpPercent}%`;
    document.getElementById("profile-xp-fill").style.width = `${xpPercent}%`;

    // Completion percentage calculation
    const completedCount = Object.values(this.state.completedLevels).filter(Boolean).length;
    const completionPercent = Math.round((completedCount / 15) * 100);
    document.getElementById("profile-complete-pct").innerText = `${completionPercent}%`;
    document.getElementById("profile-complete-fill").style.width = `${completionPercent}%`;

    // Statistics dashboard
    document.getElementById("stat-completed-levels").innerText = `${completedCount}/15`;
    document.getElementById("stat-coins-collected").innerText = this.state.totalCoinsCollected;
    document.getElementById("stat-gems-found").innerText = this.state.totalGemsFound;
    document.getElementById("stat-enemies-defeated").innerText = this.state.enemiesDefeated;
    document.getElementById("stat-death-count").innerText = this.state.deathCount;
    document.getElementById("stat-bosses-slain").innerText = this.state.bossesSlain;

    // Upgrade Skill statuses
    document.querySelectorAll(".skill-node").forEach(node => {
      const skillKey = node.getAttribute("data-skill");
      const isUnlocked = this.state.skills[skillKey];
      
      node.className = "skill-node"; // Reset class names
      const statusEl = node.querySelector(".skill-status");

      if (isUnlocked) {
        node.classList.add("unlocked");
        statusEl.innerText = "Active";
      } else {
        node.classList.add("locked");
        statusEl.innerText = "Locked";
      }
    });

    // Wardrobe previews
    const previewSprite = document.getElementById("preview-sprite-graphic");
    const previewName = document.getElementById("preview-skin-name");
    const previewDesc = document.getElementById("preview-skin-desc");
    const equipBtn = document.getElementById("btn-equip-skin");
    
    // Default preview based on equipped
    const activePreview = this.state.equippedSkin;
    previewSprite.innerText = SKIN_INFO[activePreview].icon;
    previewName.innerText = SKIN_INFO[activePreview].name;
    previewDesc.innerText = SKIN_INFO[activePreview].desc;
    
    if (this.state.equippedSkin === activePreview) {
      equipBtn.innerText = "Equipped";
      equipBtn.disabled = true;
    } else {
      equipBtn.innerText = "Equip Skin";
      equipBtn.disabled = false;
    }

    // Refresh Shop layouts
    document.querySelectorAll(".shop-card").forEach(card => {
      const skinKey = card.getAttribute("data-skin");
      const isOwned = this.state.unlockedSkins.includes(skinKey);
      const isEquipped = this.state.equippedSkin === skinKey;
      const btn = card.querySelector(".shop-action-btn");
      
      const costEl = card.querySelector(".shop-cost");
      if (isOwned) {
        if (costEl) costEl.style.display = "none";
        btn.className = "btn shop-action-btn " + (isEquipped ? "btn-secondary" : "btn-primary");
        btn.innerText = isEquipped ? "Equipped" : "Equip";
      } else {
        if (costEl) costEl.style.display = "block";
        btn.className = "btn btn-primary shop-action-btn";
        btn.innerText = `Buy Skin`;
      }
    });

    // Render maps unlocked node styles
    for (let w = 1; w <= 5; w++) {
      const nodeEl = document.querySelector(`.world-map-node[data-world="${w}"]`);
      const isWorldUnlocked = this.checkWorldUnlocked(w);
      const pEl = nodeEl.querySelector(".node-progress");

      if (isWorldUnlocked) {
        nodeEl.classList.remove("locked");
        
        // Count levels completed in this world
        let worldClearCount = 0;
        for (let l = 1; l <= 3; l++) {
          if (this.state.completedLevels[`${w}-${l}`]) worldClearCount++;
        }
        pEl.innerText = `${worldClearCount}/3 Cleared`;
      } else {
        nodeEl.classList.add("locked");
        pEl.innerText = "Locked";
      }

      if (w === this.currentActiveWorld) {
        nodeEl.classList.add("active");
      } else {
        nodeEl.classList.remove("active");
      }
    }

    this.renderQuests();
    this.updateDailyTimer();
  }

  // WORLD NAVIGATION MAP
  checkWorldUnlocked(worldNum) {
    if (worldNum === 1) return true;
    
    // World is unlocked if level 3 of previous world is cleared
    const prevWorldLevel3 = `${worldNum-1}-3`;
    return !!this.state.completedLevels[prevWorldLevel3];
  }

  selectWorld(worldVal) {
    if (!this.checkWorldUnlocked(worldVal)) return;

    this.currentActiveWorld = worldVal;
    
    document.getElementById("current-world-name").innerText = WORLD_NAMES[worldVal].name;
    document.getElementById("current-world-description").innerText = WORLD_NAMES[worldVal].desc;

    // Redraw node maps selections
    this.renderLevelsGrid(worldVal);
    this.updateUI();
  }

  renderLevelsGrid(worldVal) {
    const grid = document.getElementById("levels-grid");
    grid.innerHTML = ""; // Clear existing

    // Each world has 3 levels
    for (let levelNum = 1; levelNum <= 3; levelNum++) {
      const levelId = `${worldVal}-${levelNum}`;
      const isLevelUnlocked = this.checkLevelUnlocked(levelId);
      
      const card = document.createElement("div");
      card.className = "level-card";
      if (!isLevelUnlocked) card.classList.add("locked");

      // Card Header
      const header = document.createElement("div");
      header.className = "level-card-header";
      
      const titleNum = document.createElement("span");
      titleNum.className = "level-num";
      titleNum.innerText = levelNum === 3 ? "BOSS BATTLE" : `Stage ${levelId}`;
      header.appendChild(titleNum);

      // Star display
      if (isLevelUnlocked) {
        const starCount = this.state.levelStars[levelId] || 0;
        const stars = document.createElement("span");
        stars.className = "level-stars";
        stars.innerText = "⭐".repeat(starCount) + "☆".repeat(3 - starCount);
        header.appendChild(stars);
      }
      card.appendChild(header);

      // Details
      const title = document.createElement("div");
      title.className = "level-title";
      if (levelNum === 3) {
        title.innerText = "Confront the Beast";
      } else {
        const titles = ["Grasslands Rise", "Underground Caverns", "Desert Heat", "Oasis Climb", "Glacier Rush", "Subzero Cave", "Cloud Path", "Wind Stream", "Keep Entry", "Bowser Arena"];
        const idx = (worldVal - 1) * 2 + (levelNum - 1);
        title.innerText = titles[idx] || "Adventure Stage";
      }
      card.appendChild(title);

      // Records
      if (isLevelUnlocked && this.state.levelTimes[levelId]) {
        const timeVal = document.createElement("div");
        timeVal.className = "level-time-record";
        timeVal.innerText = `Record: ${Math.round(this.state.levelTimes[levelId])}s`;
        card.appendChild(timeVal);
      } else if (!isLevelUnlocked) {
        const lockTxt = document.createElement("div");
        lockTxt.className = "level-time-record";
        lockTxt.innerText = "🔐 Blocked";
        card.appendChild(lockTxt);
      }

      // Add click event
      if (isLevelUnlocked) {
        card.addEventListener("click", () => {
          this.startLevel(levelId);
        });
      }

      grid.appendChild(card);
    }
  }

  checkLevelUnlocked(levelId) {
    const parts = levelId.split("-");
    const world = parseInt(parts[0]);
    const num = parseInt(parts[1]);

    if (world === 1 && num === 1) return true;

    if (num === 1) {
      // First level of world checks if previous world level 3 completed
      return !!this.state.completedLevels[`${world-1}-3`];
    } else {
      // Stage 2 & 3 checks if stage 1 & 2 completed
      return !!this.state.completedLevels[`${world}-${num-1}`];
    }
  }

  // GAME ENGINE RUNNING
  startLevel(levelId, mode = "standard") {
    // Fire initialization first to populate activeLevelId and prevent recursion
    this.game.initLevel(levelId, mode, this.state.skills, this.state.equippedSkin);

    this.switchView("game");
    
    // Update layout title overlays
    document.getElementById("overlay-level-title").innerText = `World ${levelId}`;
    document.getElementById("overlay-start").classList.remove("hidden");
    document.getElementById("overlay-pause").classList.add("hidden");
    document.getElementById("overlay-gameover").classList.add("hidden");
    document.getElementById("overlay-victory").classList.add("hidden");

    // Clear controls
    this.game.keys = { left: false, right: false, up: false, down: false, dash: false };
  }

  setupGameCallbacks() {
    this.game.onUpdateHUD = (hudData) => {
      document.getElementById("hud-lives").innerText = hudData.lives;
      document.getElementById("hud-coins").innerText = String(hudData.coins).padStart(3, "0");
      document.getElementById("hud-gems").innerText = String(hudData.gems).padStart(2, "0");
      document.getElementById("hud-timer").innerText = String(hudData.time).padStart(3, "0");
      document.getElementById("hud-score").innerText = String(hudData.score).padStart(5, "0");

      // Dynamic Circular Timers inside game HUD overlay
      const timersContainer = document.getElementById("powerup-timers");
      timersContainer.innerHTML = "";

      if (hudData.shield) {
        timersContainer.innerHTML += `<div class="powerup-timer-pill">🛡️ Shield Active</div>`;
      }
      if (hudData.magnet) {
        timersContainer.innerHTML += `<div class="powerup-timer-pill">🧲 Magnet Active</div>`;
      }
      if (this.game.player.isInvincible && this.game.player.invincibilityTimer > 1.5) {
        timersContainer.innerHTML += `<div class="powerup-timer-pill">🌟 Star Invincibility</div>`;
      }
    };

    this.game.onGameOver = () => {
      // Increment death metrics
      this.state.deathCount++;
      
      // Update Quests Check
      this.saveState();
      
      // Trigger achievements check
      this.triggerAchievement("first-death");
      
      document.getElementById("overlay-gameover").classList.remove("hidden");
    };

    this.game.onLevelWin = (winData) => {
      const lvlId = this.game.activeLevelId;
      
      // 1. Mark Level Unlocked
      this.state.completedLevels[lvlId] = true;
      
      // Unlock next stage logic
      const parts = lvlId.split("-");
      const w = parseInt(parts[0]);
      const n = parseInt(parts[1]);
      let nextLvl = "";
      if (n < 3) {
        nextLvl = `${w}-${n+1}`;
      } else {
        nextLvl = `${w+1}-1`;
      }
      if (this.state.unlockedLevels.hasOwnProperty(nextLvl)) {
        this.state.unlockedLevels[nextLvl] = true;
      }

      // 2. Stars Rating Calculation (Max 3 stars)
      // Stars based on speed and coins
      let stars = 1;
      if (winData.time < 50) stars++;
      if (winData.coins > 10) stars++;
      
      const prevStars = this.state.levelStars[lvlId] || 0;
      if (stars > prevStars) this.state.levelStars[lvlId] = stars;

      // 3. Record Time
      const prevTime = this.state.levelTimes[lvlId] || 9999;
      if (winData.time < prevTime) this.state.levelTimes[lvlId] = winData.time;

      // 4. Score coins gems rewards
      this.state.coins += winData.coins;
      this.state.gems += winData.gems;
      this.state.totalCoinsCollected += winData.coins;
      this.state.totalGemsFound += winData.gems;
      
      // Slain boss stats
      if (n === 3) {
        this.state.bossesSlain++;
        if (w === 5) this.triggerAchievement("bowser-down");
      }

      // XP awards
      const xpReward = 40 + stars * 15;
      this.awardXP(xpReward);

      // Quests checks update
      this.updateQuestProgress("first-step", 1);
      this.updateQuestProgress("coin-collector", winData.coins);
      if (lvlId === "1-2" && winData.time < 40) {
        this.updateQuestProgress("speed-runner", 1);
      }
      if (lvlId === "5-3") {
        this.updateQuestProgress("boss-slayer", 1);
      }

      // Achievement checks
      if (this.state.totalCoinsCollected >= 500) this.triggerAchievement("coin-hoarder");
      if (this.state.totalGemsFound >= 10) this.triggerAchievement("gem-collector");
      if (this.game.player.lives === 3) this.triggerAchievement("perfect-clear");

      this.saveState();
      
      // Show screen details
      document.getElementById("victory-level-name").innerText = `Stage ${lvlId} Cleared`;
      document.getElementById("victory-time").innerText = Math.round(winData.time);
      document.getElementById("victory-coins").innerText = winData.coins;
      document.getElementById("victory-gems").innerText = winData.gems;
      document.getElementById("victory-xp").innerText = `+${xpReward} XP`;
      
      // Update HTML stars icons display
      const starsCon = document.getElementById("victory-stars");
      starsCon.innerHTML = "⭐".repeat(stars) + "☆".repeat(3 - stars);

      document.getElementById("overlay-victory").classList.remove("hidden");
    };
  }

  awardXP(val) {
    this.state.xp += val;
    while (this.state.xp >= this.state.xpNeeded) {
      this.state.xp -= this.state.xpNeeded;
      this.state.level++;
      this.state.xpNeeded = Math.round(this.state.xpNeeded * 1.3);
      
      // Notify player of Level Up
      this.showToast("Level Up!", `Congratulations, you reached Level ${this.state.level}!`);
    }
  }

  // PAUSE CONTROLLER ACTIONS
  pauseGame() {
    if (!this.game.isPlaying || !this.game.isStarted) return;
    this.game.isPaused = true;
    document.getElementById("overlay-pause").classList.remove("hidden");
    if (window.RetroSynth) window.RetroSynth.stopMusic();
  }

  resumeGame() {
    this.game.isPaused = false;
    document.getElementById("overlay-pause").classList.add("hidden");
    
    // Resume music
    const worldNum = parseInt(this.game.activeLevelId.split("-")[0]);
    const themeKey = WORLD_NAMES[worldNum].theme;
    if (window.RetroSynth) window.RetroSynth.playMusic(themeKey);
  }

  restartLevel() {
    // Reset check points if restarting standard mode
    this.game.checkpointReached = null;
    this.startLevel(this.game.activeLevelId, this.game.currentMode);
  }

  quitToMap() {
    this.switchView("world-map");
  }

  // UPGRADE SKILLS PURCHASES
  purchaseSkill(skillKey) {
    const isUnlocked = this.state.skills[skillKey];
    if (isUnlocked) {
      this.showToast("Active Skill", `${skillKey} upgrade is already equipped!`);
      return;
    }

    const node = document.getElementById(`skill-${skillKey}`);
    const cost = parseInt(node.getAttribute("data-cost"));

    if (this.state.gems >= cost) {
      this.state.gems -= cost;
      this.state.skills[skillKey] = true;
      
      if (skillKey === "doubleJump") this.triggerAchievement("double-jumper");
      
      if (window.RetroSynth) window.RetroSynth.playPowerup();
      this.showToast("Skill Unlocked!", `Ability ${skillKey} is now active.`);
      this.saveState();
      this.updateUI();
    } else {
      this.showToast("Lacking Gems!", `You need 💎 ${cost} Gems for this upgrade.`);
    }
  }

  // COSTUMES SHOP
  purchaseOrSelectSkin(skinKey) {
    const isOwned = this.state.unlockedSkins.includes(skinKey);
    const cost = SKIN_INFO[skinKey].cost;

    if (isOwned) {
      // Equip Skin
      this.state.equippedSkin = skinKey;
      this.showToast("Outfit Swapped!", `Equipped the ${SKIN_INFO[skinKey].name}.`);
      this.saveState();
      this.updateUI();
    } else {
      // Buy skin
      if (this.state.coins >= cost) {
        this.state.coins -= cost;
        this.state.unlockedSkins.push(skinKey);
        this.state.equippedSkin = skinKey;
        
        if (window.RetroSynth) window.RetroSynth.playPowerup();
        this.showToast("Skin Purchased!", `Unlocked ${SKIN_INFO[skinKey].name}.`);
        this.saveState();
        this.updateUI();
      } else {
        this.showToast("Lacking Coins!", `You need 🪙 ${cost} Coins to buy this.`);
      }
    }
  }

  equipActivePreviewSkin() {
    this.showToast("Wardrobe Sync", "Outfit equipped successfully.");
  }

  // CLAIM DAILY REWARDS
  claimDailyReward() {
    const now = Date.now();
    const lastClaim = this.state.dailyRewardClaimed;

    // Check if 24 hours elapsed (86400000 ms)
    if (!lastClaim || now - lastClaim >= 86400000) {
      const awardCoins = Math.floor(Math.random() * 101) + 50; // 50 - 150 coins
      const awardGems = Math.floor(Math.random() * 3) + 1; // 1 - 3 gems

      this.state.coins += awardCoins;
      this.state.gems += awardGems;
      this.state.totalCoinsCollected += awardCoins;
      this.state.totalGemsFound += awardGems;
      this.state.dailyRewardClaimed = now;

      // Play nice synth sound
      if (window.RetroSynth) window.RetroSynth.playWin();

      this.showToast("Chest Claimed!", `Claimed 🪙 ${awardCoins} and 💎 ${awardGems}!`);
      
      // Animate Chest graphic bounce
      const chest = document.getElementById("chest-graphic");
      chest.innerText = "🔓";
      setTimeout(() => chest.innerText = "🎁", 3000);

      this.saveState();
      this.updateUI();
    } else {
      this.showToast("Not Ready!", "Daily Chest is on cooldown. Check back later.");
    }
  }

  updateDailyTimer() {
    const lastClaim = this.state.dailyRewardClaimed;
    const timerEl = document.getElementById("daily-claim-timer");
    const claimBtn = document.getElementById("btn-claim-daily");

    if (!lastClaim) {
      timerEl.innerText = "Ready to Claim!";
      claimBtn.disabled = false;
      return;
    }

    const now = Date.now();
    const diff = 86400000 - (now - lastClaim);

    if (diff <= 0) {
      timerEl.innerText = "Ready to Claim!";
      claimBtn.disabled = false;
    } else {
      // Show countdown hours:minutes:seconds
      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      
      timerEl.innerText = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
      claimBtn.disabled = true;
      
      // Update scheduler timer ticking
      setTimeout(() => this.updateDailyTimer(), 1000);
    }
  }

  // ACTIVE QUESTS PANEL
  updateQuestProgress(questId, incrementVal) {
    const quest = QUESTS.find(q => q.id === questId);
    if (!quest) return;

    const currProgress = this.state.questsProgress[questId] || 0;
    if (currProgress >= quest.target) return; // Already cleared

    const nextProgress = Math.min(currProgress + incrementVal, quest.target);
    this.state.questsProgress[questId] = nextProgress;

    // Check completed
    if (nextProgress >= quest.target) {
      this.state.coins += 200; // Quest coin reward
      this.state.gems += quest.rewardGems;
      this.awardXP(quest.rewardXp);
      this.showToast("Quest Completed!", `Finished: ${quest.title}!`);
    }
  }

  renderQuests() {
    const listCon = document.getElementById("quests-list-container");
    listCon.innerHTML = "";

    QUESTS.forEach(quest => {
      const progress = this.state.questsProgress[quest.id] || 0;
      const isCompleted = progress >= quest.target;

      const item = document.createElement("div");
      item.className = "quest-item";
      if (isCompleted) item.classList.add("quest-completed");

      // Details
      const details = document.createElement("div");
      details.className = "quest-details";
      
      const title = document.createElement("div");
      title.className = "quest-title";
      title.innerText = quest.title + (isCompleted ? " (Completed) ✅" : "");
      details.appendChild(title);

      const desc = document.createElement("span");
      desc.style.fontSize = "11px";
      desc.style.color = "var(--text-muted)";
      desc.innerText = `${quest.desc} (${progress}/${quest.target})`;
      details.appendChild(desc);

      // Progress bar
      const progressBg = document.createElement("div");
      progressBg.className = "quest-progress-bg";
      
      const progressFill = document.createElement("div");
      progressFill.className = "quest-progress-fill";
      progressFill.style.width = `${(progress / quest.target) * 100}%`;
      progressBg.appendChild(progressFill);
      details.appendChild(progressBg);

      item.appendChild(details);

      // Reward
      const reward = document.createElement("div");
      reward.className = "quest-reward";
      reward.innerText = `+${quest.rewardXp} XP \n 💎 ${quest.rewardGems}`;
      item.appendChild(reward);

      listCon.appendChild(item);
    });
  }

  // ACHIEVEMENTS
  triggerAchievement(id) {
    if (this.state.achievements.includes(id)) return; // already unlocked

    this.state.achievements.push(id);
    this.saveState();
    
    // Play achievement unlocked toast alert
    const achObj = ACHIEVEMENTS.find(a => a.id === id);
    if (achObj) {
      document.getElementById("toast-name").innerText = achObj.title;
      const toast = document.getElementById("achievement-toast");
      
      // Play sound
      if (window.RetroSynth) window.RetroSynth.playCoin();

      toast.classList.remove("hidden");
      setTimeout(() => toast.classList.add("hidden"), 4000);
    }
  }

  renderAchievementsGrid() {
    const grid = document.getElementById("achievements-grid");
    grid.innerHTML = "";

    ACHIEVEMENTS.forEach(ach => {
      const isUnlocked = this.state.achievements.includes(ach.id);

      const card = document.createElement("div");
      card.className = "achievement-card-el";
      if (isUnlocked) card.classList.add("unlocked");

      const icon = document.createElement("div");
      icon.className = "badge-icon";
      icon.innerText = isUnlocked ? ach.icon : "🔒";
      card.appendChild(icon);

      const info = document.createElement("div");
      info.className = "badge-info";
      
      const title = document.createElement("h4");
      title.innerText = ach.title;
      info.appendChild(title);

      const desc = document.createElement("p");
      desc.innerText = ach.desc;
      info.appendChild(desc);

      card.appendChild(info);
      grid.appendChild(card);
    });
  }

  // LOCAL LEADERBOARDS
  renderLeaderboard(boardType) {
    const body = document.getElementById("leaderboard-body");
    body.innerHTML = "";

    // Generate simulated/stored rankings based on unlocked levels
    const levelsList = ["1-1", "1-2", "1-3", "2-1", "2-2", "3-1", "4-1", "5-3"];
    
    levelsList.forEach(levelId => {
      const row = document.createElement("tr");
      
      const lvlTd = document.createElement("td");
      lvlTd.innerText = `World ${levelId}`;
      row.appendChild(lvlTd);

      const valTd = document.createElement("td");
      if (boardType === "speedrun") {
        const time = this.state.levelTimes[levelId];
        valTd.innerText = time ? `${Math.round(time)} seconds` : "No Record";
      } else {
        const stars = this.state.levelStars[levelId] || 0;
        valTd.innerText = stars > 0 ? `${stars * 120} Coins` : "No Record";
      }
      row.appendChild(valTd);

      const rankTd = document.createElement("td");
      const hasRecord = boardType === "speedrun" ? !!this.state.levelTimes[levelId] : (this.state.levelStars[levelId] || 0) > 0;
      rankTd.innerText = hasRecord ? "🥇 #1 Local" : "---";
      row.appendChild(rankTd);

      body.appendChild(row);
    });
  }

  // TOAST WRAPPER
  showToast(title, desc) {
    const toast = document.getElementById("achievement-toast");
    document.getElementById("toast-name").innerText = `${title} - ${desc}`;
    toast.classList.remove("hidden");
    setTimeout(() => toast.classList.add("hidden"), 3000);
  }
}

// Instantiate on startup
window.addEventListener("DOMContentLoaded", () => {
  window.App = new AppController();
});
