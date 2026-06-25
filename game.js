// Super Mini Mario Game Engine
// Manages Canvas Rendering, Tilemap Physics, Entity Loop, Particles, and Game Modes.

const TILE_SIZE = 32;
const GRAVITY = 0.5;
const FRICTION = 0.85;

// Tile types map:
// . = Sky (Empty)
// # = Solid Block (Theme-specific texture)
// ? = Mystery Block (Contains Coin/Powerup)
// b = Breakable Block
// S = Spike (Hurt)
// L = Lava (Instant Death)
// c = Coin
// g = Gem (Three per level)
// H = Checkpoint Flag
// F = Goal Flag (Victory)
// K = Key
// D = Lock Door
// U = Bounce Spring
// p = Patrolling Goomba
// k = Koopa (Retreats to shell)
// f = Flying Paratroopa
// j = Jumping Piranha Plant (Spawned from pipe)

class GameEngine {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext("2d");
    
    this.isPlaying = false;
    this.isPaused = false;
    this.currentMode = "standard"; // standard, timeattack, endless, survival
    
    // Key states
    this.keys = {
      left: false,
      right: false,
      up: false,
      down: false,
      dash: false
    };

    // Camera offset
    this.camera = { x: 0, y: 0 };
    
    // Core game components
    this.player = null;
    this.levelWidth = 0;
    this.levelHeight = 0;
    this.tiles = [];
    
    // Entity Lists
    this.enemies = [];
    this.items = [];
    this.projectiles = [];
    this.movingPlatforms = [];
    this.particles = [];
    
    // Event listeners
    this.setupControls();
    
    // Current Active Level Info
    this.activeLevelId = "";
    this.timeRemaining = 300; // standard timer
    this.elapsedTime = 0;
    this.levelTimeLimit = 300;
    this.gemsCollectedThisRun = 0;
    this.coinsCollectedThisRun = 0;
    this.checkpointReached = null; // {x, y}
    this.keyCollected = false;
    
    // Callback registers
    this.onLevelWin = null;
    this.onGameOver = null;
    this.onUpdateHUD = null;
  }

  setupControls() {
    window.addEventListener("keydown", (e) => {
      if (!this.isPlaying || this.isPaused || !this.isStarted) return;
      this.handleInput(e.key, true);
    });

    window.addEventListener("keyup", (e) => {
      this.handleInput(e.key, false);
    });

    // Touch controls
    const bindTouch = (id, action) => {
      const btn = document.getElementById(id);
      if (!btn) return;
      btn.addEventListener("touchstart", (e) => {
        e.preventDefault();
        this.keys[action] = true;
      });
      btn.addEventListener("touchend", (e) => {
        e.preventDefault();
        this.keys[action] = false;
      });
    };

    bindTouch("m-btn-left", "left");
    bindTouch("m-btn-right", "right");
    bindTouch("m-btn-up", "up");
    bindTouch("m-btn-down", "down");
    bindTouch("m-btn-dash", "dash");
    bindTouch("m-btn-jump", "up");
  }

  handleInput(key, pressed) {
    switch (key.toLowerCase()) {
      case "arrowleft":
      case "a":
        this.keys.left = pressed;
        break;
      case "arrowright":
      case "d":
        this.keys.right = pressed;
        break;
      case "arrowup":
      case "w":
      case " ":
        this.keys.up = pressed;
        break;
      case "arrowdown":
      case "s":
        this.keys.down = pressed;
        break;
      case "shift":
      case "j":
        this.keys.dash = pressed;
        break;
    }
  }

  // LEVEL MAPS DATABASE
  getLevelLayout(levelId) {
    // Generate simple custom grids of height 15 and variable width
    // Width is generally 120 blocks.
    const worldNum = parseInt(levelId.split("-")[0]);
    const levelNum = parseInt(levelId.split("-")[1]);
    
    let layout = [];
    const width = 120;
    
    // Set theme parameters
    let themeChar = "#"; // Forest block
    if (worldNum === 2) themeChar = "="; // Desert Sand
    if (worldNum === 3) themeChar = "i"; // Ice Block
    if (worldNum === 4) themeChar = "c"; // Sky Cloud
    if (worldNum === 5) themeChar = "d"; // Castle dark block

    // Basic layout template
    for (let r = 0; r < 15; r++) {
      layout.push(new Array(width).fill("."));
    }

    // Generate Ground floor
    for (let col = 0; col < width; col++) {
      if (worldNum === 1) {
        // Pit gaps in Forest
        if (col === 20 || col === 21 || col === 55 || col === 56 || col === 85 || col === 86) continue;
      } else if (worldNum === 2) {
        // Quicksand pits in Desert
        if (col === 30 || col === 31 || col === 32 || col === 70 || col === 71) {
          layout[13][col] = "L"; // Lava/Quicksand logic
          layout[14][col] = "L";
          continue;
        }
      } else if (worldNum === 3) {
        // Ice slippery gaps
        if (col === 25 || col === 26 || col === 60 || col === 61 || col === 90) continue;
      } else if (worldNum === 4) {
        // Massive sky gaps (Need clouds to jump across)
        if ((col > 15 && col < 22) || (col > 45 && col < 52) || (col > 78 && col < 86)) {
          // Floating clouds instead of solid ground
          layout[12][col] = (col % 2 === 0) ? "c" : ".";
          continue;
        }
      } else if (worldNum === 5) {
        // Castle Lava lakes
        if ((col > 15 && col < 25) || (col > 50 && col < 60) || (col > 82 && col < 90)) {
          layout[13][col] = "L";
          layout[14][col] = "L";
          continue;
        }
      }
      
      layout[13][col] = themeChar;
      layout[14][col] = themeChar;
    }

    // Add structures (hills, blocks, etc)
    // Level 1-1 simple setup
    layout[9][10] = "?"; // Mystery block containing coin
    layout[9][12] = "b"; // Breakable block
    layout[9][13] = "?";
    layout[9][14] = "b";
    
    // Add first patrol enemy
    layout[12][18] = "p";
    
    // Gem 1
    layout[8][13] = "g";

    // Small Pipe obstacle
    layout[12][30] = themeChar;
    layout[12][31] = themeChar;
    layout[11][30] = themeChar;
    layout[11][31] = themeChar;
    layout[10][30] = "j"; // jumping Piranha plant
    
    // Checkpoint flag in middle
    layout[12][60] = "H";
    
    // Secret area under breakable block
    layout[12][65] = "b";
    layout[12][66] = "b";
    
    // Gem 2 in sky
    layout[5][66] = "g";
    
    // Moving Platform
    layout[10][75] = "m"; // movement marker
    
    // Springs
    layout[12][45] = "U";
    layout[6][45] = "c";
    
    // Locked key puzzle
    layout[12][50] = "K"; // Key
    layout[12][95] = "D"; // Locked Door
    layout[12][96] = "D";
    layout[11][95] = "D";
    layout[11][96] = "D";
    
    // Gem 3 inside secret chamber
    layout[10][98] = "g";

    // Koopa enemy
    layout[12][40] = "k";
    
    // Flying Paratroopa
    layout[9][82] = "f";

    // Bowser Boss Level
    if (levelNum === 3) {
      // Clear level items, build boss arena at end (col 95-120)
      for (let c = 95; c < 120; c++) {
        layout[13][c] = themeChar;
        layout[14][c] = themeChar;
        // Wall at end
        layout[8][118] = themeChar;
        layout[9][118] = themeChar;
        layout[10][118] = themeChar;
        layout[11][118] = themeChar;
        layout[12][118] = themeChar;
      }
      
      layout[12][105] = "B"; // Boss Bowser position
      layout[12][114] = "F"; // Flag behind boss
    } else {
      // Normal goal flag at the end
      layout[12][114] = "F";
    }

    return layout;
  }

  // INITIALIZATION AND LOAD
  initLevel(levelId, mode = "standard", activeSkills = {}, activeSkin = "classic") {
    this.activeLevelId = levelId;
    this.currentMode = mode;
    
    // Clear lists
    this.enemies = [];
    this.items = [];
    this.projectiles = [];
    this.movingPlatforms = [];
    this.particles = [];
    this.keyCollected = false;
    this.gemsCollectedThisRun = 0;
    this.coinsCollectedThisRun = 0;
    this.elapsedTime = 0;

    // Mode-specific variables
    if (this.currentMode === "timeattack") {
      this.timeRemaining = 60; // 60s limit
    } else {
      this.timeRemaining = 300; // 300s limit
    }

    const layout = this.getLevelLayout(levelId);
    this.levelHeight = layout.length;
    this.levelWidth = layout[0].length;
    
    // Map tile grids
    this.tiles = [];
    for (let r = 0; r < this.levelHeight; r++) {
      this.tiles.push(new Array(this.levelWidth).fill("."));
    }

    // Process elements
    for (let r = 0; r < this.levelHeight; r++) {
      for (let c = 0; c < this.levelWidth; c++) {
        const char = layout[r][c];
        
        if (char === "#" || char === "=" || char === "i" || char === "c" || char === "d" || char === "D") {
          this.tiles[r][c] = char;
        } else if (char === "?") {
          this.tiles[r][c] = char;
        } else if (char === "b") {
          this.tiles[r][c] = char;
        } else if (char === "S" || char === "L") {
          this.tiles[r][c] = char;
        } else if (char === "c") {
          // Spawn coin
          this.items.push(new Item(c * TILE_SIZE + 8, r * TILE_SIZE + 8, "coin"));
        } else if (char === "g") {
          this.items.push(new Item(c * TILE_SIZE + 4, r * TILE_SIZE + 4, "gem"));
        } else if (char === "K") {
          this.items.push(new Item(c * TILE_SIZE + 4, r * TILE_SIZE + 4, "key"));
        } else if (char === "U") {
          this.tiles[r][c] = "U"; // Spring board
        } else if (char === "H") {
          this.items.push(new Item(c * TILE_SIZE, r * TILE_SIZE, "checkpoint"));
        } else if (char === "F") {
          this.items.push(new Item(c * TILE_SIZE, r * TILE_SIZE - TILE_SIZE, "flag"));
        } else if (char === "p") {
          this.enemies.push(new Enemy(c * TILE_SIZE, r * TILE_SIZE, "goomba"));
        } else if (char === "k") {
          this.enemies.push(new Enemy(c * TILE_SIZE, r * TILE_SIZE, "koopa"));
        } else if (char === "f") {
          this.enemies.push(new Enemy(c * TILE_SIZE, r * TILE_SIZE, "paratroopa"));
        } else if (char === "j") {
          // Pipe obstacle
          this.tiles[r][c] = "p_top";
          this.tiles[r+1][c] = "p_bot";
          this.enemies.push(new Enemy(c * TILE_SIZE + 8, r * TILE_SIZE, "piranha"));
        } else if (char === "m") {
          // Spawn moving platform
          this.movingPlatforms.push(new MovingPlatform(c * TILE_SIZE, r * TILE_SIZE, 96, 16));
        } else if (char === "B") {
          this.enemies.push(new Enemy(c * TILE_SIZE, r * TILE_SIZE - 32, "bowser"));
        }
      }
    }

    // Set up player
    const startX = this.checkpointReached ? this.checkpointReached.x : 64;
    const startY = this.checkpointReached ? this.checkpointReached.y : 350;
    
    this.player = new Player(startX, startY, activeSkills, activeSkin);
    this.camera.x = 0;
    this.camera.y = 0;
    
    this.isPaused = false;
    this.isPlaying = true;
    this.isStarted = false;

    // Fire initial HUD update to populate HUD elements immediately
    if (this.onUpdateHUD) {
      this.onUpdateHUD({
        lives: this.player.lives,
        coins: this.coinsCollectedThisRun,
        gems: this.gemsCollectedThisRun,
        time: Math.ceil(this.timeRemaining),
        score: this.player.score,
        shield: this.player.hasShield,
        magnet: this.player.magnetTimer > 0,
        dashCooldown: this.player.dashCooldownTimer
      });
    }
  }

  // TICK & PHYSICS UPDATE
  update(deltaTime) {
    if (!this.isPlaying || this.isPaused || !this.isStarted) return;

    // Tick clocks
    this.elapsedTime += deltaTime / 1000;
    if (this.currentMode === "timeattack") {
      this.timeRemaining -= deltaTime / 1000;
      if (this.timeRemaining <= 0) {
        this.timeRemaining = 0;
        this.triggerGameOver();
        return;
      }
    } else {
      this.timeRemaining -= deltaTime / 2000; // Timer ticks slower in standard mode
      if (this.timeRemaining <= 0) this.timeRemaining = 0;
    }

    // Update Player
    this.player.update(this.keys, this.tiles, this);

    // Update Moving Platforms
    this.movingPlatforms.forEach(plat => plat.update(this.player));

    // Update Enemies
    this.enemies.forEach(enemy => {
      enemy.update(this.tiles, this.player, this);
    });

    // Update Items
    this.items.forEach(item => {
      item.update(this.player, this);
    });

    // Update Projectiles
    this.projectiles = this.projectiles.filter(proj => {
      proj.update(this.tiles, this.enemies, this);
      return proj.active;
    });

    // Filter dead enemies
    this.enemies = this.enemies.filter(enemy => enemy.active);

    // Filter collected items
    this.items = this.items.filter(item => !item.collected);

    // Update Particles
    this.particles.forEach(part => part.update());
    this.particles = this.particles.filter(part => part.life > 0);

    // Check player boundaries
    if (this.player.y > 480 + 100) {
      this.player.hurt(3, this); // Fall into pit is instant death
    }

    // Camera follow player
    this.camera.x = this.player.x - 400 + this.player.width / 2;
    // Bind camera to level boundaries
    if (this.camera.x < 0) this.camera.x = 0;
    if (this.camera.x > this.levelWidth * TILE_SIZE - 800) {
      this.camera.x = this.levelWidth * TILE_SIZE - 800;
    }

    // Callback HUD Update
    if (this.onUpdateHUD) {
      this.onUpdateHUD({
        lives: this.player.lives,
        coins: this.coinsCollectedThisRun,
        gems: this.gemsCollectedThisRun,
        time: Math.ceil(this.timeRemaining),
        score: this.player.score,
        shield: this.player.hasShield,
        magnet: this.player.magnetTimer > 0,
        dashCooldown: this.player.dashCooldownTimer
      });
    }
  }

  // RENDER DRAW LOOP
  draw() {
    if (!this.ctx) return;
    this.ctx.clearRect(0, 0, 800, 480);

    this.ctx.save();
    // Offset drawing elements by camera coordinates
    this.ctx.translate(-Math.floor(this.camera.x), -Math.floor(this.camera.y));

    // 1. Draw Parallax Background layers
    this.drawBackground();

    // Only draw gameplay elements if playing and player exists
    if (this.isPlaying && this.player) {
      // 2. Draw Moving Platforms
      this.movingPlatforms.forEach(plat => plat.draw(this.ctx));

      // 3. Draw Level Tiles
      this.drawTiles();

      // 4. Draw Items
      this.items.forEach(item => item.draw(this.ctx));

      // 5. Draw Projectiles
      this.projectiles.forEach(proj => proj.draw(this.ctx));

      // 6. Draw Enemies
      this.enemies.forEach(enemy => enemy.draw(this.ctx));

      // 7. Draw Particles
      this.particles.forEach(part => part.draw(this.ctx));

      // 8. Draw Player
      this.player.draw(this.ctx);
    }

    this.ctx.restore();
  }

  drawBackground() {
    const worldNum = parseInt(this.activeLevelId.split("-")[0]);
    let color1 = "#E0F2FE"; // sky light blue (Forest)
    let color2 = "#BAE6FD";
    
    if (worldNum === 2) { // Desert
      color1 = "#FEF3C7";
      color2 = "#FDE68A";
    } else if (worldNum === 3) { // Ice
      color1 = "#ECFDF5";
      color2 = "#A7F3D0";
    } else if (worldNum === 4) { // Sky
      color1 = "#EFF6FF";
      color2 = "#DBEAFE";
    } else if (worldNum === 5) { // Castle
      color1 = "#1E293B";
      color2 = "#0F172A";
    }

    // Parallax fill background
    this.ctx.fillStyle = color1;
    this.ctx.fillRect(this.camera.x, 0, 800, 480);

    // Dynamic simple mountains or scenery vectors
    this.ctx.fillStyle = color2;
    this.ctx.globalAlpha = 0.4;
    
    // Draw background hills with simple trigonometric curves
    const scrollFactor = 0.2;
    this.ctx.beginPath();
    this.ctx.moveTo(this.camera.x, 480);
    for (let x = this.camera.x; x < this.camera.x + 805; x += 10) {
      const y = 300 + Math.sin((x * scrollFactor) / 10) * 40;
      this.ctx.lineTo(x, y);
    }
    this.ctx.lineTo(this.camera.x + 800, 480);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.globalAlpha = 1.0;
  }

  drawTiles() {
    for (let r = 0; r < this.levelHeight; r++) {
      for (let c = 0; c < this.levelWidth; c++) {
        const type = this.tiles[r][c];
        if (type === ".") continue;

        const x = c * TILE_SIZE;
        const y = r * TILE_SIZE;

        // Skip rendering off-screen tiles
        if (x + TILE_SIZE < this.camera.x || x > this.camera.x + 800) continue;

        this.ctx.save();
        if (type === "#") {
          // Forest Ground Block (Bright Green Top, Soft brown base)
          this.ctx.fillStyle = "#8B5CF6"; // Stylized purple rock base
          this.ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
          this.ctx.fillStyle = "#22C55E"; // Bright green grass cap
          this.ctx.fillRect(x, y, TILE_SIZE, 6);
        } else if (type === "=") {
          // Desert block (Creamy orange/yellow sand)
          this.ctx.fillStyle = "#F59E0B";
          this.ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
          this.ctx.fillStyle = "#FEF3C7";
          this.ctx.fillRect(x, y, TILE_SIZE, 6);
        } else if (type === "i") {
          // Ice block (Semi-translucent light blue)
          this.ctx.fillStyle = "#60A5FA";
          this.ctx.globalAlpha = 0.8;
          this.ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
          this.ctx.fillStyle = "#E0F2FE";
          this.ctx.fillRect(x, y, TILE_SIZE, 4);
        } else if (type === "c") {
          // Sky Cloud blocks (Rounded fluffy white style)
          this.ctx.fillStyle = "#FFFFFF";
          this.ctx.beginPath();
          this.ctx.roundRect(x, y, TILE_SIZE, TILE_SIZE, 8);
          this.ctx.fill();
        } else if (type === "d") {
          // Castle dark brick
          this.ctx.fillStyle = "#475569";
          this.ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
          this.ctx.strokeStyle = "#334155";
          this.ctx.lineWidth = 1;
          this.ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
        } else if (type === "?") {
          // Mystery block
          this.ctx.fillStyle = "#FBBF24"; // Bright amber gold
          this.ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
          this.ctx.strokeStyle = "#D97706";
          this.ctx.lineWidth = 2;
          this.ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
          
          this.ctx.fillStyle = "#D97706";
          this.ctx.font = "bold 20px 'Outfit'";
          this.ctx.textAlign = "center";
          this.ctx.textBaseline = "middle";
          this.ctx.fillText("?", x + TILE_SIZE / 2, y + TILE_SIZE / 2);
        } else if (type === "b") {
          // Breakable brick
          this.ctx.fillStyle = "#FB923C"; // Orange
          this.ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
          this.ctx.strokeStyle = "#C2410C";
          this.ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
          
          // Draw lines for brick patterns
          this.ctx.beginPath();
          this.ctx.moveTo(x, y + 16);
          this.ctx.lineTo(x + TILE_SIZE, y + 16);
          this.ctx.moveTo(x + 16, y);
          this.ctx.lineTo(x + 16, y + 16);
          this.ctx.moveTo(x + 8, y + 16);
          this.ctx.lineTo(x + 8, y + TILE_SIZE);
          this.ctx.moveTo(x + 24, y + 16);
          this.ctx.lineTo(x + 24, y + TILE_SIZE);
          this.ctx.strokeStyle = "#C2410C";
          this.ctx.stroke();
        } else if (type === "U") {
          // Spring board
          this.ctx.fillStyle = "#94A3B8";
          this.ctx.fillRect(x + 4, y + 16, TILE_SIZE - 8, 16);
          this.ctx.fillStyle = "#EF4444";
          this.ctx.fillRect(x + 2, y + 8, TILE_SIZE - 4, 8);
        } else if (type === "S") {
          // Spike block
          this.ctx.fillStyle = "#64748B";
          this.ctx.beginPath();
          this.ctx.moveTo(x, y + TILE_SIZE);
          this.ctx.lineTo(x + 8, y + 8);
          this.ctx.lineTo(x + 16, y + TILE_SIZE);
          this.ctx.lineTo(x + 24, y + 8);
          this.ctx.lineTo(x + TILE_SIZE, y + TILE_SIZE);
          this.ctx.closePath();
          this.ctx.fill();
        } else if (type === "L") {
          // Lava / Quicksand
          this.ctx.fillStyle = "#EF4444"; // Red lava
          this.ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
          this.ctx.fillStyle = "#F97316";
          this.ctx.fillRect(x, y, TILE_SIZE, 4);
        } else if (type === "D") {
          // Door lock blocks
          this.ctx.fillStyle = "#78350F";
          this.ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
          this.ctx.strokeStyle = "#D97706";
          this.ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
          this.ctx.fillStyle = "#FBBF24";
          this.ctx.beginPath();
          this.ctx.arc(x + 16, y + 16, 4, 0, Math.PI * 2);
          this.ctx.fill();
        } else if (type === "p_top") {
          this.ctx.fillStyle = "#15803D";
          this.ctx.fillRect(x + 4, y, TILE_SIZE - 8, TILE_SIZE);
        } else if (type === "p_bot") {
          this.ctx.fillStyle = "#166534";
          this.ctx.fillRect(x + 6, y, TILE_SIZE - 12, TILE_SIZE);
        }
        this.ctx.restore();
      }
    }
  }

  // TRIGGER SYSTEM
  hitBlock(tileX, tileY) {
    const tileType = this.tiles[tileY][tileX];
    if (tileType === "?") {
      this.tiles[tileY][tileX] = "#"; // Convert to spent block (solid)
      this.coinsCollectedThisRun++;
      this.player.score += 100;
      
      if (window.RetroSynth) window.RetroSynth.playCoin();

      // Spawn flying coin particle
      this.particles.push(new Particle(tileX * TILE_SIZE + 16, tileY * TILE_SIZE - 16, "coin-star"));
      
      // Random Chance for Powerup in mystery block
      if (Math.random() < 0.3) {
        const types = ["shield", "magnet", "star"];
        const powerupType = types[Math.floor(Math.random() * types.length)];
        this.items.push(new Item(tileX * TILE_SIZE + 4, (tileY - 1) * TILE_SIZE + 4, powerupType));
      }
    } else if (tileType === "b") {
      // Breakable block!
      this.tiles[tileY][tileX] = "."; // Remove block
      if (window.RetroSynth) window.RetroSynth.playExplode();

      // Block dust debris particles
      for (let i = 0; i < 6; i++) {
        this.particles.push(new Particle(tileX * TILE_SIZE + 16, tileY * TILE_SIZE + 16, "debris"));
      }
    }
  }

  triggerVictory() {
    this.isPlaying = false;
    if (window.RetroSynth) window.RetroSynth.playWin();

    if (this.onLevelWin) {
      this.onLevelWin({
        time: this.elapsedTime,
        coins: this.coinsCollectedThisRun,
        gems: this.gemsCollectedThisRun
      });
    }
  }

  triggerGameOver() {
    this.isPlaying = false;
    if (window.RetroSynth) window.RetroSynth.playGameOver();

    if (this.onGameOver) {
      this.onGameOver();
    }
  }
}

// ----------------------------------------------------
// PLAYER ENTITY
// ----------------------------------------------------
class Player {
  constructor(x, y, skills = {}, skin = "classic") {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    
    // Core parameters
    this.width = 24;
    this.height = 36;
    this.grounded = false;
    this.doubleJumpCount = 0;
    
    // Custom states
    this.skills = skills;
    this.skin = skin;
    
    this.hasShield = this.skills.shield || false;
    this.isInvincible = false;
    this.invincibilityTimer = 0;
    this.magnetTimer = 0;
    
    this.lives = 3;
    this.score = 0;
    
    // Dash states
    this.isDashing = false;
    this.dashTimer = 0;
    this.dashCooldownTimer = 0;
    this.dashDirection = 1;
    
    // Slide states
    this.isSliding = false;
    
    // Invincible flashing
    this.flashState = 0;
    this.lookDirection = 1; // 1 = right, -1 = left
  }

  update(keys, tiles, game) {
    // 1. Handle Cooldowns
    if (this.dashCooldownTimer > 0) this.dashCooldownTimer -= 0.016;
    if (this.invincibilityTimer > 0) {
      this.invincibilityTimer -= 0.016;
      if (this.invincibilityTimer <= 0) {
        this.isInvincible = false;
      }
    }
    if (this.magnetTimer > 0) this.magnetTimer -= 0.016;

    // 2. Dash Movement Mechanic
    if (this.skills.dash && keys.dash && this.dashCooldownTimer <= 0 && !this.isDashing) {
      this.isDashing = true;
      this.dashTimer = 0.2; // 0.2s duration
      this.dashCooldownTimer = 1.0; // 1s cooldown
      this.dashDirection = this.lookDirection;
      this.vy = 0; // stop falling during dash
      if (window.RetroSynth) window.RetroSynth.playPowerup();
    }

    if (this.isDashing) {
      this.vx = this.dashDirection * 12;
      this.vy = 0;
      this.dashTimer -= 0.016;
      
      // Spawn trailing particle
      game.particles.push(new Particle(this.x + this.width/2, this.y + this.height/2, "trail"));
      
      if (this.dashTimer <= 0) {
        this.isDashing = false;
      }
    } else {
      // Standard movement
      const speed = 0.6;
      const maxSpeed = 4.5;
      
      // Slick ice physics modification
      const isOnIce = this.checkStandTile(tiles, "i");
      const dragFactor = isOnIce ? 0.96 : FRICTION;

      if (keys.left) {
        this.vx -= speed;
        this.lookDirection = -1;
      } else if (keys.right) {
        this.vx += speed;
        this.lookDirection = 1;
      } else {
        this.vx *= dragFactor;
      }

      // Clamp speed
      if (this.vx > maxSpeed) this.vx = maxSpeed;
      if (this.vx < -maxSpeed) this.vx = -maxSpeed;
    }

    // 3. Sliding / Crouching Mechanic
    if (this.skills.slide && keys.down && this.grounded) {
      if (!this.isSliding) {
        this.isSliding = true;
        this.height = 20; // Shrink hitbox
        this.y += 16;
      }
      this.vx *= 0.95; // Slide friction slows you down
    } else if (this.isSliding) {
      // Try to stand up, ensure no overhead block
      if (!this.checkOverlap(this.x, this.y - 16, this.width, 36, tiles)) {
        this.isSliding = false;
        this.height = 36;
        this.y -= 16;
      }
    }

    // 4. Gravity & Jump Mechanics
    if (!this.isDashing) {
      this.vy += GRAVITY;
    }

    // Wall slide detect
    let wallSliding = false;
    if (this.skills.wallJump && !this.grounded) {
      const againstLeftWall = this.checkOverlap(this.x - 2, this.y, this.width, this.height, tiles);
      const againstRightWall = this.checkOverlap(this.x + 2, this.y, this.width, this.height, tiles);
      
      if ((againstLeftWall && keys.left) || (againstRightWall && keys.right)) {
        if (this.vy > 0) {
          this.vy = 1.2; // Slow fall
          wallSliding = true;
        }
      }
    }

    if (keys.up) {
      if (this.grounded) {
        // Normal jump
        this.vy = -10.5;
        this.grounded = false;
        this.doubleJumpCount = 0;
        keys.up = false; // consume jump
        if (window.RetroSynth) window.RetroSynth.playJump();
        
        // Spawn jump dust
        for(let i=0; i<4; i++) game.particles.push(new Particle(this.x + 12, this.y + 36, "dust"));
      } else if (wallSliding) {
        // Wall Jump
        this.vy = -9.5;
        this.vx = -this.lookDirection * 5.5; // kick off wall
        keys.up = false;
        if (window.RetroSynth) window.RetroSynth.playJump();
      } else if (this.skills.doubleJump && this.doubleJumpCount < 1) {
        // Air Double Jump
        this.vy = -9.0;
        this.doubleJumpCount++;
        keys.up = false;
        if (window.RetroSynth) window.RetroSynth.playJump();
        
        // Double jump cloud ring particle
        for(let i=0; i<6; i++) game.particles.push(new Particle(this.x + 12, this.y + 24, "dust"));
      }
    }

    // 5. Apply velocities & Check AABB Collisions
    // X Collision
    this.x += this.vx;
    if (this.checkOverlap(this.x, this.y, this.width, this.height, tiles)) {
      this.x -= this.vx;
      this.vx = 0;
    }

    // Y Collision
    this.y += this.vy;
    this.grounded = false;
    if (this.checkOverlap(this.x, this.y, this.width, this.height, tiles)) {
      if (this.vy > 0) {
        this.grounded = true;
        this.doubleJumpCount = 0;
      }
      
      this.y -= this.vy;
      
      // If hitting block from below
      if (this.vy < 0) {
        const headTileX = Math.floor((this.x + this.width / 2) / TILE_SIZE);
        const headTileY = Math.floor((this.y - 2) / TILE_SIZE);
        game.hitBlock(headTileX, headTileY);
      }
      
      this.vy = 0;
    }

    // Bounce Spring logic
    if (this.checkStandTile(tiles, "U")) {
      this.vy = -15; // Mega launch!
      this.grounded = false;
      if (window.RetroSynth) window.RetroSynth.playJump();
    }

    // Spike hazard collision
    if (this.checkCollisionWithTileType(tiles, "S")) {
      this.hurt(1, game);
    }

    // Quicksand / Lava hazard
    if (this.checkCollisionWithTileType(tiles, "L")) {
      this.hurt(3, game);
    }
  }

  checkOverlap(x, y, w, h, tiles) {
    const startX = Math.floor(x / TILE_SIZE);
    const endX = Math.floor((x + w) / TILE_SIZE);
    const startY = Math.floor(y / TILE_SIZE);
    const endY = Math.floor((y + h) / TILE_SIZE);

    for (let r = startY; r <= endY; r++) {
      for (let c = startX; c <= endX; c++) {
        if (r >= 0 && r < 15 && c >= 0 && c < tiles[0].length) {
          const tile = tiles[r][c];
          if (tile === "#" || tile === "=" || tile === "i" || tile === "c" || tile === "d" || tile === "D" || tile === "p_top" || tile === "p_bot") {
            // Box overlap check
            if (x < (c+1)*TILE_SIZE && x + w > c*TILE_SIZE && y < (r+1)*TILE_SIZE && y + h > r*TILE_SIZE) {
              return true;
            }
          }
        }
      }
    }
    return false;
  }

  checkCollisionWithTileType(tiles, type) {
    const startX = Math.floor(this.x / TILE_SIZE);
    const endX = Math.floor((this.x + this.width) / TILE_SIZE);
    const startY = Math.floor(this.y / TILE_SIZE);
    const endY = Math.floor((this.y + this.height) / TILE_SIZE);

    for (let r = startY; r <= endY; r++) {
      for (let c = startX; c <= endX; c++) {
        if (r >= 0 && r < 15 && c >= 0 && c < tiles[0].length) {
          if (tiles[r][c] === type) {
            return true;
          }
        }
      }
    }
    return false;
  }

  checkStandTile(tiles, type) {
    const footY = Math.floor((this.y + this.height + 2) / TILE_SIZE);
    const lFootX = Math.floor(this.x / TILE_SIZE);
    const rFootX = Math.floor((this.x + this.width) / TILE_SIZE);

    if (footY >= 0 && footY < 15) {
      if (tiles[footY][lFootX] === type || tiles[footY][rFootX] === type) return true;
    }
    return false;
  }

  hurt(damage, game) {
    if (this.isInvincible) return;

    if (this.hasShield) {
      this.hasShield = false;
      this.triggerInvincibility(1.5);
      if (window.RetroSynth) window.RetroSynth.playHurt();
      // Apply screen shake
      document.getElementById("game-canvas").classList.add("shake-active");
      setTimeout(() => document.getElementById("game-canvas").classList.remove("shake-active"), 350);
      return;
    }

    this.lives -= damage;
    if (this.lives <= 0) {
      this.lives = 0;
      game.triggerGameOver();
    } else {
      this.triggerInvincibility(2.0); // 2s recovery
      if (window.RetroSynth) window.RetroSynth.playHurt();
      this.vy = -6; // jump up in pain
      
      // Screen shake
      document.getElementById("game-canvas").classList.add("shake-active");
      setTimeout(() => document.getElementById("game-canvas").classList.remove("shake-active"), 350);
    }
  }

  triggerInvincibility(duration) {
    this.isInvincible = true;
    this.invincibilityTimer = duration;
  }

  draw(ctx) {
    // Flash if invincible
    if (this.isInvincible) {
      this.flashState = (this.flashState + 1) % 4;
      if (this.flashState === 0) return;
    }

    ctx.save();
    
    // Color skins
    let color = "#EF4444"; // Classic
    let hatColor = "#EF4444";
    if (this.skin === "fire") { color = "#FFFFFF"; hatColor = "#EF4444"; }
    else if (this.skin === "ice") { color = "#60A5FA"; hatColor = "#EFF6FF"; }
    else if (this.skin === "gold") { color = "#FBBF24"; hatColor = "#F59E0B"; }
    else if (this.skin === "cosmic") { color = "#312E81"; hatColor = "#818CF8"; }

    // Draw Shield circle overlay
    if (this.hasShield) {
      ctx.strokeStyle = "rgba(96, 165, 250, 0.6)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(this.x + this.width/2, this.y + this.height/2, this.height/2 + 4, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Magnet aura
    if (this.magnetTimer > 0) {
      ctx.strokeStyle = "rgba(251, 191, 36, 0.4)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(this.x + this.width/2, this.y + this.height/2, 100, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Draw simple character vectors
    ctx.fillStyle = color;
    // Body / Overalls
    ctx.fillRect(this.x, this.y + 12, this.width, this.height - 12);
    
    // Head / Face
    ctx.fillStyle = "#FED7AA";
    ctx.fillRect(this.x + (this.lookDirection === 1 ? 4 : 0), this.y + 2, 20, 10);
    
    // Hat
    ctx.fillStyle = hatColor;
    ctx.fillRect(this.x + (this.lookDirection === 1 ? 2 : 0), this.y, 20, 3);
    
    // Eyes
    ctx.fillStyle = "#000000";
    ctx.fillRect(this.x + (this.lookDirection === 1 ? 16 : 6), this.y + 4, 3, 3);

    ctx.restore();
  }
}

// ----------------------------------------------------
// ENEMIES SYSTEM
// ----------------------------------------------------
class Enemy {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.vx = -1.2;
    this.vy = 0;
    this.type = type;
    this.width = type === "bowser" ? 64 : 24;
    this.height = type === "bowser" ? 64 : 24;
    this.active = true;
    
    // Bowser parameters
    this.hp = 3;
    this.bossStateTimer = 0;
  }

  update(tiles, player, game) {
    if (!this.active) return;

    if (this.type === "goomba") {
      this.vy += GRAVITY;
      this.x += this.vx;
      
      // Ledge patrol check (turns around if hit wall or edge)
      if (this.checkCollide(this.x, this.y, this.width, this.height, tiles)) {
        this.x -= this.vx;
        this.vx = -this.vx;
      }
      
      this.y += this.vy;
      if (this.checkCollide(this.x, this.y, this.width, this.height, tiles)) {
        this.y -= this.vy;
        this.vy = 0;
      }
    } else if (this.type === "koopa") {
      this.vy += GRAVITY;
      this.x += this.vx;
      
      if (this.checkCollide(this.x, this.y, this.width, this.height, tiles)) {
        this.x -= this.vx;
        this.vx = -this.vx;
      }
      this.y += this.vy;
      if (this.checkCollide(this.x, this.y, this.width, this.height, tiles)) {
        this.y -= this.vy;
        this.vy = 0;
      }
    } else if (this.type === "paratroopa") {
      // Fly up and down
      this.y += this.vx; // use vx as oscillation velocity
      if (this.y < 100 || this.y > 320) {
        this.vx = -this.vx;
      }
    } else if (this.type === "piranha") {
      // Pops up and down from pipe
      this.bossStateTimer += 0.016;
      this.y = 350 + Math.sin(this.bossStateTimer * 2) * 24;
    } else if (this.type === "bowser") {
      // Bowser Boss AI
      this.bossStateTimer += 0.016;
      this.x += this.vx;
      
      if (this.checkCollide(this.x, this.y, this.width, this.height, tiles)) {
        this.x -= this.vx;
        this.vx = -this.vx;
      }

      // Jump at regular intervals
      if (Math.floor(this.bossStateTimer) % 4 === 0 && this.vy === 0) {
        this.vy = -12;
      }

      this.vy += GRAVITY;
      this.y += this.vy;
      if (this.checkCollide(this.x, this.y, this.width, this.height, tiles)) {
        this.y -= this.vy;
        this.vy = 0;
      }

      // Shoot fireballs
      if (Math.random() < 0.015) {
        game.projectiles.push(new Projectile(this.x - 8, this.y + 16, -3.5, "fireball"));
      }
    }

    // Check collision with player
    if (this.checkRectOverlap(this, player)) {
      if (player.isInvincible && player.invincibilityTimer > 0) {
        // Destroyed on touch by star power
        this.active = false;
        player.score += 200;
        if (window.RetroSynth) window.RetroSynth.playExplode();
        return;
      }

      // Player jumps on head?
      if (player.vy > 0 && player.y + player.height - player.vy <= this.y + 8) {
        player.vy = -7.5; // bounce up
        player.score += 200;

        if (this.type === "bowser") {
          this.hp--;
          if (window.RetroSynth) window.RetroSynth.playHurt();
          if (this.hp <= 0) {
            this.active = false;
            game.triggerVictory();
          } else {
            // Bowser is enraged
            this.vx = this.vx * 1.5;
            player.triggerInvincibility(1.5);
          }
        } else if (this.type === "koopa") {
          // Retreats to shell
          this.type = "shell";
          this.vx = 0;
          this.height = 16;
          this.y += 8;
        } else if (this.type === "shell") {
          // Kick shell
          this.vx = player.lookDirection * 8;
        } else {
          this.active = false;
          if (window.RetroSynth) window.RetroSynth.playExplode();
        }
      } else {
        // Shell kicked logic vs standard enemy hurt
        if (this.type === "shell" && this.vx === 0) {
          // Just kicking shell
          this.vx = player.lookDirection * 8;
        } else {
          player.hurt(1, game);
        }
      }
    }

    // Shell collisions with other enemies
    if (this.type === "shell" && Math.abs(this.vx) > 0) {
      game.enemies.forEach(other => {
        if (other !== this && other.active && this.checkRectOverlap(this, other)) {
          other.active = false;
          player.score += 200;
          if (window.RetroSynth) window.RetroSynth.playExplode();
        }
      });
    }
  }

  checkCollide(x, y, w, h, tiles) {
    const startX = Math.floor(x / TILE_SIZE);
    const endX = Math.floor((x + w) / TILE_SIZE);
    const startY = Math.floor(y / TILE_SIZE);
    const endY = Math.floor((y + h) / TILE_SIZE);

    for (let r = startY; r <= endY; r++) {
      for (let c = startX; c <= endX; c++) {
        if (r >= 0 && r < 15 && c >= 0 && c < tiles[0].length) {
          const tile = tiles[r][c];
          if (tile === "#" || tile === "=" || tile === "i" || tile === "c" || tile === "d" || tile === "D" || tile === "p_top") {
            return true;
          }
        }
      }
    }
    return false;
  }

  checkRectOverlap(r1, r2) {
    return r1.x < r2.x + r2.width &&
           r1.x + r1.width > r2.x &&
           r1.y < r2.y + r2.height &&
           r1.y + r1.height > r2.y;
  }

  draw(ctx) {
    ctx.save();
    if (this.type === "goomba") {
      ctx.fillStyle = "#9A3412"; // Brown goomba
      ctx.beginPath();
      ctx.roundRect(this.x, this.y, this.width, this.height, 6);
      ctx.fill();
      ctx.fillStyle = "#000000"; // eyes
      ctx.fillRect(this.x + 4, this.y + 6, 2, 4);
      ctx.fillRect(this.x + 18, this.y + 6, 2, 4);
    } else if (this.type === "koopa") {
      ctx.fillStyle = "#EAB308"; // Yellow body
      ctx.fillRect(this.x, this.y, this.width, this.height);
      ctx.fillStyle = "#22C55E"; // Green shell
      ctx.fillRect(this.x + 2, this.y + 2, 20, 12);
    } else if (this.type === "shell") {
      ctx.fillStyle = "#22C55E";
      ctx.beginPath();
      ctx.arc(this.x + 12, this.y + 8, 8, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.type === "paratroopa") {
      ctx.fillStyle = "#EAB308";
      ctx.fillRect(this.x, this.y, this.width, this.height);
      // Wings
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(this.x - 4, this.y + 2, 8, 12);
    } else if (this.type === "piranha") {
      ctx.fillStyle = "#EF4444"; // Red head
      ctx.beginPath();
      ctx.arc(this.x + 8, this.y + 8, 8, 0, Math.PI * 2);
      ctx.fill();
      // White teeth dots
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(this.x + 4, this.y + 4, 2, 2);
    } else if (this.type === "bowser") {
      // Bowser boss render
      ctx.fillStyle = "#15803D"; // Green back
      ctx.fillRect(this.x, this.y, this.width, this.height);
      ctx.fillStyle = "#EAB308"; // spikes
      ctx.fillRect(this.x + 40, this.y + 12, 16, 40);
      ctx.fillStyle = "#EF4444"; // red eyes
      ctx.fillRect(this.x + 12, this.y + 16, 4, 4);
      
      // HP Bar overhead
      ctx.fillStyle = "#EF4444";
      ctx.fillRect(this.x, this.y - 12, this.width, 4);
      ctx.fillStyle = "#22C55E";
      ctx.fillRect(this.x, this.y - 12, this.width * (this.hp / 3), 4);
    }
    ctx.restore();
  }
}

// ----------------------------------------------------
// PROJECTILES
// ----------------------------------------------------
class Projectile {
  constructor(x, y, vx, type) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = 0;
    this.type = type;
    this.width = 16;
    this.height = 16;
    this.active = true;
    this.timer = 0;
  }

  update(tiles, enemies, game) {
    this.timer += 0.016;
    
    if (this.type === "fireball") {
      this.x += this.vx;
      // Oscillate up and down
      this.y += Math.sin(this.timer * 10) * 3.5;
      
      // Collide walls
      if (this.x < game.camera.x || this.x > game.camera.x + 800) {
        this.active = false;
      }
      
      // Check hit player
      if (this.checkOverlap(this, game.player)) {
        game.player.hurt(1, game);
        this.active = false;
      }
    }
  }

  checkOverlap(r1, r2) {
    return r1.x < r2.x + r2.width &&
           r1.x + r1.width > r2.x &&
           r1.y < r2.y + r2.height &&
           r1.y + r1.height > r2.y;
  }

  draw(ctx) {
    ctx.save();
    if (this.type === "fireball") {
      ctx.fillStyle = "#F97316"; // fire orange
      ctx.beginPath();
      ctx.arc(this.x + 8, this.y + 8, 8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

// ----------------------------------------------------
// MOVING PLATFORMS
// ----------------------------------------------------
class MovingPlatform {
  constructor(x, y, w, h) {
    this.x = x;
    this.y = y;
    this.width = w;
    this.height = h;
    
    this.startX = x;
    this.vx = 1.5;
    this.timer = 0;
  }

  update(player) {
    this.timer += 0.016;
    // Move left-right sinusoidally
    const oldX = this.x;
    this.x = this.startX + Math.sin(this.timer) * 96;
    const diffX = this.x - oldX;

    // If player stands on platform, carry player along
    const playerFootY = player.y + player.height;
    if (player.x + player.width > this.x && player.x < this.x + this.width) {
      if (playerFootY >= this.y - 4 && playerFootY <= this.y + 4) {
        player.x += diffX;
        player.y = this.y - player.height;
        player.grounded = true;
        player.vy = 0;
      }
    }
  }

  draw(ctx) {
    ctx.fillStyle = "#0284C7"; // Bright sky blue platform
    ctx.beginPath();
    ctx.roundRect(this.x, this.y, this.width, this.height, 4);
    ctx.fill();
  }
}

// ----------------------------------------------------
// ITEMS
// ----------------------------------------------------
class Item {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.width = type === "checkpoint" || type === "flag" ? 32 : 16;
    this.height = type === "checkpoint" || type === "flag" ? 64 : 16;
    this.collected = false;
    
    this.floatTimer = Math.random() * 100;
  }

  update(player, game) {
    this.floatTimer += 0.05;

    // MAGNET COIN COLLECTOR logic
    if (this.type === "coin" && player.magnetTimer > 0) {
      const dx = (player.x + player.width/2) - (this.x + this.width/2);
      const dy = (player.y + player.height/2) - (this.y + this.height/2);
      const dist = Math.sqrt(dx*dx + dy*dy);
      
      if (dist < 120) { // magnet pull radius
        const speed = 4.0;
        this.x += (dx / dist) * speed;
        this.y += (dy / dist) * speed;
      }
    }

    // Check hit player
    if (this.x < player.x + player.width &&
        this.x + this.width > player.x &&
        this.y < player.y + player.height &&
        this.y + this.height > player.y) {
      
      this.collected = true;

      if (this.type === "coin") {
        game.coinsCollectedThisRun++;
        player.score += 50;
        if (window.RetroSynth) window.RetroSynth.playCoin();
        
        // Spawn coin particles
        for(let i=0; i<3; i++) game.particles.push(new Particle(this.x, this.y, "sparkle"));
      } else if (this.type === "gem") {
        game.gemsCollectedThisRun++;
        player.score += 500;
        if (window.RetroSynth) window.RetroSynth.playPowerup();
        
        for(let i=0; i<6; i++) game.particles.push(new Particle(this.x, this.y, "sparkle"));
      } else if (this.type === "key") {
        game.keyCollected = true;
        player.score += 300;
        if (window.RetroSynth) window.RetroSynth.playPowerup();
        
        // Unlock locked gates
        for (let r = 0; r < game.levelHeight; r++) {
          for (let c = 0; c < game.levelWidth; c++) {
            if (game.tiles[r][c] === "D") {
              game.tiles[r][c] = "."; // Unlock
              for(let i=0; i<2; i++) game.particles.push(new Particle(c*32+16, r*32+16, "debris"));
            }
          }
        }
      } else if (this.type === "shield") {
        player.hasShield = true;
        if (window.RetroSynth) window.RetroSynth.playPowerup();
      } else if (this.type === "magnet") {
        player.magnetTimer = 8.0; // 8s magnet duration
        if (window.RetroSynth) window.RetroSynth.playPowerup();
      } else if (this.type === "star") {
        player.triggerInvincibility(5.0); // 5s invincibility
        if (window.RetroSynth) window.RetroSynth.playPowerup();
      } else if (this.type === "checkpoint") {
        game.checkpointReached = { x: this.x, y: this.y - 12 };
        if (window.RetroSynth) window.RetroSynth.playPowerup();
      } else if (this.type === "flag") {
        game.triggerVictory();
      }
    }
  }

  draw(ctx) {
    ctx.save();
    
    // Floating bounce effect
    const offset = Math.sin(this.floatTimer) * 4;

    if (this.type === "coin") {
      ctx.fillStyle = "#FBBF24"; // Gold yellow
      ctx.beginPath();
      ctx.ellipse(this.x + 8, this.y + 8 + offset, 6, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#D97706";
      ctx.stroke();
    } else if (this.type === "gem") {
      ctx.fillStyle = "#3B82F6"; // Gem blue
      ctx.beginPath();
      ctx.moveTo(this.x + 8, this.y + offset);
      ctx.lineTo(this.x + 16, this.y + 8 + offset);
      ctx.lineTo(this.x + 8, this.y + 16 + offset);
      ctx.lineTo(this.x, this.y + 8 + offset);
      ctx.closePath();
      ctx.fill();
    } else if (this.type === "key") {
      ctx.fillStyle = "#EAB308";
      ctx.fillRect(this.x + 4, this.y + offset, 8, 16);
      ctx.beginPath();
      ctx.arc(this.x + 8, this.y + 4 + offset, 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.type === "shield") {
      ctx.fillStyle = "#60A5FA";
      ctx.fillRect(this.x, this.y + offset, 16, 16);
    } else if (this.type === "magnet") {
      ctx.fillStyle = "#EF4444";
      ctx.fillRect(this.x, this.y + offset, 16, 16);
    } else if (this.type === "star") {
      ctx.fillStyle = "#FBBF24";
      ctx.fillRect(this.x, this.y + offset, 16, 16);
    } else if (this.type === "checkpoint") {
      // Checkpoint pole
      ctx.fillStyle = "#94A3B8";
      ctx.fillRect(this.x + 14, this.y, 4, 64);
      // Flag banner
      ctx.fillStyle = "#22C55E";
      ctx.fillRect(this.x + 18, this.y + 4, 20, 16);
    } else if (this.type === "flag") {
      // Victory Flag Pole
      ctx.fillStyle = "#64748B";
      ctx.fillRect(this.x + 14, this.y, 4, 96);
      ctx.fillStyle = "#EF4444";
      ctx.fillRect(this.x + 18, this.y + 4, 24, 16);
    }
    
    ctx.restore();
  }
}

// ----------------------------------------------------
// PARTICLES SYSTEM
// ----------------------------------------------------
class Particle {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.vx = (Math.random() - 0.5) * 4;
    this.vy = (Math.random() - 0.5) * 4;
    this.life = type === "debris" ? 30 : 20;
    this.maxLife = this.life;
    this.color = "#FFFFFF";

    if (type === "dust") {
      this.color = "rgba(255, 255, 255, 0.7)";
      this.vy = -Math.random() * 2;
    } else if (type === "debris") {
      this.color = "#FB923C";
      this.vy = -Math.random() * 4 - 2;
    } else if (type === "sparkle") {
      this.color = "#FBBF24";
    } else if (type === "trail") {
      this.color = "rgba(96, 165, 250, 0.3)";
      this.vx = 0;
      this.vy = 0;
    } else if (type === "coin-star") {
      this.color = "#FBBF24";
      this.vy = -6;
      this.vx = 0;
    }
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.life--;
    
    if (this.type === "debris") {
      this.vy += GRAVITY * 0.5; // gravity on brick debris
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = this.life / this.maxLife;
    ctx.fillStyle = this.color;
    
    if (this.type === "coin-star") {
      ctx.beginPath();
      ctx.arc(this.x, this.y, 6, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.type === "debris") {
      ctx.fillRect(this.x - 4, this.y - 4, 8, 8);
    } else {
      ctx.fillRect(this.x - 2, this.y - 2, 4, 4);
    }
    
    ctx.restore();
  }
}

window.GameEngine = GameEngine;
