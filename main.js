// Import necessary packages from the Zora Coins SDK and viem
import { createCoin } from '@zoralabs/coins-sdk';
import { createPublicClient, http, custom, createWalletClient } from 'viem';
import { base } from 'viem/chains';


      // Audio resources
      const AUDIO = {
        backgroundMusic: null,
        hammer: null,
        powerUp: null,
        hit: null,
        gameOver: null,
        milestone: null,
        tokenClaimed: null,
        isMusicMuted: false,
        isSFXMuted: false
      };

      // Load audio resources
      function loadAudio() {
        // Background music (you can replace this with your own music URL)
        AUDIO.backgroundMusic = new Audio("https://lqy3lriiybxcejon.public.blob.vercel-storage.com/e2GNOD2X263E/game-music-loop-7-145285-2wYczgdfpbrRXINIpQJKXphiRz3cI5.mpeg?8YQj");
        AUDIO.backgroundMusic.loop = true;
        AUDIO.backgroundMusic.volume = 0.4;
        
        // Sound effects from the original game (you can replace these with your own SFX URLs)
        AUDIO.hammer = new Audio("https://lcejon.public.blob.vercel-storage.com/e2GNOD2X263E/metal-hit-94-200422-BJS84Lq2gne3CYahSXtphOnKM4ga63.mpeg?23Km");
        AUDIO.powerUp = new Audio("https://lqy3lriiybxcejon.public.blob.vercel-storage.com/e2GNOD2X263E/powerup-41954-cuFsLCPk9MZlX6jsCjvKLepLjZR1Xj.mpeg?hsIC");
        AUDIO.hit = new Audio("https://lqy3lriiybxcejon.public.blob.vercel-storage.com/e2GNOD2X263E/metal-hit-94-200422-BJS84Lq2gne3CYahSXtphOnKM4ga63.mpeg?23Km");
        AUDIO.gameOver = new Audio("https://lqy3lriiybxcejon.public.blob.vercel-storage.com/e2GNOD2X263E/metal-hit-94-200422-BJS84Lq2gne3CYahSXtphOnKM4ga63.mpeg?23Km");
        AUDIO.milestone = new Audio("https://cdn.freesound.org/previews/270/270404_5123851-lq.mp3");
        AUDIO.tokenClaimed = new Audio("https://cdn.freesound.org/previews/270/270402_5123851-lq.mp3");
        
        // Set volumes
        AUDIO.hammer.volume = 0.2;
        AUDIO.powerUp.volume = 0.3;
        AUDIO.hit.volume = 0.3;
        AUDIO.gameOver.volume = 0.4;
        AUDIO.milestone.volume = 0.4;
        AUDIO.tokenClaimed.volume = 0.4;
      }

      // Play a sound effect
      function playSFX(sound) {
        if (AUDIO.isSFXMuted) return;
        
        try {
          const audio = AUDIO[sound];
          if (audio) {
            audio.currentTime = 0;
            audio.play().catch(err => console.log("Audio playback prevented:", err));
          }
        } catch (error) {
          console.log("Sound playback failed:", error);
        }
      }

      // Toggle music
      function toggleMusic() {
        AUDIO.isMusicMuted = !AUDIO.isMusicMuted;
        document.getElementById('music-toggle').textContent = AUDIO.isMusicMuted ? '♪' : '♫';
        
        if (AUDIO.isMusicMuted) {
          AUDIO.backgroundMusic.pause();
        } else {
          AUDIO.backgroundMusic.play().catch(err => console.log("Music playback prevented:", err));
        }
      }

      // Toggle sound effects
      function toggleSFX() {
        AUDIO.isSFXMuted = !AUDIO.isSFXMuted;
        document.getElementById('sfx-toggle').textContent = AUDIO.isSFXMuted ? '🔇' : '🔊';
      }

      // Game configuration
      const config = {
        initialLives: 3,
        playerSpeed: 6,
        hammerSpeed: 4.5,
        enemySpeed: 2.5,
        enemyCount: 6,
        hammerDropChance: 0.025,
        powerUpChance: 0.008,
        shieldDuration: 5000,
        invincibilityTime: 1000,
        difficultyIncreaseInterval: 10000,
        scoreMultiplier: 1,
        // Define milestones
        milestones: {
          50: {
            name: "Ruby Hammer",
            symbol: "RBHM",
            uri: "ipfs://QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco/bronze-hammer.json"
          },
          100: {
            name: "Silver Hammer",
            symbol: "SLHM",
            uri: "ipfs://QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco/silver-hammer.json"
          },
          200: {
            name: "Gold Hammer",
            symbol: "GDHM",
            uri: "ipfs://QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco/gold-hammer.json"
          },
          300: {
            name: "Platinum Hammer",
            symbol: "PTHM",
            uri: "ipfs://QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco/platinum-hammer.json"
          },
          500: {
            name: "Diamond Hammer",
            symbol: "DMHM",
            uri: "ipfs://QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco/diamond-hammer.json"
          },
          1000: {
            name: "Legendary Hammer",
            symbol: "LGHM",
            uri: "ipfs://QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco/legendary-hammer.json"
          }
        }
      };

      // Game state
      const game = {
        state: "loading",
        score: 0,
        lives: config.initialLives,
        player: {
          x: 0,
          y: 0,
          width: 24,
          height: 24,
          element: null,
          shielded: false,
          invincible: false,
        },
        enemies: [],
        hammers: [],
        powerUps: [],
        keys: {
          left: false,
          right: false,
        },
        animationFrameId: null,
        lastUpdateTime: 0,
        isMobile: false,
        touchStartX: 0,
        shieldTimer: null,
        difficultyTimer: null,
        difficultyLevel: 1,
        claimedMilestones: {},
        currentMilestone: null,
        isPaused: false
      };

      // Blockchain variables
      let walletClient;
      let publicClient;
      let account;

      // Elements
      const scoreContainer = document.getElementById("score-container");
      const walletStatus = document.getElementById("wallet-status");
      const lifeContainer = document.getElementById("life-container");
      const player = document.getElementById("player");
      const gameScreen = document.getElementById("game-screen");
      const startScreen = document.getElementById("start-screen");
      const instructionsScreen = document.getElementById("instructions-screen");
      const gameOverScreen = document.getElementById("game-over-screen");
      const loadingScreen = document.getElementById("loading-screen");
      const finalScore = document.getElementById("final-score");
      const milestoneModal = document.getElementById("milestone-modal");
      const milestoneTitle = document.getElementById("milestone-title");
      const milestoneContent = document.getElementById("milestone-content");
      const tokenSuccessModal = document.getElementById("token-success-modal");
      const tokenName = document.getElementById("token-name");
      const tokenSymbol = document.getElementById("token-symbol");
      const tokenAddress = document.getElementById("token-address");

      // Buttons
      const connectWalletButton = document.getElementById("connect-wallet-button");
      const instructionsButton = document.getElementById("instructions-button");
      const startButton = document.getElementById("start-button");
      const backToMenuButton = document.getElementById("back-to-menu");
      const restartButton = document.getElementById("restart-button");
      const menuButton = document.getElementById("menu-button");
      const claimTokenButton = document.getElementById("claim-token-button");
      const continueButton = document.getElementById("continue-button");
      const closeSuccessButton = document.getElementById("close-success-button");
      const musicToggle = document.getElementById("music-toggle");
      const sfxToggle = document.getElementById("sfx-toggle");

      // Initialize the game
      function initGame() {
        loadingScreen.style.display = "flex";
        checkMobile();
        setupEventListeners();
        createFence();
        loadAudio();
        initBlockchain();

        setTimeout(() => {
            document.getElementById("loading-screen").style.display = "none";
            game.state = "start";
          }, 1000);
        }
  
        // Initialize blockchain
        function initBlockchain() {
          publicClient = createPublicClient({
            chain: base,
            transport: http('https://mainnet.base.org'),
          });
        }
  
        // Connect wallet
        async function connectWallet() {
          if (!window.ethereum) {
            alert('Please install MetaMask to claim token rewards');
            return;
          }
  
          try {
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            account = accounts[0];
            
            walletClient = createWalletClient({
              account,
              chain: base,
              transport: custom(window.ethereum),
            });
            
            walletStatus.textContent = `WALLET: ${account.slice(0, 6)}...${account.slice(-4)}`;
            connectWalletButton.style.display = 'none';
            
            // Check if we need to add Base network
            await ensureBaseNetwork();
          } catch (error) {
            console.error('Error connecting wallet:', error);
            walletStatus.textContent = 'WALLET: CONNECTION FAILED';
          }
        }
        
        // Ensure the wallet is connected to Base network
        async function ensureBaseNetwork() {
          try {
            const chainId = await window.ethereum.request({ method: 'eth_chainId' });
            
            if (chainId !== '0x2105') { // Base chain ID in hex
              try {
                await window.ethereum.request({
                  method: 'wallet_switchEthereumChain',
                  params: [{ chainId: '0x2105' }], // Base chain ID
                });
              } catch (switchError) {
                // If the Base network isn't added to MetaMask, add it
                if (switchError.code === 4902) {
                  try {
                    await window.ethereum.request({
                      method: 'wallet_addEthereumChain',
                      params: [{
                        chainId: '0x2105',
                        chainName: 'Base',
                        nativeCurrency: {
                          name: 'Ethereum',
                          symbol: 'ETH',
                          decimals: 18
                        },
                        rpcUrls: ['https://mainnet.base.org'],
                        blockExplorerUrls: ['https://basescan.org']
                      }]
                    });
                  } catch (addError) {
                    console.error('Error adding Base network:', addError);
                  }
                }
              }
            }
          } catch (error) {
            console.error('Error ensuring Base network:', error);
          }
        }
  
        // Copy to clipboard function
        window.copyToClipboard = function(text) {
          navigator.clipboard.writeText(text)
            .then(() => {
              alert('Token address copied to clipboard!');
            })
            .catch(err => {
              console.error('Failed to copy: ', err);
            });
        };
  
        // Check for mobile device
        function checkMobile() {
          game.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        }
  
        // Create fence posts
        function createFence() {
          const fence = document.getElementById("fence");
          const gameWidth = gameScreen.clientWidth;
          const postCount = Math.floor(gameWidth / 30);
  
          fence.innerHTML = "";
  
          for (let i = 0; i < postCount; i++) {
            const post = document.createElement("div");
            post.className = "fence-post";
            fence.appendChild(post);
          }
        }
  
        // Setup event listeners
        function setupEventListeners() {
          connectWalletButton.addEventListener('click', connectWallet);
          instructionsButton.addEventListener('click', showInstructions);
          startButton.addEventListener('click', startGame);
          backToMenuButton.addEventListener('click', showMenu);
          restartButton.addEventListener('click', restartGame);
          menuButton.addEventListener('click', showMenu);
          claimTokenButton.addEventListener('click', claimCurrentMilestone);
          continueButton.addEventListener('click', resumeGame);
          closeSuccessButton.addEventListener('click', closeTokenSuccessModal);
          musicToggle.addEventListener('click', toggleMusic);
          sfxToggle.addEventListener('click', toggleSFX);
  
          // Keyboard controls
          window.addEventListener("keydown", (e) => {
            if (game.isPaused) return;
            
            switch (e.key) {
              case "ArrowLeft":
              case "a":
              case "A":
                game.keys.left = true;
                break;
              case "ArrowRight":
              case "d":
              case "D":
                game.keys.right = true;
                break;
            }
          });
  
          window.addEventListener("keyup", (e) => {
            switch (e.key) {
              case "ArrowLeft":
              case "a":
              case "A":
                game.keys.left = false;
                break;
              case "ArrowRight":
              case "d":
              case "D":
                game.keys.right = false;
                break;
            }
          });
  
          // Touch controls
          gameScreen.addEventListener("touchstart", (e) => {
            if (game.state !== "playing" || game.isPaused) return;
  
            const touch = e.touches[0];
            game.touchStartX = touch.clientX;
  
            // Move player based on touch position relative to screen center
            const screenWidth = gameScreen.clientWidth;
            const screenCenter = screenWidth / 2;
  
            if (touch.clientX < screenCenter) {
              game.keys.left = true;
              game.keys.right = false;
            } else {
              game.keys.right = true;
              game.keys.left = false;
            }
  
            e.preventDefault();
          });
  
          gameScreen.addEventListener("touchend", (e) => {
            game.keys.left = false;
            game.keys.right = false;
            e.preventDefault();
          });
  
          gameScreen.addEventListener("touchmove", (e) => {
            e.preventDefault();
          });
  
          // Window resize
          window.addEventListener("resize", createFence);
        }
  
        // Show instructions screen
        function showInstructions() {
          startScreen.style.display = "none";
          instructionsScreen.style.display = "flex";
        }
  
        // Show menu screen
        function showMenu() {
          game.state = "start";
          game.isPaused = false;
          
          gameOverScreen.style.display = "none";
          instructionsScreen.style.display = "none";
          startScreen.style.display = "flex";
          
          resetGameState();
        }
  
        // Start the game
        function startGame() {
          startScreen.style.display = "none";
          resetGameState();
          createEnemies();
          game.player.element = document.getElementById("player");
          game.player.x = game.player.element.offsetLeft;
          game.player.y = game.player.element.offsetTop;
          game.lastUpdateTime = performance.now();
          game.state = "playing";
          game.isPaused = false;
          
          // Start hammer spawning
          startDifficultyTimer();
          gameLoop();
          
          // Start background music
          if (!AUDIO.isMusicMuted) {
            AUDIO.backgroundMusic.play().catch(err => console.log("Music playback prevented:", err));
          }
        }
  
        // Start difficulty timer
        function startDifficultyTimer() {
          if (game.difficultyTimer) clearInterval(game.difficultyTimer);
  
          game.difficultyTimer = setInterval(() => {
            if (game.state === "playing" && !game.isPaused) {
              game.difficultyLevel++;
              config.hammerDropChance += 0.005;
              config.scoreMultiplier += 0.2;
  
              // Flash the screen to indicate difficulty increase
              gameScreen.classList.add("flash");
              setTimeout(() => {
                gameScreen.classList.remove("flash");
              }, 200);
            }
          }, config.difficultyIncreaseInterval);
        }
  
        // Reset game state
        function resetGameState() {
          game.score = 0;
          game.lives = config.initialLives;
          game.difficultyLevel = 1;
          config.hammerDropChance = 0.025;
          config.scoreMultiplier = 1;
          updateScoreDisplay();
          updateLivesDisplay();
  
          // Clean up existing elements
          clearGameElements();
  
          game.player.shielded = false;
          game.player.invincible = false;
          document.getElementById("shield").style.display = "none";
  
          game.enemies = [];
          game.hammers = [];
          game.powerUps = [];
          game.currentMilestone = null;
  
          if (game.shieldTimer) clearTimeout(game.shieldTimer);
          if (game.difficultyTimer) clearInterval(game.difficultyTimer);
          if (game.animationFrameId) cancelAnimationFrame(game.animationFrameId);
        }
  
        // Clear game elements
        function clearGameElements() {
          const elements = gameScreen.querySelectorAll(".enemy, .hammer, .power-up, .cloud");
          elements.forEach((element) => element.remove());
        }
  
        // Create enemies
        function createEnemies() {
          const screenWidth = gameScreen.clientWidth;
  
          for (let i = 0; i < config.enemyCount; i++) {
            createEnemy(Math.random() * (screenWidth - 30) + 15, 50 + Math.random() * 30);
          }
  
          // Create a few clouds for decoration
          for (let i = 0; i < 3; i++) {
            createCloud();
          }
  
          // Start with a few hammers already falling
          for (let i = 0; i < 2; i++) {
            const enemy = game.enemies[Math.floor(Math.random() * game.enemies.length)];
            if (enemy) {
              createHammer(enemy.x + enemy.width / 2 - 6, enemy.y + enemy.height);
            }
          }
  
          // Start with a power-up
          createPowerUp();
        }
  
        // Create enemy
        function createEnemy(x, y) {
          const enemy = {
            x: x,
            y: y,
            width: 16,
            height: 16,
            velocityX: config.enemySpeed * (Math.random() > 0.5 ? 1 : -1),
            dropTimer: Math.floor(Math.random() * 60),
            element: document.createElement("div"),
          };
  
          enemy.element.className = "enemy";
          enemy.element.style.left = `${enemy.x}px`;
          enemy.element.style.top = `${enemy.y}px`;
  
          gameScreen.appendChild(enemy.element);
          game.enemies.push(enemy);
        }
  
        // Create hammer
        function createHammer(x, y) {
          const hammer = {
            x: x,
            y: y,
            width: 12,
            height: 20,
            velocityY: config.hammerSpeed * (1 + (game.difficultyLevel - 1) * 0.1), // Increases with difficulty
            element: document.createElement("div"),
          };
  
          hammer.element.className = "hammer";
          hammer.element.style.left = `${hammer.x}px`;
          hammer.element.style.top = `${hammer.y}px`;
  
          gameScreen.appendChild(hammer.element);
          game.hammers.push(hammer);
          
          // Play hammer sound
          playSFX('hammer');
        }
  
        // Create power-up
        function createPowerUp() {
          const screenWidth = gameScreen.clientWidth;
  
          const powerUp = {
            x: Math.random() * (screenWidth - 20) + 10,
            y: 120,
            width: 16,
            height: 16,
            velocityY: 1.5,
            element: document.createElement("div"),
          };
  
          powerUp.element.className = "power-up";
          powerUp.element.style.left = `${powerUp.x}px`;
          powerUp.element.style.top = `${powerUp.y}px`;
  
          gameScreen.appendChild(powerUp.element);
          game.powerUps.push(powerUp);
        }
  
        // Create cloud
        function createCloud() {
          const screenWidth = gameScreen.clientWidth;
  
          const cloud = document.createElement("div");
          cloud.className = "cloud";
          cloud.style.left = `${Math.random() * screenWidth}px`;
  
          gameScreen.appendChild(cloud);
        }
  
        // Game loop
        function gameLoop(currentTime) {
          if (game.state !== "playing" || game.isPaused) return;
  
          const deltaTime = currentTime - game.lastUpdateTime;
          game.lastUpdateTime = currentTime;
  
          // Add passive score gain over time
          game.score += 0.01 * game.difficultyLevel;
          updateScoreDisplay();
  
          updatePlayer();
          updateEnemies();
          updateHammers();
          updatePowerUps();
          checkMilestones();
  
          // Random events
          if (Math.random() < config.powerUpChance) {
            createPowerUp();
          }
  
          game.animationFrameId = requestAnimationFrame(gameLoop);
        }
  
        // Update player
        function updatePlayer() {
          const screenWidth = gameScreen.clientWidth;
  
          // Move player based on keyboard/touch input
          if (game.keys.left) {
            game.player.x -= config.playerSpeed;
          }
          if (game.keys.right) {
            game.player.x += config.playerSpeed;
          }
  
          // Keep player within screen bounds
          if (game.player.x < 0) {
            game.player.x = 0;
          }
          if (game.player.x + game.player.width > screenWidth) {
            game.player.x = screenWidth - game.player.width;
          }
  
          // Update player element position
          game.player.element.style.left = `${game.player.x}px`;
        }
  
        // Update enemies
        function updateEnemies() {
          const screenWidth = gameScreen.clientWidth;
  
          game.enemies.forEach((enemy) => {
            // Move enemy
            enemy.x += enemy.velocityX * (1 + (game.difficultyLevel - 1) * 0.05); // Enemies get slightly faster as difficulty increases
  
            // Reverse direction if hitting screen edge
            if (enemy.x <= 0 || enemy.x + enemy.width >= screenWidth) {
              enemy.velocityX *= -1;
              enemy.x += enemy.velocityX;
            }
  
            // Update enemy element position
            enemy.element.style.left = `${enemy.x}px`;
  
            // Drop hammer logic - chance increases with difficulty
            enemy.dropTimer++;
            const dropChance = config.hammerDropChance * (1 + (game.difficultyLevel - 1) * 0.2);
  
            if (enemy.dropTimer > 60 && Math.random() < dropChance) {
              createHammer(enemy.x + enemy.width / 2 - 6, enemy.y + enemy.height);
              enemy.dropTimer = 0;
            }
          });
        }
  
        // Update hammers
        function updateHammers() {
          const groundY = gameScreen.clientHeight - 50;
  
          for (let i = game.hammers.length - 1; i >= 0; i--) {
            const hammer = game.hammers[i];
  
            // Move hammer
            hammer.y += hammer.velocityY;
  
            // Update hammer element position
            hammer.element.style.top = `${hammer.y}px`;
  
            // Check if hammer hits ground
            if (hammer.y >= groundY - hammer.height) {
              hammer.element.remove();
              game.hammers.splice(i, 1);
  
              // Award points for successful dodge
              game.score += 1 * config.scoreMultiplier;
              updateScoreDisplay();
              continue;
            }
  
            // Check collision with player
            if (checkCollision(hammer, game.player)) {
              if (game.player.shielded) {
                // Shield absorbs the hit
                game.score += 5 * config.scoreMultiplier;
                updateScoreDisplay();
                playSFX('powerUp');
              } else if (!game.player.invincible) {
                // Player takes damage
                loseLife();
              }
  
              hammer.element.remove();
              game.hammers.splice(i, 1);
            }
          }
        }
  
        // Update power-ups
        function updatePowerUps() {
          const groundY = gameScreen.clientHeight - 50;
  
          for (let i = game.powerUps.length - 1; i >= 0; i--) {
            const powerUp = game.powerUps[i];
  
            // Move power-up
            powerUp.y += powerUp.velocityY;
  
            // Update power-up element position
            powerUp.element.style.top = `${powerUp.y}px`;
  
            // Check if power-up hits ground
            if (powerUp.y >= groundY - powerUp.height) {
              powerUp.element.remove();
              game.powerUps.splice(i, 1);
              continue;
            }
  
            // Check collision with player
            if (checkCollision(powerUp, game.player)) {
              activateShield();
              game.score += 10 * config.scoreMultiplier;
              updateScoreDisplay();
  
              powerUp.element.remove();
              game.powerUps.splice(i, 1);
  
              playSFX('powerUp');
            }
          }
        }
  
        // Activate shield
        function activateShield() {
          if (game.shieldTimer) clearTimeout(game.shieldTimer);
  
          game.player.shielded = true;
          document.getElementById("shield").style.display = "block";
  
          game.shieldTimer = setTimeout(() => {
            game.player.shielded = false;
            document.getElementById("shield").style.display = "none";
          }, config.shieldDuration);
        }
  
        // Check collision between two objects
        function checkCollision(obj1, obj2) {
          return (
            obj1.x < obj2.x + obj2.width &&
            obj1.x + obj1.width > obj2.x &&
            obj1.y < obj2.y + obj2.height &&
            obj1.y + obj1.height > obj2.y
          );
        }
  
        // Lose a life
        function loseLife() {
          if (game.player.invincible) return;
  
          game.lives--;
          updateLivesDisplay();
          playSFX('hit');
  
          // Make screen flash
          gameScreen.classList.add("flash");
          setTimeout(() => {
            gameScreen.classList.remove("flash");
          }, 200);
  
          // Make player briefly invincible
          game.player.invincible = true;
          game.player.element.style.opacity = 0.5;
  
          setTimeout(() => {
            game.player.invincible = false;
            game.player.element.style.opacity = 1;
          }, config.invincibilityTime);
  
          if (game.lives <= 0) {
            endGame();
          }
        }
  
        // Update score display
        function updateScoreDisplay() {
          const scoreValue = Math.floor(game.score);
          scoreContainer.textContent = `SCORE: ${scoreValue}`;
        }
  
        // Update lives display
        function updateLivesDisplay() {
          const lifeElements = lifeContainer.querySelectorAll(".life");
  
          for (let i = 0; i < lifeElements.length; i++) {
            if (i < game.lives) {
              lifeElements[i].style.visibility = "visible";
            } else {
              lifeElements[i].style.visibility = "hidden";
            }
          }
        }
  
        // Check milestones
        function checkMilestones() {
          const currentScore = Math.floor(game.score);
          const milestones = Object.keys(config.milestones).map(Number).sort((a, b) => a - b);
          
          for (const milestone of milestones) {
            if (currentScore >= milestone && !game.claimedMilestones[milestone] && game.currentMilestone !== milestone) {
              // We've reached a new milestone
              pauseGameForMilestone(milestone);
              break;
            }
          }
        }
  
        // Pause game for milestone
        function pauseGameForMilestone(milestone) {
          game.isPaused = true;
          game.currentMilestone = milestone;
          
          const milestoneData = config.milestones[milestone];
          
          // Update milestone modal
          milestoneTitle.textContent = `${milestoneData.name} Earned!`;
          milestoneContent.textContent = `Congratulations! You've reached ${milestone} points and earned a ${milestoneData.name} token. Claim it now to mint it on the blockchain.`;
          
          // Show milestone modal
          milestoneModal.style.display = "flex";
          
          // Play milestone sound
          playSFX('milestone');
        }
  
        // Resume game after milestone
        function resumeGame() {
          milestoneModal.style.display = "none";
          game.isPaused = false;
          game.currentMilestone = null;
          game.lastUpdateTime = performance.now();
          gameLoop(game.lastUpdateTime);
        }
  
        // Claim current milestone token
        async function claimCurrentMilestone() {
          if (!account || !walletClient) {
            alert('Please connect your wallet first');
            return;
          }
          
          if (!game.currentMilestone) return;
          
          const milestone = game.currentMilestone;
          const details = config.milestones[milestone];
          
          // Update button
          claimTokenButton.textContent = "CLAIMING...";
          claimTokenButton.disabled = true;
          
          try {
            // Create the coin using Zora SDK
            const result = await createCoin(
              {
                name: details.name,
                symbol: details.symbol,
                uri: details.uri,
                payoutRecipient: account,
                initialPurchaseWei: 0n,
              },
              walletClient,
              publicClient
            );
            
            // Mark the milestone as claimed
            game.claimedMilestones[milestone] = true;
            
            // Hide milestone modal
            milestoneModal.style.display = "none";
            
            // Update token success modal
            tokenName.textContent = `Name: ${details.name}`;
            tokenSymbol.textContent = `Symbol: ${details.symbol}`;
            tokenAddress.textContent = result.address;
            
            // Show token success modal
            tokenSuccessModal.style.display = "flex";
            
            // Play token claimed sound
            playSFX('tokenClaimed');
            
            console.log(`Successfully claimed ${details.name} token at address: ${result.address}`);
          } catch (error) {
            console.error('Error claiming token:', error);
            alert(`Failed to claim token: ${error.message}`);
            
            // Reset claim button
            claimTokenButton.textContent = "CLAIM TOKEN";
            claimTokenButton.disabled = false;
          }
        }
  
        // Close token success modal
        function closeTokenSuccessModal() {
          tokenSuccessModal.style.display = "none";
          game.isPaused = false;
          game.currentMilestone = null;
          game.lastUpdateTime = performance.now();
          gameLoop(game.lastUpdateTime);
        }
  
        // End game
        function endGame() {
          game.state = "gameOver";
          game.isPaused = true;
          cancelAnimationFrame(game.animationFrameId);
          clearInterval(game.difficultyTimer);
          
          // Update final score
          finalScore.textContent = `SCORE: ${Math.floor(game.score)}`;
          
          // Show game over screen
          gameOverScreen.style.display = "flex";
          
          // Stop music and play game over sound
          AUDIO.backgroundMusic.pause();
          playSFX('gameOver');
        }
  
        // Restart game
        function restartGame() {
          gameOverScreen.style.display = "none";
          startGame();
        }
  
        // Initialize the game when DOM content is loaded
        window.addEventListener("DOMContentLoaded", initGame);
   