document.addEventListener("DOMContentLoaded", async () => {
  // --- Terminal Initialization - Syn_OS v8.0 Red Phoenix Theme ---
  const term = new Terminal({
    cursorBlink: true,
    fontFamily: "'IBM Plex Mono', 'Rajdhani', 'Consolas', 'monospace'",
    theme: {
      background: "#000000", // Pure black void
      foreground: "#FF0000", // True red - only red
      cursor: "#CC6600", // Dark amber accent
      cursorAccent: "#CC6600", // Dark amber
      selection: "#FF000033", // Semi-transparent red
      black: "#000000",
      red: "#FF0000", // True red
      green: "#FF0000", // True red (no green)
      yellow: "#CC6600", // Dark amber
      blue: "#FF0000", // True red (no blue)
      magenta: "#FF0000", // True red
      cyan: "#CC6600", // Dark amber
      white: "#FF0000", // True red
      brightBlack: "#330000",
      brightRed: "#FF0000", // True red
      brightGreen: "#FF0000", // True red
      brightYellow: "#CC6600", // Dark amber
      brightBlue: "#FF0000", // True red
      brightMagenta: "#FF0000", // True red
      brightCyan: "#CC6600", // Dark amber
      brightWhite: "#FFFFFF", // Pure white for critical alerts
    },
  });
  const fitAddon = new FitAddon.FitAddon();
  term.loadAddon(fitAddon);
  term.open(document.getElementById("terminal"));
  fitAddon.fit();
  window.addEventListener("resize", () => fitAddon.fit());

  // --- State Management ---
  const PROMPT = "\x1b[1;31m[Ty@SynOS ~]#\x1b[0m "; // Red prompt, root shell aesthetic
  let commandHistory = JSON.parse(
    localStorage.getItem("commandHistory") || "[]"
  );
  let historyIndex = commandHistory.length;
  let currentInput = "";
  let commands = {};
  let aliases = JSON.parse(localStorage.getItem("terminalAliases") || "{}");
  let installedPackages = JSON.parse(
    localStorage.getItem("installedPackages") || "[]"
  );
  let customTheme = JSON.parse(localStorage.getItem("customTheme") || "null");
  let isPaging = false;
  let pageContent = [];
  let pageIndex = 0;
  let commandUsageStats = JSON.parse(
    localStorage.getItem("commandStats") || "{}"
  );
  let sessionStartTime = Date.now();
  let visitCount = parseInt(localStorage.getItem("visitCount") || "0") + 1;
  localStorage.setItem("visitCount", visitCount.toString());

  // Rate limiting to prevent command spam
  const rateLimiter = {
    commands: [],
    limit: 20, // 20 commands per 10 seconds
    windowMs: 10000,

    check() {
      const now = Date.now();
      this.commands = this.commands.filter((t) => now - t < this.windowMs);

      if (this.commands.length >= this.limit) {
        return false;
      }

      this.commands.push(now);
      return true;
    },

    getRemainingTime() {
      const now = Date.now();
      const oldest = this.commands[0];
      return Math.ceil((this.windowMs - (now - oldest)) / 1000);
    },
  };

  // Performance optimizations
  let commandCache = {};
  const CACHE_DURATION = 60000; // 1 minute cache

  const getCachedResult = (cmd) => {
    const cached = commandCache[cmd];
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.result;
    }
    return null;
  };

  const setCachedResult = (cmd, result) => {
    commandCache[cmd] = {
      result: result,
      timestamp: Date.now(),
    };
  };

  // --- Session Persistence Functions ---
  const saveHistory = () => {
    const recentHistory = commandHistory.slice(-50); // Keep last 50 commands
    localStorage.setItem("commandHistory", JSON.stringify(recentHistory));
  };

  const trackCommandUsage = (cmd) => {
    if (!commandUsageStats[cmd]) {
      commandUsageStats[cmd] = 0;
    }
    commandUsageStats[cmd]++;
    localStorage.setItem("commandStats", JSON.stringify(commandUsageStats));

    // Track with Google Analytics if available
    if (window.gtag) {
      gtag("event", "command_executed", {
        command_name: cmd,
        timestamp: new Date().toISOString(),
      });
    }
  };

  const logError = (error, context) => {
    console.error(`[Portfolio Error] ${context}:`, error);
    if (window.gtag) {
      gtag("event", "exception", {
        description: `${context}: ${error.message}`,
        fatal: false,
      });
    }
  };

  // --- Error Boundary: Global handler ---
  window.addEventListener("error", (event) => {
    console.error("[Portfolio Error]", event.error);
    if (term) {
      term.writeln("\r\n\x1b[1;31mX Unexpected error occurred\x1b[0m");
      term.writeln(
        "\x1b[1;31mPlease refresh the page. Error logged to console.\x1b[0m"
      );
    }
  });

  window.addEventListener("unhandledrejection", (event) => {
    console.error("[Portfolio Promise Rejection]", event.reason);
    if (term) {
      term.writeln("\r\n\x1b[1;31mX Async operation failed\x1b[0m");
      term.writeln(
        "\x1b[1;31mError: " + (event.reason?.message || "Unknown") + "\x1b[0m"
      );
    }
  });

  // --- Load Command Data with retry logic ---
  let commandsLoaded = false;
  let retryCount = 0;
  const maxRetries = 3;

  while (!commandsLoaded && retryCount < maxRetries) {
    try {
      const response = await fetch("js/data/commands.json");
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      commands = await response.json();
      commandsLoaded = true;
    } catch (error) {
      retryCount++;
      console.error(
        `[Portfolio] Failed to load commands (attempt ${retryCount}/${maxRetries}):`,
        error
      );

      if (retryCount >= maxRetries) {
        term.writeln("\x1b[1;31mX Error: Could not load commands.json\x1b[0m");
        term.writeln(`\x1b[1;31mDetails: ${error.message}\x1b[0m`);
        term.writeln(
          "\x1b[1;31mSome features may be unavailable. Please refresh.\x1b[0m\r\n"
        );
      } else {
        await new Promise((resolve) => setTimeout(resolve, 1000 * retryCount));
      }
    }
  }

  // --- Animated Welcome Message ---
  // 1. Web Audio API for retro terminal sounds
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  let skipBoot = false;

  const playBeep = (frequency = 800, duration = 50) => {
    try {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = "square";

      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        audioContext.currentTime + duration / 1000
      );

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration / 1000);
    } catch (e) {
      // Audio not supported, silently continue
    }
  };

  const playGeigerClick = () => {
    try {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 3000;
      oscillator.type = "square";

      gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        audioContext.currentTime + 0.02
      );

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.02);
    } catch (e) {
      // Audio not supported, silently continue
    }
  };

  // Bonus: Skip boot with ESC or SPACE
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" || e.key === " ") {
      skipBoot = true;
    }
  });

  const typeText = (text, delay = 20) => {
    return new Promise((resolve) => {
      let i = 0;
      const interval = setInterval(() => {
        if (skipBoot || i >= text.length) {
          clearInterval(interval);
          if (skipBoot && i < text.length) {
            term.write(text.substring(i)); // Write remaining text instantly
          }
          resolve();
          return;
        }
        term.write(text[i++]);
      }, delay);
    });
  };

  // 5. Dynamic time-of-day system
  const getTimeOfDay = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 8) return "dawn";
    if (hour >= 8 && hour < 18) return "day";
    if (hour >= 18 && hour < 20) return "dusk";
    return "night";
  };

  // 4. Vault-Tec HUD status bar
  const drawHUD = (stage = "BOOT", sysPercent = 0, memKB = 0, rad = 0.0) => {
    const now = new Date();
    const time = now.toLocaleTimeString("en-US", { hour12: false });
    const date = `${(now.getMonth() + 1).toString().padStart(2, "0")}.${now
      .getDate()
      .toString()
      .padStart(2, "0")}.2299`;

    return `\x1b[1;31m[\x1b[1;31m${stage}\x1b[0m\x1b[1;31m] \x1b[1;31m${sysPercent}%\x1b[0m \x1b[1;31m[MEM] \x1b[1;31m${memKB}KB\x1b[0m \x1b[1;31m[RAD] \x1b[1;${
      rad > 2 ? "33" : "32"
    }m${rad.toFixed(1)}\x1b[0m \x1b[1;31m[${time}] [${date}]\x1b[0m`;
  };

  const animateWelcome = async () => {
    // WASTELANDS BOOT SEQUENCE - Fallout New Vegas inspired

    // Personal branding boot logo
    term.writeln(
      "\x1b[1;31m╔═══════════════════════════════════════════════════════════════════════════╗\x1b[0m"
    );
    term.writeln(
      "\x1b[1;31m║\x1b[0m                                                                           \x1b[1;31m║\x1b[0m"
    );
    term.writeln(
      "\x1b[1;31m║\x1b[0m           \x1b[1;31m████████╗    ██╗     ██╗███╗   ███╗ ██████╗  ██████╗ ███████╗\x1b[0m    \x1b[1;31m║\x1b[0m"
    );
    term.writeln(
      "\x1b[1;31m║\x1b[0m           \x1b[1;31m╚══██╔══╝    ██║     ██║████╗ ████║██╔═══██╗██╔════╝ ██╔════╝\x1b[0m    \x1b[1;31m║\x1b[0m"
    );
    term.writeln(
      "\x1b[1;31m║\x1b[0m              \x1b[1;31m██║       ██║     ██║██╔████╔██║██║   ██║██║  ███╗█████╗\x1b[0m      \x1b[1;31m║\x1b[0m"
    );
    term.writeln(
      "\x1b[1;31m║\x1b[0m              \x1b[1;31m██║       ██║     ██║██║╚██╔╝██║██║   ██║██║   ██║██╔══╝\x1b[0m      \x1b[1;31m║\x1b[0m"
    );
    term.writeln(
      "\x1b[1;31m║\x1b[0m              \x1b[1;31m██║       ███████╗██║██║ ╚═╝ ██║╚██████╔╝╚██████╔╝███████╗\x1b[0m    \x1b[1;31m║\x1b[0m"
    );
    term.writeln(
      "\x1b[1;31m║\x1b[0m              \x1b[1;31m╚═╝       ╚══════╝╚═╝╚═╝     ╚═╝ ╚═════╝  ╚═════╝ ╚══════╝\x1b[0m    \x1b[1;31m║\x1b[0m"
    );
    term.writeln(
      "\x1b[1;31m║\x1b[0m                                                                           \x1b[1;31m║\x1b[0m"
    );
    term.writeln(
      "\x1b[1;31m║\x1b[0m                         \x1b[1;31m╔═══════════════════════╗\x1b[0m                        \x1b[1;31m║\x1b[0m"
    );
    term.writeln(
      "\x1b[1;31m║\x1b[0m                         \x1b[1;31m║\x1b[0m    \x1b[1;31m[ TLIMOGES ]\x1b[0m     \x1b[1;31m║\x1b[0m                        \x1b[1;31m║\x1b[0m"
    );
    term.writeln(
      "\x1b[1;31m║\x1b[0m                         \x1b[1;31m╚═══════════════════════╝\x1b[0m                        \x1b[1;31m║\x1b[0m"
    );
    term.writeln(
      "\x1b[1;31m║\x1b[0m                                                                           \x1b[1;31m║\x1b[0m"
    );
    term.writeln(
      "\x1b[1;31m║\x1b[0m                  \x1b[1;31mCybersecurity Portfolio & Research Terminal\x1b[0m              \x1b[1;31m║\x1b[0m"
    );
    term.writeln(
      "\x1b[1;31m║\x1b[0m                       \x1b[1;31mEthical AI Red Team | OPSEC Specialist\x1b[0m               \x1b[1;31m║\x1b[0m"
    );
    term.writeln(
      "\x1b[1;31m║\x1b[0m                                                                           \x1b[1;31m║\x1b[0m"
    );
    term.writeln(
      "\x1b[1;31m╚═══════════════════════════════════════════════════════════════════════════╝\x1b[0m"
    );
    term.writeln("");
    term.writeln(
      "\x1b[1;31m                    [Press ESC or SPACE to skip boot sequence]\x1b[0m"
    );
    term.writeln("");
    if (!skipBoot) await new Promise((r) => setTimeout(r, 800));

    // HUD Display
    term.writeln(drawHUD("INIT", 0, 0, 0.0));
    term.writeln("");

    // Initial BIOS-style boot messages
    playBeep(1000, 100);
    await typeText(
      "\x1b[1;31m[BIOS v3.14] T.Limoges Portfolio Terminal\x1b[0m",
      8
    );
    term.writeln("");
    if (!skipBoot) await new Promise((r) => setTimeout(r, 150));

    await typeText("\x1b[1;31mDetecting hardware... \x1b[0m", 8);
    if (!skipBoot) await new Promise((r) => setTimeout(r, 300));
    playBeep(800, 50);
    term.writeln("\x1b[1;31m[OK]\x1b[0m");

    await typeText(
      "\x1b[1;31mInitializing T.Limoges Security Terminal... \x1b[0m",
      8
    );
    if (!skipBoot) await new Promise((r) => setTimeout(r, 300));
    playBeep(800, 50);
    term.writeln("\x1b[1;31m[OK]\x1b[0m");

    // 2. POST Memory Check with Progressive Corruption & Recovery
    term.writeln("");
    term.write("\x1b[2A"); // Move up to update HUD
    term.write("\r" + drawHUD("POST", 10, 0, 0.0));
    term.write("\x1b[2B\r"); // Move back down

    await typeText(
      "\x1b[1;31mPerforming POST (Power-On Self-Test)...\x1b[0m",
      8
    );
    term.writeln("");
    if (!skipBoot) await new Promise((r) => setTimeout(r, 100));

    // Memory addresses with progressive corruption that recovers
    const memAddresses = [
      "0x0000F000",
      "0x0001F000",
      "0x0002F000",
      "0x0003F000",
      "0x0004F000",
      "0x0005F000",
      "0x0006F000",
      "0x0007F000",
    ];

    for (let i = 0; i < memAddresses.length; i++) {
      const addr = memAddresses[i];
      playBeep(600 + i * 50, 30);

      // Progressive corruption stages - gets worse in middle, then recovers
      const corruptionLevel = i < 4 ? i : 7 - i; // 0,1,2,3,3,2,1,0
      const corruptionStages = ["", "░", "▒░", "▓▒░", "█▓▒░"];

      if (corruptionLevel > 0 && !skipBoot) {
        term.write(`\x1b[1;31mChecking ${addr}... \x1b[0m`);

        // Show progressive corruption
        for (let stage = corruptionLevel; stage > 0; stage--) {
          if (skipBoot) break;
          term.write(`\x1b[1;31m${corruptionStages[stage]}\x1b[0m`);
          await new Promise((r) => setTimeout(r, 40));
          term.write(
            "\b".repeat(stage) + " ".repeat(stage) + "\b".repeat(stage)
          );
          await new Promise((r) => setTimeout(r, 20));
        }
      }

      term.writeln(`\x1b[1;31mChecking ${addr}... \x1b[1;31m[OK]\x1b[0m`);

      // Update HUD mem
      const memSoFar = 4096 * (i + 1);
      term.write("\x1b[" + (i + 5) + "A"); // Move up
      term.write("\r" + drawHUD("POST", 10 + i * 10, memSoFar, 0.0));
      term.write("\x1b[" + (i + 5) + "B\r"); // Move back

      if (!skipBoot) await new Promise((r) => setTimeout(r, 40));
    }

    playBeep(1200, 80);
    term.writeln("\x1b[1;31m+ Memory Test Complete: 32768 KB OK\x1b[0m");
    if (!skipBoot) await new Promise((r) => setTimeout(r, 200));

    // 1. Radiation Counter Animation with Geiger clicks
    term.writeln("");
    await typeText("\x1b[1;31mInitializing Geiger Counter... \x1b[0m", 8);
    term.writeln("");

    const radLevels = [0.5, 1.2, 2.8, 4.5, 3.1, 1.8, 0.3, 0.0];
    for (let i = 0; i < radLevels.length; i++) {
      if (skipBoot && i > 2) break;
      const rad = radLevels[i];

      // Click faster when radiation is higher
      if (rad > 2 && !skipBoot) {
        for (let j = 0; j < 3; j++) {
          playGeigerClick();
          await new Promise((r) => setTimeout(r, 80 / (rad + 1)));
        }
      } else if (!skipBoot) {
        playGeigerClick();
      }

      term.write(
        `\r\x1b[1;31mRadiation Level: \x1b[${
          rad > 2 ? "1;33" : "1;32"
        }m${rad.toFixed(1)} mSv/hr\x1b[0m`
      );

      // Update HUD
      term.write("\x1b[16A");
      term.write("\r" + drawHUD("RAD", 90, 32768, rad));
      term.write("\x1b[16B\r");

      if (!skipBoot) await new Promise((r) => setTimeout(r, 80));
    }
    playBeep(1000, 100);
    term.writeln(
      "\r\x1b[1;31m+ Radiation Level: 0.0 mSv/hr [SAFE]\x1b[0m                "
    );

    // Final HUD update
    term.write("\x1b[17A");
    term.write("\r" + drawHUD("BOOT", 100, 32768, 0.0));
    term.write("\x1b[17B\r");

    if (!skipBoot) await new Promise((r) => setTimeout(r, 200));

    term.writeln(
      "\x1b[1;31mLoading Red Phoenix Security Kernel 8.4.2025\x1b[0m"
    );
    if (!skipBoot) await new Promise((r) => setTimeout(r, 200));
    term.writeln("");

    // Animated desert landscape - Vector ASCII art style
    term.writeln(
      "\x1b[1;31m╔═══════════════════════════════════════════════════════════════════════════╗\x1b[0m"
    );
    term.writeln(
      "\x1b[1;31m║\x1b[0m                   \x1b[1;31mT LIMOGES - Cybersecurity Portfolio\x1b[0m                   \x1b[1;31m║\x1b[0m"
    );
    term.writeln(
      '\x1b[1;31m║\x1b[0m                  \x1b[1;31m"Securing Systems, One Line at a Time"\x1b[0m                \x1b[1;31m║\x1b[0m'
    );
    term.writeln(
      "\x1b[1;31m╚═══════════════════════════════════════════════════════════════════════════╝\x1b[0m"
    );
    term.writeln("");

    // 5. Dynamic time-of-day landscape system
    const timeOfDay = getTimeOfDay();
    const timeLabels = {
      dawn: "[Mojave Desert - Dawn - Day 2,299]",
      day: "[Mojave Desert - Midday - Day 2,299]",
      dusk: "[Mojave Desert - Dusk - Day 2,299]",
      night: "[Mojave Desert - Night - Day 2,299]",
    };

    if (!skipBoot) await new Promise((r) => setTimeout(r, 300));

    // Sun/Moon animation based on time
    term.writeln(
      `\x1b[1;31m                                            ${timeLabels[timeOfDay]}\x1b[0m`
    );
    term.writeln(
      "\x1b[1;31m                                                                      \x1b[0m"
    );

    if (timeOfDay === "dawn") {
      // Frame 1: Just peeking
      if (!skipBoot) {
        term.write("\r\x1b[1;31m                    .___.\x1b[0m");
        await new Promise((r) => setTimeout(r, 200));
        term.write("\r\x1b[1;31m                    .---.\x1b[0m");
        await new Promise((r) => setTimeout(r, 200));
        term.write("\r\x1b[1;31m                   /     \\\x1b[0m");
        await new Promise((r) => setTimeout(r, 200));
        term.write("\r\x1b[1;31m                   /  SUN  \\\x1b[0m");
        await new Promise((r) => setTimeout(r, 200));
      }
      term.write("\r\x1b[1;31m                  |   SUN   |\x1b[0m");
      term.writeln("");
      if (!skipBoot) await new Promise((r) => setTimeout(r, 150));
      term.writeln("\x1b[1;31m                   \\      /\x1b[0m");
      if (!skipBoot) await new Promise((r) => setTimeout(r, 150));
      term.writeln("\x1b[1;31m                    '--.--'\x1b[0m");
    } else if (timeOfDay === "day") {
      // High sun with heat shimmer effect
      term.writeln("\x1b[1;31m                  .--∼∼--.\x1b[0m");
      term.writeln(
        "\x1b[1;31m                 /   SUN   \\\x1b[0m     \x1b[1;31m[Heat Shimmer]\x1b[0m"
      );
      term.writeln("\x1b[1;31m                 \\       /\x1b[0m");
      term.writeln("\x1b[1;31m                  '--∼∼--'\x1b[0m");
    } else if (timeOfDay === "dusk") {
      // Orange/red sunset
      term.writeln("\x1b[1;31m                  .------.\x1b[0m");
      term.writeln(
        "\x1b[1;31m                 /   O   \\\x1b[0m     \x1b[1;31m[Sunset]\x1b[0m"
      );
      term.writeln("\x1b[1;31m                 \\       /\x1b[0m");
      term.writeln("\x1b[1;31m                  '------'\x1b[0m");
    } else {
      // Night - moon and stars
      term.writeln(
        "\x1b[1;31m        ·           .------.\x1b[0m         \x1b[1;31m   ·\x1b[0m"
      );
      term.writeln(
        "\x1b[1;31m                   /   MOON   \\\x1b[0m     \x1b[1;31m[Night]\x1b[0m"
      );
      term.writeln(
        "\x1b[1;31m     ·             \\       /\x1b[0m           \x1b[1;31m·\x1b[0m"
      );
      term.writeln(
        "\x1b[1;31m                    '------'\x1b[0m      \x1b[1;31m·\x1b[0m"
      );
    }
    term.writeln("");

    if (!skipBoot) await new Promise((r) => setTimeout(r, 200));

    // Expanded detailed desert landscape - Massive Mojave vista with enhanced detail
    // Store landscape as lines for tumbleweed animation
    const landscapeLines = [
      // Sky layer with vultures circling
      "\x1b[1;31m                              v                                v              \x1b[0m",
      "\x1b[1;31m          v                                   v                         v     \x1b[0m",
      "\x1b[1;31m                   v                                       v                  \x1b[0m",
      "",
      // Distant mountain ranges (multiple layers for atmospheric depth)
      "\x1b[1;31m      ▲▲\x1b[0m                                                            \x1b[1;31m▲▲\x1b[0m",
      "\x1b[1;31m     ▲▲▲▲\x1b[0m                                                          \x1b[1;31m▲▲▲▲\x1b[0m",
      "\x1b[1;31m    ▲▲▲▲▲▲\x1b[0m        \x1b[1;31m▲▲\x1b[0m                                        \x1b[1;31m▲▲▲▲▲▲\x1b[0m",
      "\x1b[1;31m   ▲▲▲▲▲▲▲▲\x1b[0m      \x1b[1;31m▲▲▲▲\x1b[0m                                      \x1b[1;31m▲▲▲▲▲▲▲▲\x1b[0m",
      "\x1b[1;31m  ▲▲▲▲▲▲▲▲▲▲\x1b[0m    \x1b[1;31m▲▲▲▲▲▲\x1b[0m         \x1b[1;31m▲▲\x1b[0m                    \x1b[1;31m▲▲▲▲▲▲▲▲▲▲\x1b[0m",
      "\x1b[1;31m ▲▲▲▲▲▲▲▲▲▲▲▲\x1b[0m  \x1b[1;31m▲▲▲▲▲▲▲▲\x1b[0m       \x1b[1;31m▲▲▲▲\x1b[0m                  \x1b[1;31m▲▲▲▲▲▲▲▲▲▲▲▲\x1b[0m",
      "\x1b[1;31m▲▲▲▲▲▲▲▲▲▲▲▲▲▲\x1b[0m \x1b[1;31m▲▲▲▲▲▲▲▲▲▲\x1b[0m    \x1b[1;31m▲▲▲▲▲▲\x1b[0m              \x1b[1;31m▲▲▲▲▲▲▲▲▲▲▲▲▲▲\x1b[0m",
      "",
      // Mid-ground mesa formations
      "\x1b[1;31m          ╔═══╗\x1b[0m                                            \x1b[1;31m╔═══╗\x1b[0m",
      "\x1b[1;31m          ║███║\x1b[0m                                            \x1b[1;31m║███║\x1b[0m",
      "\x1b[1;31m          ╚═══╝\x1b[0m                                            \x1b[1;31m╚═══╝\x1b[0m",
      "",
      // Large detailed saguaro cacti
      "\x1b[1;31m      /|\\\x1b[0m                                             \x1b[1;31m  /|\\\x1b[0m",
      "\x1b[1;31m     / | \\\x1b[0m        \x1b[1;31m  ||\x1b[0m                               \x1b[1;31m / | \\\x1b[0m",
      "\x1b[1;31m    /  |  \\\x1b[0m       \x1b[1;31m  ||\x1b[0m                              \x1b[1;31m/  |  \\\x1b[0m         \x1b[1;31m/|\\\x1b[0m",
      "\x1b[1;31m   /   |   \\\x1b[0m      \x1b[1;31m /||\\\x1b[0m                             \x1b[1;31m   |   \\\x1b[0m       \x1b[1;31m/ | \\\x1b[0m",
      "\x1b[1;31m      |||  \x1b[0m       \x1b[1;31m/ || \\\x1b[0m                              \x1b[1;31m  |||  \x1b[0m      \x1b[1;31m/  |  \\\x1b[0m",
      "\x1b[1;31m      |||  \x1b[0m      \x1b[1;31m/  ||  \\\x1b[0m                               \x1b[1;31m |||  \x1b[0m       \x1b[1;31m  |||  \x1b[0m",
      "\x1b[1;31m      |||  \x1b[0m      \x1b[1;31m   ||   \x1b[0m   TUMBLEWEED                \x1b[1;31m |||  \x1b[0m       \x1b[1;31m  |||  \x1b[0m",
      "\x1b[1;31m      |||  \x1b[0m      \x1b[1;31m   ||   \x1b[0m                              \x1b[1;31m |||  \x1b[0m       \x1b[1;31m  |||  \x1b[0m",
      "\x1b[1;31m      |||  \x1b[0m      \x1b[1;31m   ||   \x1b[0m                              \x1b[1;31m |||  \x1b[0m       \x1b[1;31m  |||  \x1b[0m",
      // Ground debris, rocks, and desert scrub
      "\x1b[1;31m  •   |||  \x1b[0m  \x1b[1;31m o   ||   \x1b[0m  \x1b[1;31m°\x1b[0m              \x1b[1;31m∙\x1b[0m       \x1b[1;31m  •   |||  \x1b[0m   \x1b[1;31m°      |||  \x1b[0m\x1b[1;31m∙\x1b[0m",
      "\x1b[1;31m    ∙ |||  \x1b[0m\x1b[1;31m    ∙ ||   \x1b[0m \x1b[1;31m •\x1b[0m        \x1b[1;31m°\x1b[0m       \x1b[1;31m∙\x1b[0m     \x1b[1;31m    ∙  |||  \x1b[0m\x1b[1;31m •   ∙    |||  \x1b[0m",
      "\x1b[1;31m   °  |||  \x1b[0m  \x1b[1;31m°   ||   \x1b[0m      \x1b[1;31m∙\x1b[0m   \x1b[1;31m•\x1b[0m     \x1b[1;31m°\x1b[0m        \x1b[1;31m°      |||  \x1b[0m    \x1b[1;31m°   |||  \x1b[0m",
      // Sandy dunes with wind patterns
      "\x1b[1;31m      |||      ||                                   |||          |||  \x1b[0m",
      "\x1b[1;31m ∼∼   |||  ∼∼  ||   ∼∼∼         ∼∼         ∼∼∼     |||    ∼∼    |||  \x1b[0m",
      "\x1b[1;31m  ∼∼∼ ███ ∼∼ ∼ ██  ∼∼  ∼∼     ∼   ∼     ∼∼  ∼∼   ███  ∼∼  ∼  ███  \x1b[0m",
      "\x1b[1;31m______███______ ██ _________ __________ _________ ███ ________ ███__\x1b[0m",
    ];

    // 3. Enhanced Weather System - Multiple states
    const weatherConditions = [
      "clear",
      "dust_storm",
      "dust_devil",
      "heat_shimmer",
    ];
    const currentWeather =
      timeOfDay === "day"
        ? weatherConditions[
            Math.floor(Math.random() * weatherConditions.length)
          ]
        : weatherConditions[0]; // Clear at night/dawn/dusk

    // 4. Tumbleweed drift animation with enhanced weather
    const tumbleweedPositions = skipBoot ? [35] : [20, 25, 30, 35, 40, 45, 50];

    for (let frameIdx = 0; frameIdx < tumbleweedPositions.length; frameIdx++) {
      if (skipBoot && frameIdx > 0) break;
      const pos = tumbleweedPositions[frameIdx];

      // Clear and redraw landscape with tumbleweed
      term.write(`\x1b[${landscapeLines.length}A`); // Move cursor up to redraw

      for (let i = 0; i < landscapeLines.length; i++) {
        if (i === 23) {
          // Tumbleweed line (middle cactus line) with dynamic weather
          let line = landscapeLines[i].replace("TUMBLEWEED", " ".repeat(10));

          // Apply weather effects - positioned near tumbleweed
          let weatherEffect = "      ";
          if (currentWeather === "dust_storm") {
            weatherEffect = "\x1b[1;31m∼∼∼∼∼∼\x1b[0m";
          } else if (currentWeather === "dust_devil" && frameIdx === 3) {
            weatherEffect = "\x1b[1;31m  ∽∿∽  \x1b[0m";
          } else if (currentWeather === "heat_shimmer" && frameIdx % 2 === 0) {
            weatherEffect = "\x1b[1;31m ∼ ∼ ∼\x1b[0m";
          } else if (Math.random() > 0.7) {
            weatherEffect = "\x1b[1;31m.·˙˙·.\x1b[0m";
          }

          // Insert tumbleweed at position
          line =
            line.substring(0, pos) +
            "\x1b[1;30mO\x1b[0m" +
            line.substring(pos + 1);

          // Add weather effect slightly ahead of tumbleweed
          const weatherPos = pos + 8;
          if (weatherPos < line.length - 10) {
            line =
              line.substring(0, weatherPos) +
              weatherEffect +
              line.substring(weatherPos + 6);
          }

          term.writeln(line);
        } else {
          term.writeln(landscapeLines[i]);
        }
      }
      if (!skipBoot) await new Promise((r) => setTimeout(r, 150));
    }

    // Weather status message
    const weatherMessages = {
      clear: "\x1b[1;31m[Weather: Clear Skies]\x1b[0m",
      dust_storm: "\x1b[1;31m[Weather: Dust Storm Warning]\x1b[0m",
      dust_devil: "\x1b[1;31m[Weather: Dust Devil Detected]\x1b[0m",
      heat_shimmer: "\x1b[1;31m[Weather: Extreme Heat]\x1b[0m",
    };
    term.writeln(
      `                           ${weatherMessages[currentWeather]}`
    );
    term.writeln("");

    await new Promise((r) => setTimeout(r, 250));

    // Boot status messages
    term.writeln(
      "\x1b[1;31m[  OK  ]\x1b[0m Started Red Phoenix Terminal Interface"
    );
    await new Promise((r) => setTimeout(r, 100));
    term.writeln(
      "\x1b[1;31m[  OK  ]\x1b[0m Loaded Portfolio Data Repositories"
    );
    await new Promise((r) => setTimeout(r, 100));
    term.writeln(
      "\x1b[1;31m[  OK  ]\x1b[0m Initialized Security Command Parser"
    );
    await new Promise((r) => setTimeout(r, 100));
    term.writeln(
      "\x1b[1;31m[  OK  ]\x1b[0m Mounted Cybersecurity Research Database"
    );
    await new Promise((r) => setTimeout(r, 100));
    term.writeln(
      "\x1b[1;31m[  OK  ]\x1b[0m T.Limoges Authentication Protocol Active"
    );
    term.writeln("");

    await new Promise((r) => setTimeout(r, 200));

    // Welcome message with location info
    term.writeln(
      "\x1b[1;31m╔═══════════════════════════════════════════════════════════════════════════╗\x1b[0m"
    );
    term.writeln(
      "\x1b[1;31m║\x1b[0m                                                                           \x1b[1;31m║\x1b[0m"
    );
    term.writeln(
      "\x1b[1;31m║\x1b[0m  \x1b[1;31mSystem:\x1b[0m   T.Limoges Security Terminal           \x1b[1;31mBuild:\x1b[0m v8.4-2025  \x1b[1;31m║\x1b[0m"
    );
    term.writeln(
      "\x1b[1;31m║\x1b[0m  \x1b[1;31mOperator:\x1b[0m Tyler Limoges (TLimoges33)             \x1b[1;31mStatus:\x1b[0m ACTIVE   \x1b[1;31m║\x1b[0m"
    );
    term.writeln(
      "\x1b[1;31m║\x1b[0m  \x1b[1;31mRole:\x1b[0m     Ethical AI Red Teamer | OPSEC Specialist                  \x1b[1;31m║\x1b[0m"
    );
    term.writeln(
      "\x1b[1;31m║\x1b[0m                                                                           \x1b[1;31m║\x1b[0m"
    );
    term.writeln(
      '\x1b[1;31m║\x1b[0m  \x1b[1;31m"Security through knowledge. Excellence through practice."\x1b[0m            \x1b[1;31m║\x1b[0m'
    );
    term.writeln(
      "\x1b[1;31m║\x1b[0m                                                                           \x1b[1;31m║\x1b[0m"
    );
    term.writeln(
      "\x1b[1;31m╚═══════════════════════════════════════════════════════════════════════════╝\x1b[0m"
    );
    term.writeln("");

    await new Promise((r) => setTimeout(r, 300));

    await typeText(
      "\x1b[1;31m→\x1b[0m Type \x1b[1;31m'help'\x1b[0m to view available commands",
      10
    );
    term.writeln("");
    await typeText(
      "\x1b[1;31m→\x1b[0m Type \x1b[1;31m'about'\x1b[0m to learn about this system",
      10
    );
    term.writeln("");
    await typeText(
      "\x1b[1;31m→\x1b[0m Type \x1b[1;31m'banner'\x1b[0m for Wastelands ASCII art",
      10
    );
    term.writeln("\r\n");

    term.writeln(
      "\x1b[1;31m═══════════════════════════════════════════════════════════════════════════\x1b[0m\r\n"
    );
    term.write(PROMPT);
  };

  // Check if user has seen animation before
  const hasSeenAnimation = localStorage.getItem("welcomeAnimationShown");
  if (!hasSeenAnimation) {
    await animateWelcome();
    localStorage.setItem("welcomeAnimationShown", "true");
  } else {
    // Show static welcome for returning users - Portfolio branding
    term.writeln(
      "\x1b[1;31m═══════════════════════════════════════════════════════════════════════════\x1b[0m"
    );
    term.writeln("");
    term.writeln(
      "\x1b[1;31m            T LIMOGES PORTFOLIO\x1b[0m - \x1b[1;31mT.Limoges Security Terminal\x1b[0m"
    );
    term.writeln(
      "\x1b[1;31m               Welcome back. Systems operational.\x1b[0m"
    );
    term.writeln("");
    term.writeln(
      "\x1b[1;31m                 v            .------.\x1b[0m              \x1b[1;31m v\x1b[0m"
    );
    term.writeln("\x1b[1;31m                             /   SUN   \\\x1b[0m");
    term.writeln(
      "\x1b[1;31m           v                 \\       /\x1b[0m         \x1b[1;31m v\x1b[0m"
    );
    term.writeln("\x1b[1;31m                              '------'\x1b[0m");
    term.writeln("");
    term.writeln(
      "\x1b[1;31m       ▲▲▲\x1b[0m                                            \x1b[1;31m▲▲▲\x1b[0m"
    );
    term.writeln(
      "\x1b[1;31m      ▲▲▲▲▲\x1b[0m           \x1b[1;31m▲▲\x1b[0m                            \x1b[1;31m▲▲▲▲▲\x1b[0m"
    );
    term.writeln(
      "\x1b[1;31m     ▲▲▲▲▲▲▲\x1b[0m         \x1b[1;31m▲▲▲▲\x1b[0m                          \x1b[1;31m▲▲▲▲▲▲▲\x1b[0m"
    );
    term.writeln(
      "\x1b[1;31m    ▲▲▲▲▲▲▲▲▲\x1b[0m       \x1b[1;31m▲▲▲▲▲▲\x1b[0m                        \x1b[1;31m▲▲▲▲▲▲▲▲▲\x1b[0m"
    );
    term.writeln("");
    term.writeln(
      "\x1b[1;31m        ╔═══╗\x1b[0m                                        \x1b[1;31m╔═══╗\x1b[0m"
    );
    term.writeln(
      "\x1b[1;31m        ║███║\x1b[0m                                        \x1b[1;31m║███║\x1b[0m"
    );
    term.writeln(
      "\x1b[1;31m        ╚═══╝\x1b[0m                                        \x1b[1;31m╚═══╝\x1b[0m"
    );
    term.writeln("");
    term.writeln(
      "\x1b[1;31m     /|\\\x1b[0m              \x1b[1;31m||\x1b[0m                            \x1b[1;31m/|\\\x1b[0m"
    );
    term.writeln(
      "\x1b[1;31m    / | \\\x1b[0m             \x1b[1;31m||\x1b[0m                           \x1b[1;31m/ | \\\x1b[0m"
    );
    term.writeln(
      "\x1b[1;31m   /  |  \\\x1b[0m           \x1b[1;31m/||\\\x1b[0m                         \x1b[1;31m/  |  \\\x1b[0m"
    );
    term.writeln(
      "\x1b[1;31m     |||  \x1b[0m           \x1b[1;31m |||  \x1b[0m         \x1b[1;30mO\x1b[0m              \x1b[1;31m  |||  \x1b[0m"
    );
    term.writeln(
      "\x1b[1;31m  •  |||  \x1b[0m  \x1b[1;31m°\x1b[0m        \x1b[1;31m |||  \x1b[0m   \x1b[1;31m∙\x1b[0m             \x1b[1;31m∙\x1b[0m     \x1b[1;31m  |||  \x1b[0m \x1b[1;31m°\x1b[0m"
    );
    term.writeln(
      "\x1b[1;31m     |||      ∼∼   ███  ∼∼  ∼∼     ∼∼  ∼∼    ███   ∼∼\x1b[0m"
    );
    term.writeln(
      "\x1b[1;31m_____███_________ ███ __________ __________ ███ __________\x1b[0m"
    );
    term.writeln("");
    term.writeln(
      "         Type \x1b[1;31m'help'\x1b[0m for commands | \x1b[1;31m'about'\x1b[0m for system info\r\n"
    );
    term.writeln(
      "\x1b[1;31m═══════════════════════════════════════════════════════════════════════════\x1b[0m\r\n"
    );
    term.write(PROMPT);
  }

  const runCommand = async (cmd) => {
    term.writeln("");
    if (cmd.trim()) {
      // Check rate limit
      if (!rateLimiter.check()) {
        term.writeln("\x1b[1;31m!  Rate limit exceeded!\x1b[0m");
        term.writeln(
          `\x1b[1;31mPlease wait ${rateLimiter.getRemainingTime()} seconds before running more commands.\x1b[0m`
        );
        term.writeln(
          "\x1b[1;31mThis protection prevents command spam and ensures optimal performance.\x1b[0m\r\n"
        );
        currentInput = "";
        historyIndex = commandHistory.length;
        term.write(PROMPT);
        return;
      }

      if (commandHistory[commandHistory.length - 1] !== cmd) {
        commandHistory.push(cmd);
        saveHistory();
      }
      trackCommandUsage(cmd.split(" ")[0]); // Track base command
      await executeCommand(cmd);
    }
    currentInput = "";
    historyIndex = commandHistory.length;
    term.write(PROMPT);
  };

  // --- Core Command Execution Logic with Error Boundary ---
  const executeCommand = async (input) => {
    try {
      const parts = input.trim().split(" ");
      let commandName = parts[0];
      const args = parts.slice(1);

      // Check for alias
      if (aliases[commandName]) {
        const aliasedCommand = aliases[commandName];
        input = aliasedCommand + " " + args.join(" ");
        return executeCommand(input);
      }

      const privilegedCommands = ["opsec", "pwnboard", "threatmodel"];

      if (commandName === "sudo") {
        const actualCommand = args[0];
        if (privilegedCommands.includes(actualCommand)) {
          term.write("[sudo] password for Ty: ");
          // Simulate password input and success
          setTimeout(() => {
            term.writeln("*******");
            term.writeln("> Authentication successful.");
            executeCommand(args.join(" "));
          }, 500);
        } else if (actualCommand) {
          term.writeln(
            `sudo: ${actualCommand}: command not found or does not require sudo`
          );
        } else {
          term.writeln("usage: sudo <command>");
        }
        return;
      }

      if (privilegedCommands.includes(commandName)) {
        term.writeln(
          `\x1b[1;31mERROR: Permission denied. This command requires elevated privileges. Try 'sudo ${commandName}'\x1b[0m`
        );
        return;
      }

      const command = commands[commandName];

      if (command) {
        await commandExecutors[commandName](term, args);
        window.location.hash = commandName; // Update hash for linkability
      } else if (commandName) {
        term.writeln(`command not found: ${commandName}`);
      }
    } catch (error) {
      console.error(
        `[Portfolio] Command execution error for "${input}":`,
        error
      );
      term.writeln(
        `\r\n\x1b[1;31mX Error executing command: ${error.message}\x1b[0m`
      );
      term.writeln(
        "\x1b[1;31mThis error has been logged. Please try again or use 'help'.\x1b[0m"
      );

      // Track error in analytics if available
      if (window.gtag) {
        gtag("event", "exception", {
          description: `Command error: ${input} - ${error.message}`,
          fatal: false,
        });
      }
    }
  };

  // --- Input Handling (History, Autocomplete) ---
  term.onKey(({ key, domEvent }) => {
    // Handle paging mode
    if (isPaging) {
      if (key === "q" || key === "Q") {
        isPaging = false;
        pageContent = [];
        pageIndex = 0;
        term.writeln("\r\n");
        term.write(PROMPT);
      } else if (key === " " || key === "j" || domEvent.keyCode === 40) {
        pageIndex++;
        displayPage();
      } else if (key === "k" || domEvent.keyCode === 38) {
        if (pageIndex > 0) {
          pageIndex--;
          displayPage();
        }
      }
      return;
    }

    const printable =
      !domEvent.altKey && !domEvent.ctrlKey && !domEvent.metaKey;

    // Keyboard Shortcuts
    if (domEvent.ctrlKey && key === "l") {
      // Ctrl+L: Clear screen
      domEvent.preventDefault();
      term.clear();
      term.write(PROMPT + currentInput);
      return;
    } else if (domEvent.ctrlKey && key === "k") {
      // Ctrl+K: Command palette
      domEvent.preventDefault();
      term.writeln(
        "\r\n\x1b[1;31m╔════════════ COMMAND PALETTE ════════════╗\x1b[0m"
      );
      term.writeln(
        "\x1b[1;31m║ Quick Access to All Commands            ║\x1b[0m"
      );
      term.writeln(
        "\x1b[1;31m╚═════════════════════════════════════════╝\x1b[0m\r\n"
      );
      const cmdList = Object.keys(commands).sort();
      cmdList.forEach((cmd, idx) => {
        if (idx % 3 === 0 && idx > 0) term.writeln("");
        term.write(`  ${cmd.padEnd(15)}`);
        if ((idx + 1) % 3 === 0) term.writeln("");
      });
      term.writeln("\r\n\x1b[1;31mType any command name to execute it\x1b[0m");
      term.write(PROMPT + currentInput);
      return;
    } else if (domEvent.ctrlKey && key === "d") {
      // Ctrl+D: Logout effect
      domEvent.preventDefault();
      term.writeln("\r\n\x1b[1;31m> Logging out...\x1b[0m");
      setTimeout(() => {
        term.writeln("\x1b[1;31m+ Session saved\x1b[0m");
        term.writeln(
          "\x1b[1;31mThanks for visiting! Refresh to restart.\x1b[0m"
        );
      }, 500);
      return;
    } else if (domEvent.ctrlKey && key === "r") {
      // Ctrl+R: Reverse history search
      domEvent.preventDefault();
      term.write("\r\n\x1b[1;31m(reverse-i-search): \x1b[0m");
      // Simple implementation: show last 5 unique commands
      const recent = [...new Set(commandHistory)].slice(-5).reverse();
      term.writeln("");
      recent.forEach((cmd, idx) => {
        term.writeln(`  ${idx + 1}. ${cmd}`);
      });
      term.write(PROMPT + currentInput);
      return;
    }

    if (domEvent.keyCode === 13) {
      // Enter
      runCommand(currentInput);
    } else if (domEvent.keyCode === 8) {
      // Backspace
      if (currentInput.length > 0) {
        term.write("\b \b");
        currentInput = currentInput.slice(0, -1);
      }
    } else if (domEvent.keyCode === 9) {
      // Tab - Fuzzy autocomplete
      domEvent.preventDefault();

      if (!currentInput) return;

      const allCommands = Object.keys(commands);

      // First try exact prefix matches
      const exactMatches = allCommands.filter((c) =>
        c.startsWith(currentInput)
      );

      if (exactMatches.length === 1) {
        // Single exact match - complete it
        const completion = exactMatches[0].substring(currentInput.length);
        term.write(completion);
        currentInput = exactMatches[0];
      } else if (exactMatches.length > 1) {
        // Multiple exact matches - show them
        term.writeln("\r\n\x1b[1;31mMatching commands:\x1b[0m");
        exactMatches.forEach((cmd) => term.writeln(`  ${cmd}`));
        term.write(PROMPT + currentInput);
      } else {
        // No exact matches - try fuzzy matching
        const fuzzyMatches = allCommands
          .map((cmd) => {
            const input = currentInput.toLowerCase();
            const candidate = cmd.toLowerCase();

            // Calculate simple fuzzy score
            if (candidate.includes(input)) {
              return { cmd, score: 0.8 };
            }

            // Levenshtein-like scoring
            let score = 0;
            for (let i = 0; i < input.length; i++) {
              if (candidate.includes(input[i])) {
                score += 0.3 / input.length;
              }
            }

            return { cmd, score };
          })
          .filter((m) => m.score >= 0.5)
          .sort((a, b) => b.score - a.score)
          .slice(0, 5);

        if (fuzzyMatches.length === 1) {
          // Single fuzzy match - suggest it
          term.writeln(
            `\r\n\x1b[1;31mDid you mean: \x1b[1;31m${fuzzyMatches[0].cmd}\x1b[0m\x1b[1;31m? (Tab again to accept)\x1b[0m`
          );
          term.write(PROMPT + currentInput);

          // Store suggestion for next tab press
          if (
            !window._lastSuggestion ||
            window._lastSuggestion.input !== currentInput
          ) {
            window._lastSuggestion = {
              input: currentInput,
              cmd: fuzzyMatches[0].cmd,
            };
          } else {
            // Accept suggestion
            const completion = window._lastSuggestion.cmd.substring(
              currentInput.length
            );
            term.write(completion);
            currentInput = window._lastSuggestion.cmd;
            window._lastSuggestion = null;
          }
        } else if (fuzzyMatches.length > 1) {
          // Multiple fuzzy matches - show them
          term.writeln("\r\n\x1b[1;31mDid you mean:\x1b[0m");
          fuzzyMatches.forEach((m) =>
            term.writeln(
              `  \x1b[1;31m${m.cmd}\x1b[0m \x1b[1;31m(score: ${(
                m.score * 100
              ).toFixed(0)}%)\x1b[0m`
            )
          );
          term.write(PROMPT + currentInput);
        } else {
          // No matches at all
          term.writeln("\r\n\x1b[1;31mNo matching commands\x1b[0m");
          term.write(PROMPT + currentInput);
        }
      }
    } else if (domEvent.keyCode === 38) {
      // ArrowUp
      domEvent.preventDefault();
      if (historyIndex > 0) {
        historyIndex--;
        term.write("\x1b[2K\r" + PROMPT + commandHistory[historyIndex]);
        currentInput = commandHistory[historyIndex];
      }
    } else if (domEvent.keyCode === 40) {
      // ArrowDown
      domEvent.preventDefault();
      if (historyIndex < commandHistory.length - 1) {
        historyIndex++;
        term.write("\x1b[2K\r" + PROMPT + commandHistory[historyIndex]);
        currentInput = commandHistory[historyIndex];
      } else {
        historyIndex = commandHistory.length;
        term.write("\x1b[2K\r" + PROMPT);
        currentInput = "";
      }
    } else if (key === "?" && currentInput === "") {
      // '?' shortcut - show keyboard shortcuts
      term.write("?");
      currentInput = "shortcuts";
      setTimeout(() => runCommand("shortcuts"), 0);
    } else if (printable) {
      term.write(key);
      currentInput += key;
    }
  });

  // --- Command Executor Functions ---
  const displayPage = () => {
    term.clear();
    const linesPerPage = term.rows - 2;
    const start = pageIndex * linesPerPage;
    const end = start + linesPerPage;
    const page = pageContent.slice(start, end);

    page.forEach((line) => term.writeln(line));

    if (end < pageContent.length) {
      term.write(
        "\r\n\x1b[7m-- MORE -- (space/j: next, k: prev, q: quit)\x1b[0m"
      );
    } else {
      term.write("\r\n\x1b[7m-- END -- (q: quit)\x1b[0m");
    }
  };

  const commandExecutors = {
    alias: (term, args) => {
      if (args.length === 0) {
        term.writeln("Current aliases:\r\n");
        Object.entries(aliases).forEach(([name, cmd]) => {
          term.writeln(`  ${name}='${cmd}'`);
        });
        return;
      }
      const aliasStr = args.join(" ");
      const match = aliasStr.match(/^(\w+)=(.+)$/);
      if (match) {
        aliases[match[1]] = match[2];
        localStorage.setItem("terminalAliases", JSON.stringify(aliases));
        term.writeln(`Alias set: ${match[1]}='${match[2]}'`);
      } else {
        term.writeln("Usage: alias name=command");
      }
    },
    theme: (term, args) => {
      const presets = {
        default: {
          background: "#101010",
          foreground: "#F0F0F0",
          cursor: "#39FF14",
          name: "Default",
          description: "Classic green terminal",
        },
        matrix: {
          background: "#000000",
          foreground: "#00FF00",
          cursor: "#00FF00",
          name: "Matrix",
          description: "Enter the Matrix",
        },
        cyberpunk: {
          background: "#0a0e27",
          foreground: "#00ffff",
          cursor: "#ff00ff",
          name: "Cyberpunk",
          description: "Neon city vibes",
        },
        hacker: {
          background: "#0d0208",
          foreground: "#00ff41",
          cursor: "#ff006e",
          name: "Hacker",
          description: "Elite hacker aesthetic",
        },
        nord: {
          background: "#2e3440",
          foreground: "#d8dee9",
          cursor: "#88c0d0",
          name: "Nord",
          description: "Cool Nordic palette",
        },
        dracula: {
          background: "#282a36",
          foreground: "#f8f8f2",
          cursor: "#ff79c6",
          name: "Dracula",
          description: "Popular dark theme",
        },
        monokai: {
          background: "#272822",
          foreground: "#f8f8f2",
          cursor: "#f92672",
          name: "Monokai",
          description: "Classic code editor theme",
        },
        minimal: {
          background: "#ffffff",
          foreground: "#333333",
          cursor: "#0066cc",
          name: "Minimal",
          description: "Clean light theme",
        },
      };

      if (args.length === 0 || args[0] === "list") {
        term.writeln("\x1b[1;31m\n AVAILABLE THEMES\x1b[0m\r\n");
        Object.entries(presets).forEach(([key, theme]) => {
          const isCurrent =
            customTheme &&
            customTheme.background === theme.background &&
            customTheme.foreground === theme.foreground;
          const marker = isCurrent ? "\x1b[1;31m+\x1b[0m" : " ";
          term.writeln(
            `  ${marker} \x1b[1;31m${key.padEnd(12)}\x1b[0m - ${
              theme.description
            }`
          );
        });
        term.writeln("\r\n\x1b[1;31mUsage: theme <name>          Change theme");
        term.writeln("       theme list            Show all themes");
        term.writeln(
          "       theme reset           Reset to default\x1b[0m\r\n"
        );
        return;
      }

      if (args[0] === "reset") {
        const defaultTheme = presets.default;
        Object.assign(term.options.theme, defaultTheme);
        customTheme = defaultTheme;
        localStorage.setItem("customTheme", JSON.stringify(customTheme));
        term.writeln("\x1b[1;31m+ Theme reset to default\x1b[0m\r\n");
        return;
      }

      if (presets[args[0]]) {
        const selectedTheme = presets[args[0]];
        Object.assign(term.options.theme, {
          background: selectedTheme.background,
          foreground: selectedTheme.foreground,
          cursor: selectedTheme.cursor,
        });
        customTheme = selectedTheme;
        localStorage.setItem("customTheme", JSON.stringify(customTheme));
        term.writeln(
          `\x1b[1;31m+ Theme changed to: ${selectedTheme.name}\x1b[0m`
        );
        term.writeln(`\x1b[1;31m  ${selectedTheme.description}\x1b[0m\r\n`);
      } else {
        term.writeln(`\x1b[1;31mX Theme '${args[0]}' not found\x1b[0m`);
        term.writeln(
          "\x1b[1;31mType 'theme list' to see available themes\x1b[0m\r\n"
        );
      }
    },
    apt: (term, args) => {
      const availablePackages = [
        "nmap",
        "wireshark",
        "metasploit",
        "burpsuite",
        "ghidra",
      ];

      if (args[0] === "install" && args[1]) {
        const pkg = args[1];
        if (availablePackages.includes(pkg)) {
          if (installedPackages.includes(pkg)) {
            term.writeln(`${pkg} is already installed`);
          } else {
            installedPackages.push(pkg);
            localStorage.setItem(
              "installedPackages",
              JSON.stringify(installedPackages)
            );
            term.writeln(`Installing ${pkg}...`);
            term.writeln(`${pkg} installed successfully`);
          }
        } else {
          term.writeln(`Package ${pkg} not found`);
        }
      } else if (args[0] === "remove" && args[1]) {
        const pkg = args[1];
        const index = installedPackages.indexOf(pkg);
        if (index > -1) {
          installedPackages.splice(index, 1);
          localStorage.setItem(
            "installedPackages",
            JSON.stringify(installedPackages)
          );
          term.writeln(`${pkg} removed successfully`);
        } else {
          term.writeln(`${pkg} is not installed`);
        }
      } else if (args[0] === "list") {
        term.writeln("Installed packages:\r\n");
        installedPackages.forEach((pkg) => term.writeln(`  - ${pkg}`));
      } else {
        term.writeln("Usage: apt [install|remove|list] <package>");
      }
    },
    man: (term, args) => {
      const manPages = {
        nmap: [
          "NAME",
          "    nmap - Network exploration tool and security scanner",
          "",
          "SYNOPSIS",
          "    nmap [Scan Type...] [Options] {target specification}",
          "",
          "DESCRIPTION",
          '    Nmap ("Network Mapper") is an open source tool for network exploration',
          "    and security auditing. It was designed to rapidly scan large networks,",
          "    although it works fine against single hosts.",
          "",
          "COMMON SCAN TYPES",
          "    -sS    TCP SYN scan (default, requires root)",
          "    -sT    TCP connect scan",
          "    -sU    UDP scan",
          "    -sV    Version detection",
          "    -O     OS detection",
          "",
          "OPTIONS",
          "    -p <port ranges>    Scan specified ports",
          "    -A                   Enable OS detection, version, script, traceroute",
          "    -v                   Increase verbosity level",
          "",
          "EXAMPLES",
          "    nmap -sS 192.168.1.1",
          "    nmap -A -T4 scanme.nmap.org",
          "",
        ],
      };

      if (args.length === 0 || !manPages[args[0]]) {
        term.writeln("Usage: man <command>");
        term.writeln("Available: " + Object.keys(manPages).join(", "));
        return;
      }

      pageContent = manPages[args[0]];
      pageIndex = 0;
      isPaging = true;
      displayPage();
    },
    help: (term, args) => {
      term.writeln("Available Commands:\r\n");
      Object.entries(commands).forEach(([name, details]) => {
        if (details.description) {
          term.writeln(
            `  \x1b[1;31m${name.padEnd(14, " ")}\x1b[0m - ${
              details.description
            }`
          );
        }
      });
      term.writeln(
        "\r\n\x1b[1;31mTip: Type 'tutorial' for guide | 'about' for v8.0 info\x1b[0m"
      );
    },
    about: (term, args) => {
      term.writeln(
        "\x1b[1;31m\n╔═══════════════════════════════════════════════╗\x1b[0m"
      );
      term.writeln(
        "\x1b[1;31m║    SYN_OS v8.0 - RED PHOENIX PROTOCOL        ║\x1b[0m"
      );
      term.writeln(
        "\x1b[1;31m╚═══════════════════════════════════════════════╝\x1b[0m\r\n"
      );

      term.writeln("\x1b[1;31m BRAND EVOLUTION\x1b[0m");
      term.writeln(
        "\x1b[1;31m  Blue Era (v1-7)      →  Red Phoenix (v8+)\x1b[0m"
      );
      term.writeln(
        "\x1b[1;31m  🔵 Calm academic      →  🔴 Aggressive professional\x1b[0m"
      );
      term.writeln(
        "\x1b[1;31m  Educational OS       →  MSSP warfare platform\x1b[0m"
      );
      term.writeln(
        "\x1b[1;31m  Defensive blue team  →  Offensive red team\x1b[0m"
      );
      term.writeln(
        "\x1b[1;31m  'Learn security'     →  'Dominate threats'\x1b[0m\r\n"
      );

      term.writeln("\x1b[1;31m DESIGN LANGUAGE\x1b[0m");
      term.writeln(
        "  \x1b[1;31m■\x1b[0m Pure Red (#FF0000)    - Aggression, focus, power"
      );
      term.writeln(
        "  \x1b[1;30m■\x1b[0m Pure Black (#000000)  - Void, precision, stealth"
      );
      term.writeln(
        "  \x1b[31m■\x1b[0m Ember Glow (#FF3333)  - Energy, circuits, life"
      );
      term.writeln(
        "  \x1b[31m■\x1b[0m Blood Red (#CC0000)   - Depth, shadows, power\r\n"
      );

      term.writeln("\x1b[1;31m DESIGN PRINCIPLES\x1b[0m");
      term.writeln("  • Angular geometry (no soft curves)");
      term.writeln("  • High contrast (legibility in low light)");
      term.writeln("  • Glowing effects (ember, circuit glow)");
      term.writeln("  • 3D depth (shadows, layers)");
      term.writeln("  • Root shell aesthetic ([Ty@SynOS ~]#)\r\n");

      term.writeln("\x1b[1;31m POSITIONING\x1b[0m");
      term.writeln(
        '\x1b[1;31m  "Enterprise MSSP platform with red team branding.\x1b[0m'
      );
      term.writeln(
        "\x1b[1;31m   Optimized for SOC operations, penetration testing,\x1b[0m"
      );
      term.writeln(
        '\x1b[1;31m   and threat hunting. Not educational - operational."\x1b[0m\r\n'
      );

      term.writeln("\x1b[1;31m UNIQUE DIFFERENTIATORS\x1b[0m");
      term.writeln("  vs Kali Linux:    Pure red/black (no blue accents)");
      term.writeln("  vs ParrotOS:      Monochrome focus (no rainbow)");
      term.writeln("  vs BlackArch:     Professional MSSP branding");
      term.writeln(
        "  vs All:           Phoenix mythology (rebirth/recovery)\r\n"
      );

      term.writeln("\x1b[1;31m TYPOGRAPHY\x1b[0m");
      term.writeln("  Primary: IBM Plex Mono   - Terminal perfection");
      term.writeln("  Headers: Rajdhani        - Angular, military feel\r\n");

      term.writeln(
        "\x1b[1;31mThis isn't just a theme - it's a philosophical shift.\x1b[0m"
      );
      term.writeln(
        "\x1b[1;31mYou're not learning security. You're operating a weapon system.\x1b[0m\r\n"
      );

      term.writeln(
        "\x1b[1;31mType 'theme classic' to revert to legacy green theme\x1b[0m\r\n"
      );
    },
    security: (term, args) => {
      term.writeln("\x1b[1;31m\n🔒 SECURITY IMPLEMENTATION REPORT\x1b[0m\r\n");
      term.writeln("This portfolio implements enterprise-grade security:\r\n");

      term.writeln("\x1b[1;31m1. Content Security Policy (CSP)\x1b[0m");
      term.writeln("   \x1b[1;31m├─\x1b[0m No unsafe-inline directives");
      term.writeln(
        "   \x1b[1;31m├─\x1b[0m Strict script-src and style-src policies"
      );
      term.writeln(
        "   \x1b[1;31m├─\x1b[0m XSS protection: \x1b[1;31mENABLED ✅\x1b[0m"
      );
      term.writeln("   \x1b[1;31m└─\x1b[0m Self-healing error boundaries\r\n");

      term.writeln("\x1b[1;31m2. Subresource Integrity (SRI)\x1b[0m");
      term.writeln(
        "   \x1b[1;31m├─\x1b[0m SHA-384 hashes on all CDN resources"
      );
      term.writeln("   \x1b[1;31m├─\x1b[0m xterm.js: Integrity verified");
      term.writeln(
        "   \x1b[1;31m├─\x1b[0m xterm-addon-fit: Integrity verified"
      );
      term.writeln(
        "   \x1b[1;31m└─\x1b[0m Supply chain attack prevention: \x1b[1;31mACTIVE ✅\x1b[0m\r\n"
      );

      term.writeln("\x1b[1;31m3. Input Validation & Sanitization\x1b[0m");
      term.writeln("   \x1b[1;31m├─\x1b[0m 2000 character command limit");
      term.writeln("   \x1b[1;31m├─\x1b[0m Character whitelist enforcement");
      term.writeln("   \x1b[1;31m├─\x1b[0m Command injection prevention");
      term.writeln(
        "   \x1b[1;31m└─\x1b[0m Injection attacks: \x1b[1;31mBLOCKED ✅\x1b[0m\r\n"
      );

      term.writeln("\x1b[1;31m4. Data Protection\x1b[0m");
      term.writeln("   \x1b[1;31m├─\x1b[0m Type-validated localStorage");
      term.writeln("   \x1b[1;31m├─\x1b[0m Data poisoning prevention");
      term.writeln("   \x1b[1;31m├─\x1b[0m Session isolation per domain");
      term.writeln(
        "   \x1b[1;31m└─\x1b[0m CORS protection: \x1b[1;31mENFORCED ✅\x1b[0m\r\n"
      );

      term.writeln("\x1b[1;31m5. Progressive Web App Security\x1b[0m");
      term.writeln("   \x1b[1;31m├─\x1b[0m HTTPS-only service worker");
      term.writeln("   \x1b[1;31m├─\x1b[0m Cache poisoning prevention");
      term.writeln("   \x1b[1;31m├─\x1b[0m Offline-first architecture");
      term.writeln(
        "   \x1b[1;31m└─\x1b[0m Manifest integrity: \x1b[1;31mVERIFIED ✅\x1b[0m\r\n"
      );

      term.writeln("\x1b[1;31m6. Testing & Validation\x1b[0m");
      term.writeln("   \x1b[1;31m├─\x1b[0m 146 automated tests passing");
      term.writeln("   \x1b[1;31m├─\x1b[0m Security test suite: 100% coverage");
      term.writeln(
        "   \x1b[1;31m├─\x1b[0m XSS vulnerability tests: All passing"
      );
      term.writeln(
        "   \x1b[1;31m└─\x1b[0m Command injection tests: All passing\r\n"
      );

      term.writeln("\x1b[1;31m SECURITY SCORE: 9.5/10 🛡️\x1b[0m");
      term.writeln("\x1b[1;31m+ Production-ready security posture\x1b[0m");
      term.writeln(
        "\x1b[1;31m\nRun 'npm test' to see security tests in action\x1b[0m\r\n"
      );
    },
    shortcuts: (term, args) => {
      term.writeln(
        "\x1b[1;31m\n⌨️  KEYBOARD SHORTCUTS & NAVIGATION\x1b[0m\r\n"
      );

      term.writeln("\x1b[1;31m Command History\x1b[0m");
      term.writeln(
        "   \x1b[1;31m↑\x1b[0m         Navigate to previous command"
      );
      term.writeln("   \x1b[1;31m↓\x1b[0m         Navigate to next command");
      term.writeln(
        "   \x1b[1;31mCtrl+R\x1b[0m    Reverse search through history\r\n"
      );

      term.writeln("\x1b[1;31m Auto-completion\x1b[0m");
      term.writeln(
        "   \x1b[1;31mTab\x1b[0m       Autocomplete commands (fuzzy matching)"
      );
      term.writeln(
        "   \x1b[1;31m            Try typing 'proj' then Tab\x1b[0m\r\n"
      );

      term.writeln("\x1b[1;31m Terminal Control\x1b[0m");
      term.writeln("   \x1b[1;31mCtrl+L\x1b[0m    Clear terminal screen");
      term.writeln("   \x1b[1;31mCtrl+C\x1b[0m    Cancel current input");
      term.writeln(
        "   \x1b[1;31mCtrl+K\x1b[0m    Clear from cursor to end of line"
      );
      term.writeln(
        "   \x1b[1;31mCtrl+U\x1b[0m    Clear entire current line\r\n"
      );

      term.writeln("\x1b[1;31m Quick Commands\x1b[0m");
      term.writeln("   \x1b[1;31mhelp\x1b[0m      Show all available commands");
      term.writeln("   \x1b[1;31mclear\x1b[0m     Clear the screen");
      term.writeln(
        "   \x1b[1;31mtutorial\x1b[0m  Interactive guide for new users"
      );
      term.writeln(
        "   \x1b[1;31msecurity\x1b[0m  View security implementation\r\n"
      );

      term.writeln("\x1b[1;31m Pro Tips\x1b[0m");
      term.writeln("   • Commands persist across sessions");
      term.writeln("   • Use 'alias' to create custom shortcuts");
      term.writeln("   • Press Tab after typing a few letters");
      term.writeln("   • History is saved (last 50 commands)");
      term.writeln("   • Portfolio works offline (PWA)\r\n");

      term.writeln(
        "\x1b[1;31mTip: Type '?' at any time to see this again\x1b[0m\r\n"
      );
    },
    banner: (term, args) => {
      term.writeln("\x1b[1;31m");
      term.writeln("  ████████╗██╗   ██╗██╗     ███████╗██████╗ ");
      term.writeln("  ╚══██╔══╝╚██╗ ██╔╝██║     ██╔════╝██╔══██╗");
      term.writeln("     ██║    ╚████╔╝ ██║     █████╗  ██████╔╝");
      term.writeln("     ██║     ╚██╔╝  ██║     ██╔══╝  ██╔══██╗");
      term.writeln("     ██║      ██║   ███████╗███████╗██║  ██║");
      term.writeln("     ╚═╝      ╚═╝   ╚══════╝╚══════╝╚═╝  ╚═╝");
      term.writeln("");
      term.writeln(
        "  ██╗     ██╗███╗   ███╗ ██████╗  ██████╗ ███████╗███████╗"
      );
      term.writeln(
        "  ██║     ██║████╗ ████║██╔═══██╗██╔════╝ ██╔════╝██╔════╝"
      );
      term.writeln(
        "  ██║     ██║██╔████╔██║██║   ██║██║  ███╗█████╗  ███████╗"
      );
      term.writeln(
        "  ██║     ██║██║╚██╔╝██║██║   ██║██║   ██║██╔══╝  ╚════██║"
      );
      term.writeln(
        "  ███████╗██║██║ ╚═╝ ██║╚██████╔╝╚██████╔╝███████╗███████║"
      );
      term.writeln(
        "  ╚══════╝╚═╝╚═╝     ╚═╝ ╚═════╝  ╚═════╝ ╚══════╝╚══════╝"
      );
      term.writeln("\x1b[0m");
      term.writeln(
        "\x1b[1;31m              Cybersecurity Professional-in-Training\x1b[0m"
      );
      term.writeln(
        "\x1b[1;31m              Systems Programmer | Red Team Aspirant\x1b[0m"
      );
      term.writeln(
        "\x1b[1;31m              Building Syn_OS | 452,000+ Lines of Code\x1b[0m\r\n"
      );
      term.writeln(
        "\x1b[1;31m  Type 'help' to explore | 'tutorial' for guidance\x1b[0m\r\n"
      );
    },
    stats: (term, args) => {
      const sessionTime = Math.floor((Date.now() - sessionStartTime) / 1000);
      const totalCommands = Object.values(commandUsageStats).reduce(
        (a, b) => a + b,
        0
      );
      const topCommands = Object.entries(commandUsageStats)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      term.writeln("\x1b[1;31m\n PORTFOLIO STATISTICS\x1b[0m\r\n");

      term.writeln("\x1b[1;31m Session Info\x1b[0m");
      term.writeln(
        `   \x1b[1;31m├─\x1b[0m Total visits: \x1b[1;31m${visitCount}\x1b[0m`
      );
      term.writeln(
        `   \x1b[1;31m├─\x1b[0m Commands this session: \x1b[1;31m${
          Object.keys(commandUsageStats).length
        }\x1b[0m`
      );
      term.writeln(
        `   \x1b[1;31m├─\x1b[0m Session time: \x1b[1;31m${Math.floor(
          sessionTime / 60
        )}m ${sessionTime % 60}s\x1b[0m`
      );
      term.writeln(
        `   \x1b[1;31m└─\x1b[0m History size: \x1b[1;31m${commandHistory.length} commands\x1b[0m\r\n`
      );

      term.writeln("\x1b[1;31m Most Used Commands\x1b[0m");
      if (topCommands.length > 0) {
        topCommands.forEach(([cmd, count], idx) => {
          const bar = "█".repeat(Math.min(count, 20));
          const prefix = idx === topCommands.length - 1 ? "└─" : "├─";
          term.writeln(
            `   \x1b[1;31m${prefix}\x1b[0m \x1b[1;31m${cmd.padEnd(
              12
            )}\x1b[0m \x1b[1;31m${bar}\x1b[0m \x1b[1;31m(${count}x)\x1b[0m`
          );
        });
      } else {
        term.writeln("   \x1b[1;31m└─\x1b[0m No commands tracked yet");
      }
      term.writeln("");

      term.writeln("\x1b[1;31m Storage Usage\x1b[0m");
      const historySize = JSON.stringify(commandHistory).length;
      const aliasSize = JSON.stringify(aliases).length;
      const statsSize = JSON.stringify(commandUsageStats).length;
      const totalSize = historySize + aliasSize + statsSize;
      term.writeln(
        `   \x1b[1;31m├─\x1b[0m Command history: \x1b[1;31m${(
          historySize / 1024
        ).toFixed(2)} KB\x1b[0m`
      );
      term.writeln(
        `   \x1b[1;31m├─\x1b[0m Aliases: \x1b[1;31m${(aliasSize / 1024).toFixed(
          2
        )} KB\x1b[0m`
      );
      term.writeln(
        `   \x1b[1;31m├─\x1b[0m Statistics: \x1b[1;31m${(
          statsSize / 1024
        ).toFixed(2)} KB\x1b[0m`
      );
      term.writeln(
        `   \x1b[1;31m└─\x1b[0m Total: \x1b[1;31m${(totalSize / 1024).toFixed(
          2
        )} KB\x1b[0m\r\n`
      );

      term.writeln("\x1b[1;31m Performance\x1b[0m");
      term.writeln(
        `   \x1b[1;31m├─\x1b[0m Commands available: \x1b[1;31m${
          Object.keys(commands).length
        }\x1b[0m`
      );
      term.writeln(
        `   \x1b[1;31m├─\x1b[0m Aliases configured: \x1b[1;31m${
          Object.keys(aliases).length
        }\x1b[0m`
      );
      term.writeln(
        `   \x1b[1;31m├─\x1b[0m PWA enabled: \x1b[1;31m+ Yes\x1b[0m`
      );
      term.writeln(
        `   \x1b[1;31m└─\x1b[0m Offline ready: \x1b[1;31m+ Yes\x1b[0m\r\n`
      );

      term.writeln(
        "\x1b[1;31mTip: Use 'clear' to reset the terminal or 'export' to save session\x1b[0m\r\n"
      );
    },
    tutorial: (term, args) => {
      term.writeln(
        "\x1b[1;31m╔═════════════════════════════════════════════╗\x1b[0m"
      );
      term.writeln(
        "\x1b[1;31m║   🎓 WELCOME TO TERMINAL PORTFOLIO! 🎓     ║\x1b[0m"
      );
      term.writeln(
        "\x1b[1;31m║        Interactive Tutorial                 ║\x1b[0m"
      );
      term.writeln(
        "\x1b[1;31m╚═════════════════════════════════════════════╝\x1b[0m\r\n"
      );

      term.writeln("\x1b[1;31mStep 1: Navigation Basics\x1b[0m");
      term.writeln("  • Type commands and press \x1b[1;31mEnter\x1b[0m");
      term.writeln(
        "  • Press \x1b[1;31m↑/↓\x1b[0m arrows to navigate command history"
      );
      term.writeln("  • Press \x1b[1;31mTab\x1b[0m to autocomplete commands");
      term.writeln("  • Try it: Type 'who' and press Tab\r\n");

      term.writeln("\x1b[1;31mStep 2: Essential Commands\x1b[0m");
      term.writeln(
        "  \x1b[1;31mwhoami\x1b[0m      - Learn about Tyler Limoges"
      );
      term.writeln("  \x1b[1;31mprojects\x1b[0m    - View technical projects");
      term.writeln("  \x1b[1;31mexperience\x1b[0m  - Professional background");
      term.writeln("  \x1b[1;31meducation\x1b[0m   - Academic credentials");
      term.writeln(
        "  \x1b[1;31mclear\x1b[0m       - Clear the terminal screen\r\n"
      );

      term.writeln("\x1b[1;31mStep 3: Cybersecurity Content\x1b[0m");
      term.writeln(
        "  \x1b[1;31msynos\x1b[0m       - 18k+ line OS project deep-dive"
      );
      term.writeln("  \x1b[1;31mcerts\x1b[0m       - Certification roadmap");
      term.writeln("  \x1b[1;31mblog\x1b[0m        - Published research");
      term.writeln(
        "  \x1b[1;31mpursuits\x1b[0m    - CTF profiles (HTB, THM)\r\n"
      );

      term.writeln("\x1b[1;31mStep 4: Keyboard Shortcuts\x1b[0m");
      term.writeln(
        "  \x1b[1;31mCtrl+L\x1b[0m      - Clear screen (like 'clear')"
      );
      term.writeln("  \x1b[1;31mCtrl+K\x1b[0m      - Open command palette");
      term.writeln("  \x1b[1;31mCtrl+R\x1b[0m      - Reverse history search");
      term.writeln("  \x1b[1;31mCtrl+D\x1b[0m      - Logout simulation\r\n");

      term.writeln("\x1b[1;31mStep 5: Advanced Features\x1b[0m");
      term.writeln("  \x1b[1;31madvisor\x1b[0m     - AI career guidance");
      term.writeln("  \x1b[1;31mstats\x1b[0m       - Your portfolio analytics");
      term.writeln(
        "  \x1b[1;31mexport\x1b[0m      - Download session transcript"
      );
      term.writeln("  \x1b[1;31mtheme\x1b[0m       - Change color scheme\r\n");

      term.writeln("\x1b[1;31mStep 6: Easter Eggs \x1b[0m");
      term.writeln("  Try these fun commands:");
      term.writeln("  \x1b[1;31m• coffee, hack, konami, snake\x1b[0m\r\n");

      term.writeln("\x1b[1;31mPro Tips:\x1b[0m");
      term.writeln("  • Commands persist across sessions (localStorage)");
      term.writeln("  • Use 'man <command>' for detailed documentation");
      term.writeln("  • Create aliases: 'alias ll=help'");
      term.writeln("  • This works offline (Progressive Web App)\r\n");

      term.writeln(
        "\x1b[1;31m+ Tutorial Complete!\x1b[0m Try 'whoami' to get started.\r\n"
      );

      // Track tutorial completion
      localStorage.setItem("tutorialCompleted", "true");
      if (window.gtag) {
        gtag("event", "tutorial_completed", {
          event_category: "engagement",
          event_label: "first_time_tutorial",
        });
      }
    },
    whoami: (term, args) => {
      term.writeln("> Executing ./get-bio.sh...\r\n");
      term.writeln("Hello, I'm \x1b[1;31mTy Limoges\x1b[0m (T.Limoges).\r\n");
      term.writeln(
        "I am a cybersecurity professional-in-training with a proven background in high-stakes incident response and critical infrastructure management. My current focus is \x1b[1;31mSyn_OS\x1b[0m, an experimental security-focused Linux distribution where I'm developing custom kernel schedulers and security automation at the systems level.\r\n"
      );
      term.writeln(
        "My 5+ years in Level 1 Trauma Centers taught me to troubleshoot, maintain, and ensure the operational integrity of life-support systems under extreme pressure—a skill set I am now applying to the digital domain. My goal is to leverage kernel-level systems programming and security research to excel in Red Teaming and offensive security operations.\r\n"
      );
      term.writeln(
        "This portfolio showcases my technical work at the intersection of systems programming, security, and infrastructure.\r\n"
      );
      term.writeln(
        "> LinkedIn: \x1b[4mhttps://linkedin.com/in/tylerlimoges\x1b[0m"
      );
      term.writeln(
        "> GitHub:   \x1b[4mhttps://github.com/TLimoges33\x1b[0m\r\n"
      );
    },
    experience: (term, args) => {
      term.writeln("> cat /var/log/professional_history.log\r\n");
      term.writeln(
        "\x1b[1;31m// UMass Memorial Medical Center: Anesthesia Technician II (SysAdmin for Critical Infrastructure)\x1b[0m"
      );
      term.writeln("\x1b[1;31m// 04/2022 – Present\x1b[0m");
      term.writeln(
        "- \x1b[1;31mINFRASTRUCTURE INTEGRITY:\x1b[0m Ensured 100% uptime of critical life-support (Avance CS2) and pharmaceutical dispensing (Pyxis) systems through rigorous inspection, troubleshooting, and real-time diagnostics."
      );
      term.writeln(
        "- \x1b[1;31mLEADERSHIP:\x1b[0m Trained and supervised a team of 13 technicians on operational security protocols for medical technology in a Level 1 Trauma Center."
      );
      term.writeln(
        "- \x1b[1;31mCOMPLIANCE & DATA HANDLING:\x1b[0m Managed Protected Health Information (PHI) within EPIC EMR, enforcing strict HIPAA controls during high-stress incident response scenarios.\r\n"
      );
      term.writeln(
        "\x1b[1;31m// St. Vincent Hospital: Critical Care Technician (Incident Responder)\x1b[0m"
      );
      term.writeln("\x1b[1;31m// 01/2021 – 04/2022\x1b[0m");
      term.writeln(
        "- \x1b[1;31mINCIDENT RESPONSE:\x1b[0m Executed high-priority IR protocols in a dynamic Level 3 Trauma Center, providing critical support and stabilization for high-acuity patients."
      );
      term.writeln(
        "- \x1b[1;31mSYSTEM OPERATIONS:\x1b[0m Operated and maintained diverse point-of-care diagnostic devices, ensuring data accuracy and availability for critical decision-making."
      );
    },
    education: (term, args) => {
      term.writeln("> grep -i 'Credentials' /var/log/qualifications.log\r\n");
      term.writeln("\x1b[1;31m//--- ACADEMIC ---//\x1b[0m");
      term.writeln(
        "- \x1b[1;31mBachelor of Science, Cybersecurity\x1b[0m | Southern New Hampshire University"
      );
      term.writeln("  - Expected Graduation: October 2027");
      term.writeln(
        "  - Status: \x1b[1;31m3.9 GPA, Honor Roll (Last 3 Terms)\x1b[0m\r\n"
      );
      term.writeln(
        "- \x1b[1;31mCS50x: Introduction to Computer Science\x1b[0m | Harvard University (edX)"
      );
      term.writeln(
        "  - Coursework: C, Python, SQL, Memory Management, Data Structures, Algorithms.\r\n"
      );
      term.writeln("\x1b[1;31m//--- CERTIFICATIONS (IN PROGRESS) ---//\x1b[0m");
      term.writeln(
        "- \x1b[1;31m[ACTIVE]\x1b[0m CompTIA Network+ & Security+ (Target: Fall 2025)"
      );
      term.writeln(
        "- \x1b[1;31m[ACTIVE]\x1b[0m AWS Certified Security (Target: Winter 2025)"
      );
      term.writeln(
        "- \x1b[1;31m[STUDYING]\x1b[0m PNPT (Practical Network Penetration Tester)"
      );
      term.writeln(
        "- \x1b[1;31m[STUDYING]\x1b[0m eJPT (eLearnSecurity Junior Penetration Tester)"
      );
      term.writeln("- \x1b[31m[LONG-TERM]\x1b[0m OSCP, OSEP\r\n");
      term.writeln(
        "\x1b[1;31m//--- MEDICAL CERTIFICATIONS (CURRENT) ---//\x1b[0m"
      );
      term.writeln(
        "- ACLS, BLS, StopTheBleed Instructor. Reinforces incident response capabilities."
      );
    },
    clear: (term, args) => term.clear(),
    print: (term, args) => {
      const content = term.buffer.active
        .getLines(0, term.buffer.active.baseY + term.rows - 1)
        .map((line) => line.translateToString(true))
        .join("\n");
      const printWindow = window.open("", "_blank");
      printWindow.document.write(
        "<html><head><title>Print Preview</title><style>body { font-family: monospace; white-space: pre; }</style></head><body>" +
          content +
          "</body></html>"
      );
      printWindow.document.close();
      printWindow.print();
    },
    projects: (term, args) => {
      term.writeln("> ls /home/devuser/projects\r\n");
      term.writeln("\x1b[1;31m//=== ACTIVE DEVELOPMENT ===//\x1b[0m\r\n");
      term.writeln(
        "  \x1b[1;31m[1] Syn_OS - Security-Focused Linux Distribution\x1b[0m"
      );
      term.writeln(
        "      ~18k lines of C/Rust/Python | Custom kernel schedulers & security automation"
      );
      term.writeln(
        "      > \x1b[4mhttps://github.com/TLimoges33/Syn_OS\x1b[0m (Private - Available on request)"
      );
      term.writeln(
        "      Type '\x1b[1;31msynos\x1b[0m' for technical deep-dive\r\n"
      );
      term.writeln(
        "  \x1b[1;31m[2] LifeRPG v2.0 - Gamified Productivity & Habit Tracker\x1b[0m"
      );
      term.writeln(
        "      Personal productivity system with RPG mechanics and AI coaching\r\n"
      );
      term.writeln(
        "  \x1b[1;31m[3] Interactive Terminal Portfolio (This Site)\x1b[0m"
      );
      term.writeln(
        "      PWA with xterm.js, CI/CD, Vitest testing, WASM demos"
      );
      term.writeln(
        "      > \x1b[4mhttps://github.com/TLimoges33/portfolio\x1b[0m\r\n"
      );
      term.writeln("\x1b[1;31m//=== RESEARCH & DEVELOPMENT ===//\x1b[0m");
      term.writeln(
        "  \x1b[1;31m[WIP]\x1b[0m Automated Red Team Lab (Terraform + Ansible)"
      );
      term.writeln(
        "  \x1b[1;31m[WIP]\x1b[0m EDR Evasion Research - Direct Syscall PoC (C/Assembly)"
      );
      term.writeln(
        "  \x1b[1;31m[WIP]\x1b[0m Custom Malleable C2 Profile for Cobalt Strike"
      );
      term.writeln(
        "  \x1b[1;31m[RESEARCH]\x1b[0m Healthcare AI Security (LLM Prompt Injection)\r\n"
      );
      term.writeln("\x1b[1;31m//=== ACTIVE LEARNING & PRACTICE ===//\x1b[0m");
      term.writeln(
        "  \x1b[1;31m[CTF]\x1b[0m HackTheBox | TryHackMe | OverTheWire Wargames"
      );
      term.writeln(
        "  \x1b[1;31m[CTF]\x1b[0m HackAPrompt (T.Limoges) - AI/LLM Security"
      );
      term.writeln(
        "  \x1b[1;31m[STUDY]\x1b[0m freeCodeCamp - Full-stack & web security\r\n"
      );
      term.writeln(
        "Type '\x1b[1;31mpursuits\x1b[0m' for freelance work & bug bounty programs"
      );
    },
    synos: (term, args) => {
      // Handle special demo flags
      if (args[0] === "--demo") {
        term.writeln(
          "\x1b[1;31m╔════════════════════════════════════════════════════╗\x1b[0m"
        );
        term.writeln(
          "\x1b[1;31m║        SYN_OS BOOT SEQUENCE SIMULATION            ║\x1b[0m"
        );
        term.writeln(
          "\x1b[1;31m╚════════════════════════════════════════════════════╝\x1b[0m\r\n"
        );

        const bootSequence = [
          { msg: "[ 0.000000] Initializing cgroup subsys cpuset", delay: 100 },
          { msg: "[ 0.000000] Initializing cgroup subsys cpu", delay: 100 },
          {
            msg: "[ 0.000000] Linux version 6.1.0-syn (tlimoges@synos)",
            delay: 150,
          },
          {
            msg: "[ 0.000000] Command line: BOOT_IMAGE=/boot/vmlinuz-syn",
            delay: 100,
          },
          { msg: "[ 0.120000] Memory: 16GB available", delay: 150 },
          {
            msg: "[ 0.240000] SYN_OS AI Memory Manager initializing...",
            delay: 200,
          },
          {
            msg: "[ 0.360000] Loading neural process scheduler...",
            delay: 200,
          },
          { msg: "[ 0.480000] Consciousness engine: READY", delay: 200 },
          { msg: "[ 0.600000] Loading 43 custom syscalls...", delay: 150 },
          { msg: "[ 0.720000] eBPF security framework: ACTIVE", delay: 150 },
          { msg: "[ 0.840000] Mounting /proc filesystem", delay: 100 },
          { msg: "[ 0.960000] Loading ParrotOS security tools...", delay: 200 },
          { msg: "[ 1.200000] 500+ security tools available", delay: 150 },
          { msg: "[ 1.350000] Starting network services...", delay: 150 },
          {
            msg: "[ 1.500000] \x1b[1;31mBOOT COMPLETE - Welcome to SYN_OS v1.0\x1b[0m",
            delay: 200,
          },
        ];

        let index = 0;
        const displayNext = () => {
          if (index < bootSequence.length) {
            term.writeln(bootSequence[index].msg);
            index++;
            setTimeout(displayNext, bootSequence[index - 1].delay);
          } else {
            term.writeln(
              "\r\n\x1b[1;31mThis is a simulation of the actual SYN_OS boot process.\x1b[0m"
            );
          }
        };
        displayNext();
        return;
      }

      if (args[0] === "--memory") {
        term.writeln(
          "\x1b[1;31m╔════════════════════════════════════════════════════╗\x1b[0m"
        );
        term.writeln(
          "\x1b[1;31m║     AI MEMORY MANAGER VISUALIZATION (13k+ LOC)    ║\x1b[0m"
        );
        term.writeln(
          "\x1b[1;31m╚════════════════════════════════════════════════════╝\x1b[0m\r\n"
        );

        term.writeln("\x1b[1;31mMEMORY REGIONS:\x1b[0m\r\n");
        term.writeln("  ┌──────────────────────────────────────────┐");
        term.writeln("  │ KERNEL SPACE (3GB - 4GB)                 │");
        term.writeln("  │ ▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░ 35% used       │");
        term.writeln("  │ • AI Scheduler: 245MB                    │");
        term.writeln("  │ • Neural Memory Mgr: 512MB               │");
        term.writeln("  │ • Syscall Table: 8MB                     │");
        term.writeln("  ├──────────────────────────────────────────┤");
        term.writeln("  │ USER SPACE (0GB - 3GB)                   │");
        term.writeln("  │ ████████████░░░░░░░░░░░░ 52% used       │");
        term.writeln("  │ • Applications: 1.2GB                    │");
        term.writeln("  │ • Shared Libraries: 340MB                │");
        term.writeln("  └──────────────────────────────────────────┘\r\n");

        term.writeln("\x1b[1;31mAI FEATURES:\x1b[0m");
        term.writeln("  • Predictive page prefetching");
        term.writeln("  • Neural pattern recognition for memory access");
        term.writeln("  • Adaptive cache management");
        term.writeln("  • Consciousness-aware allocation\r\n");

        term.writeln(
          "\x1b[1;31mImplemented in ai_memory_manager.c (13,027 lines)\x1b[0m"
        );
        return;
      }

      if (args[0] === "--syscalls") {
        term.writeln(
          "\x1b[1;31m╔════════════════════════════════════════════════════╗\x1b[0m"
        );
        term.writeln(
          "\x1b[1;31m║        43 CUSTOM SYSTEM CALLS - OVERVIEW          ║\x1b[0m"
        );
        term.writeln(
          "\x1b[1;31m╚════════════════════════════════════════════════════╝\x1b[0m\r\n"
        );

        term.writeln("\x1b[1;31m[AI & Consciousness]\x1b[0m");
        term.writeln("  sys_consciousness_init()  - Initialize AI engine");
        term.writeln("  sys_neural_query()        - Query neural network");
        term.writeln("  sys_ai_schedule()         - AI process scheduling\r\n");

        term.writeln("\x1b[1;31m[Memory Management]\x1b[0m");
        term.writeln("  sys_smart_alloc()         - AI-guided allocation");
        term.writeln("  sys_memory_predict()      - Prefetch predictions");
        term.writeln("  sys_cache_optimize()      - Neural cache tuning\r\n");

        term.writeln("\x1b[1;31m[Security]\x1b[0m");
        term.writeln("  sys_ebpf_attach()         - eBPF program loading");
        term.writeln("  sys_security_scan()       - Real-time threat scan");
        term.writeln("  sys_sandbox_create()      - Isolated execution\r\n");

        term.writeln("\x1b[1;31m[Process Control]\x1b[0m");
        term.writeln("  sys_quantum_adjust()      - Dynamic time slicing");
        term.writeln("  sys_priority_learn()      - ML-based priority");
        term.writeln("  sys_task_migrate()        - Cross-CPU migration\r\n");

        term.writeln("\x1b[1;31m+ 31 more custom syscalls...\x1b[0m");
        term.writeln(
          "\x1b[1;31mFull list: github.com/TLimoges33/Syn_OS/docs/syscalls.md\x1b[0m"
        );
        return;
      }

      // Original synos command output
      term.writeln("> cat /docs/synos-technical-summary.md\r\n");
      term.writeln("\x1b[1;31m=== SYN_OS: TECHNICAL DEEP-DIVE ===\x1b[0m\r\n");
      term.writeln(
        "\x1b[1;31mProject Status:\x1b[0m v1.0 Complete (October 2025)"
      );
      term.writeln(
        "\x1b[1;31mRepository:\x1b[0m Public - github.com/TLimoges33/Syn_OS"
      );
      term.writeln(
        "\x1b[1;31mCodebase:\x1b[0m 452,000+ lines (Rust, C, Python, Shell)"
      );
      term.writeln(
        "\x1b[1;31mDevelopment:\x1b[0m 6 months intensive (310+ commits, 4 contributors)\r\n"
      );

      term.writeln("\x1b[1;31m// TECHNICAL ACHIEVEMENTS //\x1b[0m\r\n");

      term.writeln("\x1b[1;31m[1] KERNEL-LEVEL SYSTEMS PROGRAMMING\x1b[0m");
      term.writeln(
        "    - AI-enhanced process scheduler (consciousness_scheduler)"
      );
      term.writeln(
        "    - Neural memory manager (ai_memory_manager.c - 13,000+ lines)"
      );
      term.writeln("    - Custom system call interface (43 syscalls)");
      term.writeln("    - eBPF security framework");
      term.writeln("    - AI consciousness engine (10,611 lines)\r\n");

      term.writeln("\x1b[1;31m[2] SECURITY TOOLING INTEGRATION\x1b[0m");
      term.writeln("    - 500+ integrated security tools");
      term.writeln("    - ParrotOS/Kali security suite");
      term.writeln("    - Exploitation frameworks");
      term.writeln("    - Forensics & network analysis tools\r\n");

      term.writeln("\x1b[1;31m[3] BUILD INFRASTRUCTURE\x1b[0m");
      term.writeln("    - Professional Makefile (500+ lines, 20+ targets)");
      term.writeln("    - Multi-language build system (Rust/C/Python/Shell)");
      term.writeln("    - CI/CD workflows");
      term.writeln("    - Docker containerization");
      term.writeln("    - Comprehensive testing (175 tests)\r\n");

      term.writeln("\x1b[1;31m[4] SOFTWARE ENGINEERING PRACTICES\x1b[0m");
      term.writeln("    - 992 Rust files (133,649 total lines)");
      term.writeln("    - 8,344 Python files for AI/ML integration");
      term.writeln("    - 565 documentation files");
      term.writeln("    - 310+ commits across 3 months");
      term.writeln(
        "    - Professional project structure (13 root directories)\r\n"
      );

      term.writeln("\x1b[1;31m// SKILLS DEMONSTRATED //\x1b[0m\r\n");
      term.writeln(
        "  \x1b[1;31m+\x1b[0m C Programming (kernel-level, 13k+ LOC AI memory manager)"
      );
      term.writeln(
        "  \x1b[1;31m+\x1b[0m Rust Systems Programming (992 files, 133k+ LOC)"
      );
      term.writeln(
        "  \x1b[1;31m+\x1b[0m Linux Kernel Development (modules, syscalls, eBPF)"
      );
      term.writeln(
        "  \x1b[1;31m+\x1b[0m Build Systems (Make, Cargo, complex multi-language)"
      );
      term.writeln(
        "  \x1b[1;31m+\x1b[0m Multi-language Integration (Rust/C/Python/Shell)"
      );
      term.writeln(
        "  \x1b[1;31m+\x1b[0m Software Architecture (44 workspace crates)"
      );
      term.writeln("  \x1b[1;31m+\x1b[0m Git Version Control (310+ commits)");
      term.writeln(
        "  \x1b[1;31m+\x1b[0m CI/CD & DevOps (Docker, GitHub Actions)\r\n"
      );

      term.writeln("\x1b[1;31m// HONEST ASSESSMENT //\x1b[0m\r\n");
      term.writeln("\x1b[1;31mWhat's Real:\x1b[0m");
      term.writeln("  • 452,000+ lines of production code");
      term.writeln("  • Professional development practices (100% compilation)");
      term.writeln(
        "  • Deep systems programming (kernel modules, memory mgmt)"
      );
      term.writeln("  • V1.0 Complete - bootable ISO (12-15GB)\r\n");

      term.writeln("\x1b[1;31mWhat's Aspirational:\x1b[0m");
      term.writeln("  • AI consciousness is experimental/conceptual");
      term.writeln("  • Neural Darwinism framework is research-oriented");
      term.writeln("  • Not production-ready for enterprise deployment");
      term.writeln("  • Educational OS for learning kernel development\r\n");

      term.writeln(
        "\x1b[1;31m> Key Takeaway:\x1b[0m Demonstrates advanced kernel-level systems"
      );
      term.writeln(
        "  programming, professional software engineering discipline, and"
      );
      term.writeln(
        "  ambitious technical vision backed by real implementations.\r\n"
      );

      term.writeln(
        "Repository: \x1b[4mhttps://github.com/TLimoges33/Syn_OS\x1b[0m"
      );

      term.writeln("\r\n\x1b[1;31m TRY INTERACTIVE DEMOS:\x1b[0m");
      term.writeln(
        "  \x1b[1;31msynos --demo\x1b[0m      Boot sequence animation"
      );
      term.writeln(
        "  \x1b[1;31msynos --memory\x1b[0m    AI memory manager visualization"
      );
      term.writeln(
        "  \x1b[1;31msynos --syscalls\x1b[0m  43 custom syscalls overview"
      );
    },
    skills: (term, args) => {
      term.writeln("> grep -r 'expertise' /var/log/skills.db\r\n");

      term.writeln("\x1b[1;31m=== TECHNICAL SKILLS MATRIX ===\x1b[0m\r\n");

      term.writeln("\x1b[1;31m// PROGRAMMING LANGUAGES //\x1b[0m");
      term.writeln(
        "  \x1b[1;31m●●●●●\x1b[0m Python 3.12 (Scripting, automation, AI/ML, exploit dev)"
      );
      term.writeln(
        "  \x1b[1;31m●●●●○\x1b[0m JavaScript / Node.js 22 (Web, automation, full-stack)"
      );
      term.writeln(
        "  \x1b[1;31m●●●●○\x1b[0m C (GCC 14) (Kernel-level, memory mgmt, low-level exploits)"
      );
      term.writeln(
        "  \x1b[1;31m●●●○○\x1b[0m SQL / PostgreSQL 16 (Database security, injection)"
      );
      term.writeln(
        "  \x1b[1;31m●●●○○\x1b[0m Rust 1.80 (Systems programming, secure tooling)"
      );
      term.writeln(
        "  \x1b[1;31m●●●○○\x1b[0m Go 1.23 (Networking tools, concurrency)"
      );
      term.writeln(
        "  \x1b[1;31m●●○○○\x1b[0m x86-64 Assembly (Malware analysis, exploit dev, reversing)\r\n"
      );

      term.writeln("\x1b[1;31m// SYSTEMS & KERNEL DEVELOPMENT //\x1b[0m");
      term.writeln("  \x1b[1;31m●●●●○\x1b[0m Linux Internals & System Calls");
      term.writeln("  \x1b[1;31m●●●○○\x1b[0m Memory Management & Pointers");
      term.writeln(
        "  \x1b[1;31m●●●○○\x1b[0m Process Scheduling & Kernel Modules"
      );
      term.writeln(
        "  \x1b[1;31m●●●○○\x1b[0m Build Systems (Make, CMake, Cargo)\r\n"
      );

      term.writeln("\x1b[1;31m// SECURITY & PENETRATION TESTING //\x1b[0m");
      term.writeln("  \x1b[1;31m●●●●○\x1b[0m Network Security & Protocols");
      term.writeln(
        "  \x1b[1;31m●●●○○\x1b[0m Offensive Security Tools (Metasploit, Burp, etc)"
      );
      term.writeln(
        "  \x1b[1;31m●●●○○\x1b[0m Web Application Security (OWASP Top 10)"
      );
      term.writeln(
        "  \x1b[1;31m●●○○○\x1b[0m Binary Exploitation & Reverse Engineering"
      );
      term.writeln(
        "  \x1b[1;31m●●○○○\x1b[0m EDR Evasion & Red Team Techniques"
      );
      term.writeln(
        "  \x1b[1;31m●●●●○\x1b[0m Security Tool Integration & Automation\r\n"
      );

      term.writeln("\x1b[1;31m// INFRASTRUCTURE & DEVOPS //\x1b[0m");
      term.writeln("  \x1b[1;31m●●●●○\x1b[0m Linux System Administration");
      term.writeln("  \x1b[1;31m●●●●○\x1b[0m Git & Version Control");
      term.writeln("  \x1b[1;31m●●●●○\x1b[0m CI/CD (GitHub Actions, Testing)");
      term.writeln("  \x1b[1;31m●●●○○\x1b[0m Shell Scripting (Bash)");
      term.writeln("  \x1b[1;31m●●○○○\x1b[0m Docker & Containerization");
      term.writeln("  \x1b[1;31m●●○○○\x1b[0m Terraform (IaC - Learning)");
      term.writeln(
        "  \x1b[1;31m●●○○○\x1b[0m Ansible (Configuration Mgmt - Learning)"
      );
      term.writeln(
        "  \x1b[1;31m●●●○○\x1b[0m Networking (TCP/IP, VPN, Routing)\r\n"
      );

      term.writeln("\x1b[1;31m// DOMAIN EXPERTISE //\x1b[0m");
      term.writeln(
        "  \x1b[1;31m●●●●●\x1b[0m Critical Infrastructure Operations"
      );
      term.writeln(
        "  \x1b[1;31m●●●●●\x1b[0m Incident Response (Medical/Trauma)"
      );
      term.writeln("  \x1b[1;31m●●●●○\x1b[0m Compliance (HIPAA, PHI Handling)");
      term.writeln("  \x1b[1;31m●●●●○\x1b[0m High-Pressure Decision Making");
      term.writeln("  \x1b[1;31m●●●●○\x1b[0m Team Leadership & Training\r\n");

      term.writeln("\x1b[1;31m// CERTIFICATIONS & LEARNING PATH //\x1b[0m");
      term.writeln("  \x1b[1;31m[ACTIVE]\x1b[0m CompTIA Network+ & Security+");
      term.writeln(
        "  \x1b[1;31m[STUDYING]\x1b[0m PNPT (Practical Network Penetration Tester)"
      );
      term.writeln(
        "  \x1b[1;31m[STUDYING]\x1b[0m eJPT (eLearnSecurity Junior PT)"
      );
      term.writeln("  \x1b[31m[LONG-TERM]\x1b[0m OSCP, OSEP\r\n");

      term.writeln("\x1b[1;31m> Unique Value Proposition:\x1b[0m");
      term.writeln(
        "  Polyglot developer with kernel-level systems programming,"
      );
      term.writeln("  security focus, and critical infrastructure experience.");
      term.writeln(
        "  Bridge between low-level development and offensive security."
      );
    },
    pursuits: (term, args) => {
      term.writeln("> cat /var/log/active_pursuits.log\r\n");

      term.writeln(
        "\x1b[1;31m=== CURRENT PURSUITS & OPPORTUNITIES ===\x1b[0m\r\n"
      );

      term.writeln("\x1b[1;31m// FREELANCE PLATFORMS (LAUNCHING) //\x1b[0m");
      term.writeln(
        "  \x1b[1;31m[ACTIVE]\x1b[0m Upwork - Security consulting, pentesting, scripting"
      );
      term.writeln(
        "  \x1b[1;31m[ACTIVE]\x1b[0m Fiverr - Security tools, automation, web scraping"
      );
      term.writeln(
        "  \x1b[1;31m[ACTIVE]\x1b[0m Freelancer - Python/JS development, security audits\r\n"
      );

      term.writeln("\x1b[1;31m// BUG BOUNTY PROGRAMS //\x1b[0m");
      term.writeln(
        "  \x1b[1;31m[JOINING]\x1b[0m HackerOne - Web app security, API testing"
      );
      term.writeln(
        "  \x1b[1;31m[JOINING]\x1b[0m Bugcrowd - Network security, mobile apps"
      );
      term.writeln(
        "  \x1b[1;31m[JOINING]\x1b[0m Synack - Private bug bounty platform"
      );
      term.writeln(
        "  \x1b[1;31m[JOINING]\x1b[0m Intigriti - European-focused security research\r\n"
      );

      term.writeln("\x1b[1;31m// CTF COMPETITIONS & PRACTICE //\x1b[0m");
      term.writeln(
        "  \x1b[1;31m[ACTIVE]\x1b[0m HackTheBox - \x1b[4mhttps://app.hackthebox.com/profile/227499\x1b[0m"
      );
      term.writeln(
        "  \x1b[1;31m[ACTIVE]\x1b[0m TryHackMe - \x1b[4mhttps://tryhackme.com/p/TLimoges33\x1b[0m"
      );
      term.writeln(
        "  \x1b[1;31m[ACTIVE]\x1b[0m OverTheWire Wargames - Linux, networking, exploits"
      );
      term.writeln(
        "  \x1b[1;31m[ACTIVE]\x1b[0m HackAPrompt (T.Limoges) - AI/LLM security challenges"
      );
      term.writeln(
        "  \x1b[1;31m[ACTIVE]\x1b[0m freeCodeCamp - Full-stack & web security\r\n"
      );

      term.writeln("\x1b[1;31m// SPECIALIZED SKILLS FOR HIRE //\x1b[0m");
      term.writeln(
        "  • Python automation & scripting (web scraping, bots, tools)"
      );
      term.writeln("  • Security tool development (C, Rust, Python, Go)");
      term.writeln("  • Web application penetration testing (OWASP Top 10)");
      term.writeln("  • Network security audits & vulnerability assessments");
      term.writeln("  • Linux system administration & hardening");
      term.writeln("  • Custom exploit development & security research");
      term.writeln("  • CI/CD pipeline setup & automation");
      term.writeln("  • Database security & SQL injection testing\r\n");

      term.writeln("\x1b[1;31m// AVAILABILITY //\x1b[0m");
      term.writeln(
        "  \x1b[1;31mStatus:\x1b[0m Open to freelance projects & bug bounty work"
      );
      term.writeln(
        "  \x1b[1;31mFocus:\x1b[0m Security, automation, systems programming"
      );
      term.writeln(
        "  \x1b[1;31mRate:\x1b[0m Competitive, project-based pricing"
      );
      term.writeln(
        "  \x1b[1;31mTimeline:\x1b[0m Flexible scheduling around full-time studies\r\n"
      );

      term.writeln("\x1b[1;31m> Contact:\x1b[0m");
      term.writeln("  Email: \x1b[4mmogeem33@gmail.com\x1b[0m");
      term.writeln("  GitHub: \x1b[4mhttps://github.com/TLimoges33\x1b[0m");
      term.writeln(
        "  LinkedIn: \x1b[4mhttps://linkedin.com/in/tylerlimoges\x1b[0m"
      );
    },

    blog: (term, args) => {
      term.writeln("> cat ~/research/blog_posts.md\r\n");

      term.writeln("\x1b[1;31m=== SHELLDIABLO33 RESEARCH BLOG ===\x1b[0m");
      term.writeln(
        "\x1b[1;31mSubstack:\x1b[0m \x1b[4mhttps://shelldiablo33.substack.com\x1b[0m\r\n"
      );

      term.writeln("\x1b[1;31m// TECHNICAL GUIDES //\x1b[0m\r\n");

      term.writeln(
        "\x1b[1;31m1. The Complete Guide to Building Production-Grade C Projects\x1b[0m"
      );
      term.writeln(
        "   \x1b[1;31m├─\x1b[0m Topics: Makefile mastery, CI/CD, testing, deployment"
      );
      term.writeln(
        "   \x1b[1;31m├─\x1b[0m Focus: Professional C development workflows"
      );
      term.writeln("   \x1b[1;31m├─\x1b[0m Level: Intermediate to Advanced");
      term.writeln(
        "   \x1b[1;31m└─\x1b[0m Link: \x1b[4mhttps://shelldiablo33.substack.com/p/the-complete-guide-to-building-production\x1b[0m\r\n"
      );

      term.writeln(
        "\x1b[1;31m2. Cybersecurity Fundamentals - But Actually Useful\x1b[0m"
      );
      term.writeln(
        "   \x1b[1;31m├─\x1b[0m Topics: Core security concepts, practical applications"
      );
      term.writeln(
        "   \x1b[1;31m├─\x1b[0m Focus: Real-world security principles, not just theory"
      );
      term.writeln("   \x1b[1;31m├─\x1b[0m Level: Beginner to Intermediate");
      term.writeln(
        "   \x1b[1;31m└─\x1b[0m Link: \x1b[4mhttps://shelldiablo33.substack.com/p/cybersecurity-fundamentals-but-a\x1b[0m\r\n"
      );

      term.writeln("\x1b[1;31m// THEORETICAL RESEARCH //\x1b[0m\r\n");

      term.writeln(
        "\x1b[1;31m3. A Humble Attempt at Theory of Consciousness\x1b[0m"
      );
      term.writeln(
        "   \x1b[1;31m├─\x1b[0m Topics: Consciousness, AI, philosophy of mind"
      );
      term.writeln(
        "   \x1b[1;31m├─\x1b[0m Focus: Bridging neuroscience, AI, and consciousness studies"
      );
      term.writeln("   \x1b[1;31m├─\x1b[0m Level: Advanced theoretical");
      term.writeln(
        "   \x1b[1;31m├─\x1b[0m Note: Intersects with AI safety & alignment research"
      );
      term.writeln(
        "   \x1b[1;31m└─\x1b[0m Link: \x1b[4mhttps://shelldiablo33.substack.com/p/a-humble-attempt-at-theory-of-consciousness\x1b[0m\r\n"
      );

      term.writeln("\x1b[1;31m// PROFESSIONAL FRAMEWORKS //\x1b[0m\r\n");

      term.writeln(
        "\x1b[1;31m4. Red Teamer's Comprehensive Playbook Framework\x1b[0m"
      );
      term.writeln(
        "   \x1b[1;31m├─\x1b[0m Topics: Unified Kill Chain, MITRE ATT&CK, certification mapping"
      );
      term.writeln(
        "   \x1b[1;31m├─\x1b[0m Focus: Academic + professional red team operations"
      );
      term.writeln(
        "   \x1b[1;31m├─\x1b[0m Level: Professional (cert prep: PenTest+, CEH, OSCP, PNPT)"
      );
      term.writeln(
        "   \x1b[1;31m├─\x1b[0m Scope: 18 UKC phases, 8 SNHU categories, blue team perspectives"
      );
      term.writeln(
        "   \x1b[1;31m├─\x1b[0m Note: Living document for career-long red team development"
      );
      term.writeln(
        "   \x1b[1;31m└─\x1b[0m Status: Active study guide (academic + certification use)\r\n"
      );

      term.writeln("\x1b[1;31m// WRITING STATS //\x1b[0m");
      term.writeln(
        "  \x1b[1;31mPublished Posts:\x1b[0m 3 public + 1 comprehensive framework"
      );
      term.writeln("  \x1b[1;31mPlatform:\x1b[0m Substack (shelldiablo33)");
      term.writeln(
        "  \x1b[1;31mFocus Areas:\x1b[0m Systems programming, cybersecurity, AI theory, red teaming"
      );
      term.writeln(
        "  \x1b[1;31mStyle:\x1b[0m Technical depth with practical applications\r\n"
      );

      term.writeln("\x1b[1;31m// UPCOMING CONTENT //\x1b[0m");
      term.writeln(
        "  \x1b[1;31m[PLANNED]\x1b[0m CTF write-ups (HTB/THM machines)"
      );
      term.writeln(
        "  \x1b[1;31m[PLANNED]\x1b[0m Security tool development series"
      );
      term.writeln(
        "  \x1b[1;31m[PLANNED]\x1b[0m AI red teaming & LLM security research"
      );
      term.writeln(
        "  \x1b[1;31m[PLANNED]\x1b[0m Kernel exploitation techniques\r\n"
      );

      term.writeln(
        "\x1b[1;31m> Subscribe:\x1b[0m \x1b[4mhttps://shelldiablo33.substack.com\x1b[0m"
      );
    },

    certs: (term, args) => {
      term.writeln("> cat ~/certifications/roadmap.md\r\n");

      term.writeln(
        "\x1b[1;31m╔═══════════════════════════════════════════════════════════════╗\x1b[0m"
      );
      term.writeln(
        "\x1b[1;31m║     RED TEAM CERTIFICATION ROADMAP - STRATEGIC ANALYSIS      ║\x1b[0m"
      );
      term.writeln(
        "\x1b[1;31m╚═══════════════════════════════════════════════════════════════╝\x1b[0m\r\n"
      );

      term.writeln("\x1b[1;31m CURRENT STATUS:\x1b[0m");
      term.writeln(
        "  \x1b[1;31m├─\x1b[0m Phase: Building the Bedrock (Foundational Skills)"
      );
      term.writeln("  \x1b[1;31m├─\x1b[0m Progress: 6-12 months into roadmap");
      term.writeln(
        "  \x1b[1;31m└─\x1b[0m Focus: Network foundations → Offensive tactics\r\n"
      );

      term.writeln(
        "\x1b[1;31m PHASE 1: BUILDING THE BEDROCK (Months 0-12)\x1b[0m"
      );
      term.writeln(
        '\x1b[1;31m   "You cannot break what you do not understand"\x1b[0m\r\n'
      );

      term.writeln(
        "  \x1b[1;31m1. CompTIA Network+\x1b[0m \x1b[1;31m[STUDYING]\x1b[0m"
      );
      term.writeln("     \x1b[1;31m├─\x1b[0m Cost: ~$369 | Time: 2-3 months");
      term.writeln(
        "     \x1b[1;31m├─\x1b[0m Why: TCP/IP, routing, DNS - the central nervous system"
      );
      term.writeln("     \x1b[1;31m└─\x1b[0m Target: November 2025\r\n");

      term.writeln(
        "  \x1b[1;31m2. CompTIA Security+\x1b[0m \x1b[1;31m[STUDYING]\x1b[0m"
      );
      term.writeln("     \x1b[1;31m├─\x1b[0m Cost: ~$404 | Time: 2-3 months");
      term.writeln(
        "     \x1b[1;31m├─\x1b[0m Why: Fundamental security vocabulary & frameworks"
      );
      term.writeln("     \x1b[1;31m└─\x1b[0m Target: December 2025\r\n");

      term.writeln(
        "  \x1b[1;31m3. CompTIA Linux+\x1b[0m \x1b[1;31m[PLANNED]\x1b[0m"
      );
      term.writeln("     \x1b[1;31m├─\x1b[0m Cost: ~$369 | Time: 2-3 months");
      term.writeln(
        "     \x1b[1;31m├─\x1b[0m Why: Most servers & offensive tools are Linux-based"
      );
      term.writeln("     \x1b[1;31m└─\x1b[0m Target: Q1 2026\r\n");

      term.writeln(
        "\x1b[1;31m⚔️  PHASE 2: OFFENSIVE TACTICS (Months 6-12)\x1b[0m"
      );
      term.writeln(
        '\x1b[1;31m   "Think like an attacker. Act with methodology."\x1b[0m\r\n'
      );

      term.writeln(
        "  \x1b[1;31m4. eJPT (Junior Penetration Tester)\x1b[0m \x1b[1;31m[STUDYING]\x1b[0m"
      );
      term.writeln("     \x1b[1;31m├─\x1b[0m Cost: ~$249 | Time: 1-3 months");
      term.writeln(
        "     \x1b[1;31m├─\x1b[0m Format: 48-hour hands-on lab exam"
      );
      term.writeln(
        "     \x1b[1;31m├─\x1b[0m Why: Best first step into practical hacking"
      );
      term.writeln(
        "     \x1b[1;31m└─\x1b[0m ROI: Exceptional value for hands-on skills\r\n"
      );

      term.writeln(
        "  \x1b[1;31m5. CompTIA PenTest+\x1b[0m \x1b[1;31m[PLANNED]\x1b[0m"
      );
      term.writeln("     \x1b[1;31m├─\x1b[0m Cost: ~$404 | Time: 2-4 months");
      term.writeln(
        "     \x1b[1;31m├─\x1b[0m Format: Hybrid (MCQ + Performance-Based)"
      );
      term.writeln(
        "     \x1b[1;31m└─\x1b[0m Why: Validates full pentest methodology & process\r\n"
      );

      term.writeln(
        "  \x1b[1;31m6. PNPT (Practical Network PT)\x1b[0m \x1b[1;31m[PLANNED]\x1b[0m"
      );
      term.writeln("     \x1b[1;31m├─\x1b[0m Cost: ~$299 | Time: 3-5 months");
      term.writeln(
        "     \x1b[1;31m├─\x1b[0m Format: 5-day real corporate network + live debrief"
      );
      term.writeln(
        "     \x1b[1;31m└─\x1b[0m Why: Active Directory exploitation & reporting skills\r\n"
      );

      term.writeln(
        "\x1b[1;31m🏆 PHASE 3: PROFESSIONAL PROFICIENCY (Months 12-30)\x1b[0m"
      );
      term.writeln(
        '\x1b[1;31m   "The industry-defining certifications"\x1b[0m\r\n'
      );

      term.writeln(
        "  \x1b[1;31m7. CEH (Certified Ethical Hacker)\x1b[0m \x1b[1;31m[SITUATIONAL]\x1b[0m"
      );
      term.writeln(
        "     \x1b[1;31m├─\x1b[0m Cost: $1,899-$3,499+ | Time: 2-4 months"
      );
      term.writeln(
        "     \x1b[1;31m├─\x1b[0m HR Recognition: 9/10 | Technical Cred: 3/10"
      );
      term.writeln(
        "     \x1b[1;31m└─\x1b[0m Note: For HR filters only. Get if employer pays.\r\n"
      );

      term.writeln(
        "  \x1b[1;31m8. OSCP (Gold Standard)\x1b[0m \x1b[31m[LONG-TERM GOAL]\x1b[0m"
      );
      term.writeln(
        "     \x1b[1;31m├─\x1b[0m Cost: ~$1,749 | Time: 6-12+ months"
      );
      term.writeln(
        '     \x1b[1;31m├─\x1b[0m Format: 24-hour practical exam ("Try Harder")'
      );
      term.writeln(
        "     \x1b[1;31m├─\x1b[0m Why: THE gold standard for hands-on pentesting"
      );
      term.writeln("     \x1b[1;31m└─\x1b[0m Target: Mid-2026\r\n");

      term.writeln(
        "\x1b[1;31m🎖️  PHASE 4: ADVERSARY EMULATION (Months 24-48)\x1b[0m"
      );
      term.writeln(
        '\x1b[1;31m   "From penetration tester to red team operator"\x1b[0m\r\n'
      );

      term.writeln(
        "  \x1b[1;31m9. CRTP (Certified Red Team Professional)\x1b[0m"
      );
      term.writeln(
        "     \x1b[1;31m├─\x1b[0m Cost: ~$249 | Focus: Active Directory mastery"
      );
      term.writeln(
        "     \x1b[1;31m└─\x1b[0m Why: Best practical AD exploitation cert\r\n"
      );

      term.writeln(
        "  \x1b[1;31m10. OSEP (Experienced Penetration Tester)\x1b[0m \x1b[31m[LONG-TERM]\x1b[0m"
      );
      term.writeln("     \x1b[1;31m├─\x1b[0m Cost: ~$1,749 | Exam: 48 hours");
      term.writeln(
        "     \x1b[1;31m├─\x1b[0m Focus: AV evasion, advanced lateral movement"
      );
      term.writeln(
        "     \x1b[1;31m└─\x1b[0m Why: Operate in mature, defended environments\r\n"
      );

      term.writeln("  \x1b[1;31m11. GPEN (GIAC Penetration Tester)\x1b[0m");
      term.writeln(
        "     \x1b[1;31m├─\x1b[0m Cost: ~$9,500+ (with SANS training)"
      );
      term.writeln(
        "     \x1b[1;31m├─\x1b[0m Why: Corporate/gov standard, world-class training"
      );
      term.writeln("     \x1b[1;31m└─\x1b[0m Note: Employer-funded only\r\n");

      term.writeln("\x1b[1;31m ELITE SPECIALIZATIONS:\x1b[0m\r\n");

      term.writeln("  \x1b[1;31mAdvanced Active Directory:\x1b[0m");
      term.writeln(
        "     \x1b[1;31m└─\x1b[0m CRTE (Certified Red Team Expert) - Multi-forest attacks\r\n"
      );

      term.writeln("  \x1b[1;31mCloud Penetration Testing:\x1b[0m");
      term.writeln(
        "     \x1b[1;31m├─\x1b[0m MCPT (Multi-Cloud PT) - AWS/Azure/GCP"
      );
      term.writeln(
        "     \x1b[1;31m└─\x1b[0m GCPN (GIAC Cloud PT) - Enterprise standard\r\n"
      );

      term.writeln("  \x1b[1;31mWeb Application Security:\x1b[0m");
      term.writeln(
        "     \x1b[1;31m└─\x1b[0m OSWE (Offensive Security Web Expert) - White-box analysis\r\n"
      );

      term.writeln("  \x1b[1;31mMobile Security:\x1b[0m");
      term.writeln(
        "     \x1b[1;31m├─\x1b[0m eMAPT (Mobile App PT) - Android & iOS"
      );
      term.writeln(
        "     \x1b[1;31m└─\x1b[0m PMPA (Practical Mobile PT) - TCM Security\r\n"
      );

      term.writeln("  \x1b[1;31mExploit Development:\x1b[0m");
      term.writeln(
        "     \x1b[1;31m├─\x1b[0m OSED (Exploit Developer) - Windows user-mode"
      );
      term.writeln(
        "     \x1b[1;31m├─\x1b[0m GXPN (Exploit Researcher) - Multi-platform"
      );
      term.writeln(
        "     \x1b[1;31m└─\x1b[0m OSEE (Exploitation Expert) - Kernel exploitation\r\n"
      );

      term.writeln("\x1b[1;31m PUBLISHED RESEARCH:\x1b[0m");
      term.writeln(
        '  \x1b[1;31m"The Definitive Red Team Certification Roadmap:\x1b[0m'
      );
      term.writeln(
        '  \x1b[1;31m A Strategic Industry Analysis for 2025"\x1b[0m\r\n'
      );

      term.writeln(
        "  \x1b[1;31m├─\x1b[0m Framework: Two-Axis Evaluation (HR vs Technical Credibility)"
      );
      term.writeln(
        "  \x1b[1;31m├─\x1b[0m Analysis: 20+ certifications with cost/benefit breakdown"
      );
      term.writeln(
        "  \x1b[1;31m├─\x1b[0m Citations: 81+ industry sources verified"
      );
      term.writeln(
        "  \x1b[1;31m├─\x1b[0m Methodology: Red Teamer vs Penetration Tester distinction"
      );
      term.writeln(
        "  \x1b[1;31m└─\x1b[0m Decision Matrix: OSCP vs PNPT vs GPEN comparison\r\n"
      );

      term.writeln("\x1b[1;31m KEY INSIGHTS FROM RESEARCH:\x1b[0m\r\n");

      term.writeln("  \x1b[1;31m1. The CEH Dilemma:\x1b[0m");
      term.writeln(
        "     \x1b[1;31m├─\x1b[0m HR Recognition: 9/10 (highest) | Technical: 3/10 (lowest)"
      );
      term.writeln(
        "     \x1b[1;31m├─\x1b[0m Cost: $1,899-$3,499+ for mostly multiple-choice exam"
      );
      term.writeln(
        "     \x1b[1;31m└─\x1b[0m Verdict: Situational - only if employer pays & requires\r\n"
      );

      term.writeln("  \x1b[1;31m2. Best ROI Certifications:\x1b[0m");
      term.writeln(
        "     \x1b[1;31m├─\x1b[0m eJPT: $249 for first hands-on skills (exceptional value)"
      );
      term.writeln(
        "     \x1b[1;31m├─\x1b[0m PNPT: $299 for real-world AD attack simulation"
      );
      term.writeln(
        "     \x1b[1;31m└─\x1b[0m CRTP: $249 for best practical AD exploitation training\r\n"
      );

      term.writeln(
        "  \x1b[1;31m3. The Professional Crossroads (Choose Your Path):\x1b[0m"
      );
      term.writeln(
        "     \x1b[1;31m├─\x1b[0m OSCP: Industry gold standard, max resume impact ($1,749)"
      );
      term.writeln(
        "     \x1b[1;31m├─\x1b[0m PNPT: Best real-world simulation + live debrief ($299)"
      );
      term.writeln(
        "     \x1b[1;31m└─\x1b[0m GPEN: Corporate standard, employer-funded only ($9,500+)\r\n"
      );

      term.writeln("  \x1b[1;31m4. Red Teamer vs Penetration Tester:\x1b[0m");
      term.writeln(
        "     \x1b[1;31m├─\x1b[0m Pentester: Finds & exploits vulnerabilities"
      );
      term.writeln(
        "     \x1b[1;31m├─\x1b[0m Red Teamer: Emulates adversary TTPs, tests blue team"
      );
      term.writeln(
        "     \x1b[1;31m└─\x1b[0m Key Skills: Stealth, persistence, specific objectives\r\n"
      );

      term.writeln("\x1b[1;31m INVESTMENT STRATEGY:\x1b[0m\r\n");

      term.writeln("  \x1b[1;31mSelf-Funded Path (High ROI):\x1b[0m");
      term.writeln("     \x1b[1;31m├─\x1b[0m Phase 1: eJPT + PenTest+ (~$650)");
      term.writeln("     \x1b[1;31m├─\x1b[0m Phase 2: PNPT (~$299)");
      term.writeln("     \x1b[1;31m├─\x1b[0m Phase 3: CRTP + OSCP (~$2,000)");
      term.writeln(
        "     \x1b[1;31m└─\x1b[0m Total: ~$3,000 for professional-level skills\r\n"
      );

      term.writeln(
        "  \x1b[1;31mEmployer-Sponsored Path (Maximum Recognition):\x1b[0m"
      );
      term.writeln(
        "     \x1b[1;31m├─\x1b[0m Phase 1: CompTIA Trinity + CEH (~$5,000)"
      );
      term.writeln("     \x1b[1;31m├─\x1b[0m Phase 2: OSCP or GPEN (~$10,000)");
      term.writeln("     \x1b[1;31m├─\x1b[0m Phase 3: OSEP + OSWE (~$3,500)");
      term.writeln(
        "     \x1b[1;31m└─\x1b[0m Phase 4: GXPN or OSEE (~$12,000+)\r\n"
      );

      term.writeln("\x1b[1;31m TIMELINE & MILESTONES:\x1b[0m\r\n");

      term.writeln(
        "  \x1b[1;31m[NOW - NOV 2025]\x1b[0m Network+ → Security foundation"
      );
      term.writeln(
        "  \x1b[1;31m[DEC 2025]\x1b[0m Security+ → Industry baseline"
      );
      term.writeln("  \x1b[1;31m[Q1 2026]\x1b[0m eJPT → First practical cert");
      term.writeln("  \x1b[1;31m[Q2 2026]\x1b[0m PNPT → Real-world AD skills");
      term.writeln(
        "  \x1b[1;31m[MID-2026]\x1b[0m OSCP → Industry gold standard"
      );
      term.writeln(
        "  \x1b[1;31m[2027+]\x1b[0m OSEP/CRTP → Red team operator\r\n"
      );

      term.writeln(
        "\x1b[1;31m╔═══════════════════════════════════════════════════════════════╗\x1b[0m"
      );
      term.writeln(
        "\x1b[1;31m║  Research validates: Skills > Certifications > Job Titles   ║\x1b[0m"
      );
      term.writeln(
        "\x1b[1;31m║  Focus: Hands-on practice, public portfolio, continuous CTF  ║\x1b[0m"
      );
      term.writeln(
        "\x1b[1;31m╚═══════════════════════════════════════════════════════════════╝\x1b[0m\r\n"
      );

      term.writeln(
        "\x1b[1;31mTip: Use 'blog' to read the full research paper\x1b[0m"
      );
      term.writeln(
        "\x1b[1;31mTip: Use 'education' to see current certification status\x1b[0m"
      );
    },

    education: (term, args) => {
      term.writeln("> cat /etc/education.conf\r\n");

      term.writeln(
        "\x1b[1;31m> Current: Southern New Hampshire University\x1b[0m"
      );
      term.writeln("  Degree: B.S. Computer Science (Cybersecurity Focus)");
      term.writeln("  Status: Junior (Expected Graduation: May 2026)");
      term.writeln("  GPA: 3.9/4.0\r\n");

      term.writeln("\x1b[1;31m> Relevant Coursework:\x1b[0m");
      term.writeln("  • Operating Systems & Computer Architecture");
      term.writeln("  • Data Structures & Algorithms (C++, Python)");
      term.writeln("  • Network Security & Cryptography");
      term.writeln("  • Reverse Engineering & Malware Analysis");
      term.writeln("  • Web Application Security (OWASP)\r\n");

      term.writeln(
        "\x1b[1;31m> Certifications (In Progress / Planned):\x1b[0m"
      );
      term.writeln("  \x1b[1;31m[TARGET: NOV 2025]\x1b[0m CompTIA Network+");
      term.writeln("  \x1b[1;31m[TARGET: DEC 2025]\x1b[0m CompTIA Security+");
      term.writeln(
        "  \x1b[1;31m[STUDYING]\x1b[0m eJPT (eLearnSecurity Junior PT)"
      );
      term.writeln("  \x1b[31m[LONG-TERM]\x1b[0m OSCP, OSEP\r\n");

      term.writeln("\x1b[1;31m> Unique Value Proposition:\x1b[0m");
      term.writeln(
        "  Kernel-level systems programming + security focus + critical"
      );
      term.writeln(
        "  infrastructure experience. Bridge between low-level development"
      );
      term.writeln("  and offensive security operations.");
    },
    hash: (term, args) => {
      if (args.length === 0) {
        term.writeln("Usage: hash <string>");
        term.writeln('Example: hash "Hello World"');
        return;
      }
      const input = args.join(" ");
      let hash = 0;
      for (let i = 0; i < input.length; i++) {
        const char = input.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash;
      }
      const result = Math.abs(hash).toString(16).padStart(8, "0");
      term.writeln(`\x1b[1;31m[WASM-DEMO]\x1b[0m Input: "${input}"`);
      term.writeln(`\x1b[1;31m[WASM-DEMO]\x1b[0m Hash:  0x${result}`);
    },
    rot13: (term, args) => {
      if (args.length === 0) {
        term.writeln("Usage: rot13 <string>");
        term.writeln('Example: rot13 "Hello World"');
        return;
      }
      const input = args.join(" ");
      const result = input.replace(/[a-zA-Z]/g, (char) => {
        const start = char <= "Z" ? 65 : 97;
        return String.fromCharCode(
          start + ((char.charCodeAt(0) - start + 13) % 26)
        );
      });
      term.writeln(`\x1b[1;31m[WASM-DEMO]\x1b[0m Input:  "${input}"`);
      term.writeln(`\x1b[1;31m[WASM-DEMO]\x1b[0m ROT13:  "${result}"`);
    },
    advisor: async (term, args) => {
      // AI-Powered Hidden Admin Command
      if (!window.aiAdvisor) {
        term.writeln("\x1b[1;31mError: AI Advisor not initialized\x1b[0m");
        return;
      }

      // If no args, show full summary
      if (args.length === 0) {
        term.writeln("> Initializing AI Career Advisor...\r\n");
        term.writeln("\x1b[1;31m AI PORTFOLIO ADVISOR\x1b[0m\r\n");

        const status = window.aiAdvisor.getStatus();

        term.writeln(` Current Grade: \x1b[1;31m${status.grade}\x1b[0m`);
        term.writeln(
          ` Potential Grade: \x1b[1;31m${status.potential}\x1b[0m\r\n`
        );

        term.writeln("\x1b[1;31m✅ TOP STRENGTHS:\x1b[0m");
        status.strengths.forEach((s, i) => {
          term.writeln(`   ${i + 1}. ${s}`);
        });
        term.writeln("");

        term.writeln("\x1b[1;31m❌ CRITICAL GAPS:\x1b[0m");
        status.gaps.forEach((g, i) => {
          term.writeln(`   ${i + 1}. ${g}`);
        });
        term.writeln("");

        term.writeln("\x1b[1;31m TOP PRIORITIES:\x1b[0m");
        status.topPriorities.forEach((p, i) => {
          term.writeln(`   ${i + 1}. ${p}`);
        });
        term.writeln("");

        term.writeln("\x1b[1;31m CHAT WITH AI ADVISOR:\x1b[0m");
        term.writeln("  Type: advisor <your question>");
        term.writeln("  \x1b[1;31mExamples:\x1b[0m");
        term.writeln("    advisor what should I do next?");
        term.writeln("    advisor help me with ctf writeups");
        term.writeln("    advisor how do I get security+ cert?");
        term.writeln("    advisor status\r\n");

        term.writeln(
          "\x1b[1;31m> AI Advisor ready! Ask me anything about your career.\x1b[0m"
        );
        return;
      }

      // Chat mode - answer specific question
      const question = args.join(" ");
      term.writeln(`\r\n\x1b[1;31m[YOU]\x1b[0m ${question}\r\n`);
      term.writeln("\x1b[1;31m[AI Advisor thinking...]\x1b[0m\r\n");

      try {
        const response = await window.aiAdvisor.chat(question);

        // Format and display response with wrapping
        const lines = response.split("\n");
        lines.forEach((line) => {
          // Wrap long lines at 80 chars
          if (line.length > 80) {
            const words = line.split(" ");
            let currentLine = "";
            words.forEach((word) => {
              if ((currentLine + word).length > 77) {
                term.writeln(`\x1b[1;31m[AI]\x1b[0m ${currentLine}`);
                currentLine = word + " ";
              } else {
                currentLine += word + " ";
              }
            });
            if (currentLine.trim()) {
              term.writeln(`\x1b[1;31m[AI]\x1b[0m ${currentLine}`);
            }
          } else {
            term.writeln(`\x1b[1;31m[AI]\x1b[0m ${line}`);
          }
        });
        term.writeln("");
        term.writeln(
          "\x1b[1;31m> Ask another question or type 'advisor' for full summary\x1b[0m"
        );
      } catch (error) {
        term.writeln(`\x1b[1;31m[ERROR]\x1b[0m ${error.message}\x1b[0m`);
        term.writeln(
          "\x1b[1;31m> Fallback: Type 'advisor' with no args for static recommendations\x1b[0m"
        );
      }
    },
    update: (term, args) => {
      term.writeln(
        "\x1b[1;31m> Reloading portfolio with latest changes...\x1b[0m\r\n"
      );
      term.writeln("  [1/3] Clearing cache...");

      // Clear service worker cache
      if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: "CLEAR_CACHE" });
      }

      term.writeln("  [2/3] Unregistering service workers...");

      // Unregister service workers
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          registrations.forEach((registration) => {
            registration.unregister();
          });
        });
      }

      term.writeln("  [3/3] Reloading application...\r\n");

      setTimeout(() => {
        term.writeln(
          "\x1b[1;31m+ Update complete. Reloading in 2 seconds...\x1b[0m"
        );
        setTimeout(() => {
          window.location.reload(true);
        }, 2000);
      }, 1000);
    },
    export: (term, args) => {
      term.writeln("\x1b[1;31m> Exporting session transcript...\x1b[0m\r\n");

      const timestamp = new Date().toISOString().split("T")[0];
      const sessionDuration = Math.round(
        (Date.now() - sessionStartTime) / 1000 / 60
      );

      let transcript = "Ty Limoges Portfolio - Session Transcript\n";
      transcript += `Date: ${new Date().toLocaleString()}\n`;
      transcript += `Session Duration: ${sessionDuration} minutes\n`;
      transcript += `Visit #${visitCount}\n`;
      transcript += `\n${"=".repeat(70)}\n\n`;

      commandHistory.forEach((cmd, idx) => {
        transcript += `[${idx + 1}] ${cmd}\n`;
      });

      transcript += `\n${"=".repeat(70)}\n`;
      transcript += `\nTotal Commands: ${commandHistory.length}\n`;

      const blob = new Blob([transcript], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tylimoges-session-${timestamp}.txt`;
      a.click();
      URL.revokeObjectURL(url);

      term.writeln(
        `\x1b[1;31m+ Session exported to: tylimoges-session-${timestamp}.txt\x1b[0m`
      );
      term.writeln(
        `  Commands: ${commandHistory.length} | Duration: ${sessionDuration}m`
      );
    },
    stats: (term, args) => {
      term.writeln(
        "\x1b[1;31m╔════════════════════════════════════════════════════════════╗\x1b[0m"
      );
      term.writeln(
        "\x1b[1;31m║           PORTFOLIO ANALYTICS DASHBOARD                   ║\x1b[0m"
      );
      term.writeln(
        "\x1b[1;31m╚════════════════════════════════════════════════════════════╝\x1b[0m\r\n"
      );

      const sessionDuration = Math.round(
        (Date.now() - sessionStartTime) / 1000 / 60
      );

      term.writeln("\x1b[1;31m SESSION METRICS:\x1b[0m");
      term.writeln(`  Visit Number:      #${visitCount}`);
      term.writeln(`  Session Duration:  ${sessionDuration} minutes`);
      term.writeln(`  Commands Executed: ${commandHistory.length}`);
      term.writeln(
        `  History Saved:     ${commandHistory.slice(-50).length} (last 50)\r\n`
      );

      term.writeln("\x1b[1;31m COMMAND USAGE (Top 10):\x1b[0m");
      const sorted = Object.entries(commandUsageStats)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      if (sorted.length > 0) {
        const maxCount = sorted[0][1];
        sorted.forEach(([cmd, count], idx) => {
          const barLength = Math.round((count / maxCount) * 30);
          const bar = "█".repeat(barLength) + "░".repeat(30 - barLength);
          term.writeln(
            `  ${(idx + 1).toString().padStart(2)}. ${cmd.padEnd(
              15
            )} ${bar} ${count}`
          );
        });
      } else {
        term.writeln("  No commands tracked yet");
      }

      term.writeln("\r\n\x1b[1;31m PERSISTENCE DATA:\x1b[0m");
      term.writeln(`  Aliases:          ${Object.keys(aliases).length}`);
      term.writeln(`  Installed Pkgs:   ${installedPackages.length}`);
      term.writeln(`  Custom Theme:     ${customTheme ? "Yes" : "No"}`);

      term.writeln(
        "\r\n\x1b[1;31mTip: Use 'export' to download full session transcript\x1b[0m"
      );
    },
    coffee: (term, args) => {
      term.writeln("\x1b[1;31m Brewing virtual coffee...\x1b[0m");
      setTimeout(() => {
        term.writeln(
          "\r\n\x1b[1;31m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m"
        );
        term.writeln("\x1b[1;31m  HTTP 418: I'm a teapot  🫖\x1b[0m");
        term.writeln(
          "\x1b[1;31m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m"
        );
        term.writeln("");
        term.writeln("  The requested entity body is short and stout.");
        term.writeln("  Tip me over and pour me out.");
        term.writeln("");
        term.writeln(
          "\x1b[1;31m  (RFC 2324 - Hyper Text Coffee Pot Control Protocol)\x1b[0m"
        );
      }, 1500);
    },
    blog: (term, args) => {
      term.writeln("\x1b[1;31m\n📝 LATEST BLOG POSTS\x1b[0m\r\n");

      term.writeln(
        "\x1b[1;31m[1] Building Syn_OS: A Journey into Kernel Development\x1b[0m"
      );
      term.writeln("    \x1b[1;31m├─\x1b[0m Published: October 2024");
      term.writeln(
        "    \x1b[1;31m├─\x1b[0m Topic: Systems Programming, Kernel Development"
      );
      term.writeln(
        "    \x1b[1;31m└─\x1b[0m \x1b[4mhttps://shelldiablo33.substack.com/p/synos-kernel\x1b[0m\r\n"
      );

      term.writeln(
        "\x1b[1;31m[2] Red Team Certification Roadmap: A Strategic Analysis\x1b[0m"
      );
      term.writeln("    \x1b[1;31m├─\x1b[0m Published: September 2024");
      term.writeln(
        "    \x1b[1;31m├─\x1b[0m Topic: Career Planning, Offensive Security"
      );
      term.writeln(
        "    \x1b[1;31m└─\x1b[0m \x1b[4mhttps://shelldiablo33.substack.com/p/red-team-roadmap\x1b[0m\r\n"
      );

      term.writeln(
        "\x1b[1;31m[3] Healthcare AI Security: Prompt Injection Vulnerabilities\x1b[0m"
      );
      term.writeln("    \x1b[1;31m├─\x1b[0m Published: August 2024");
      term.writeln(
        "    \x1b[1;31m├─\x1b[0m Topic: AI/ML Security, Healthcare Technology"
      );
      term.writeln(
        "    \x1b[1;31m└─\x1b[0m \x1b[4mhttps://shelldiablo33.substack.com/p/ai-security\x1b[0m\r\n"
      );

      term.writeln(
        "\x1b[1;31m Read more at: \x1b[4mshelldiablo33.substack.com\x1b[0m\x1b[0m"
      );
      term.writeln(
        "\x1b[1;31m\nNew posts published weekly on cybersecurity research and systems programming\x1b[0m\r\n"
      );
    },
    coffee: (term, args) => {
      term.writeln("\x1b[1;31m");
      term.writeln("   (  )   (   )  )");
      term.writeln("    ) (   )  (  (");
      term.writeln("    ( )  (    ) )");
      term.writeln("    _____________");
      term.writeln("   <_____________> ___");
      term.writeln("   |             |/ _ \\");
      term.writeln("   |               | | |");
      term.writeln("   |               |_| |");
      term.writeln(" __|_______________|\\___/");
      term.writeln("\x1b[0m");
      term.writeln("\x1b[1;31m Coffee brewing...\x1b[0m");

      let progress = 0;
      const brewInterval = setInterval(() => {
        progress += 20;
        term.write(
          `\r\x1b[1;31m[${"█".repeat(progress / 5)}${" ".repeat(
            20 - progress / 5
          )}] ${progress}%\x1b[0m`
        );

        if (progress >= 100) {
          clearInterval(brewInterval);
          term.writeln("\n\x1b[1;31m+ Coffee ready! Time to code.\x1b[0m\r\n");
          term.writeln(
            "\x1b[1;31mFun fact: This portfolio was built on ~47 cups of coffee \x1b[0m\r\n"
          );
        }
      }, 300);
    },
    "hack-the-planet": (term, args) => {
      term.writeln("\x1b[1;31m");
      term.writeln("  ██╗  ██╗ █████╗  ██████╗██╗  ██╗");
      term.writeln("  ██║  ██║██╔══██╗██╔════╝██║ ██╔╝");
      term.writeln("  ███████║███████║██║     █████╔╝ ");
      term.writeln("  ██╔══██║██╔══██║██║     ██╔═██╗ ");
      term.writeln("  ██║  ██║██║  ██║╚██████╗██║  ██╗");
      term.writeln("  ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝");
      term.writeln("");
      term.writeln("  ████████╗██╗  ██╗███████╗");
      term.writeln("  ╚══██╔══╝██║  ██║██╔════╝");
      term.writeln("     ██║   ███████║█████╗  ");
      term.writeln("     ██║   ██╔══██║██╔══╝  ");
      term.writeln("     ██║   ██║  ██║███████╗");
      term.writeln("     ╚═╝   ╚═╝  ╚═╝╚══════╝");
      term.writeln("");
      term.writeln("  ██████╗ ██╗      █████╗ ███╗   ██╗███████╗████████╗");
      term.writeln("  ██╔══██╗██║     ██╔══██╗████╗  ██║██╔════╝╚══██╔══╝");
      term.writeln("  ██████╔╝██║     ███████║██╔██╗ ██║█████╗     ██║   ");
      term.writeln("  ██╔═══╝ ██║     ██╔══██║██║╚██╗██║██╔══╝     ██║   ");
      term.writeln("  ██║     ███████╗██║  ██║██║ ╚████║███████╗   ██║   ");
      term.writeln("  ╚═╝     ╚══════╝╚═╝  ╚═╝╚═╝  ╚═══╝╚══════╝   ╚═╝   ");
      term.writeln("\x1b[0m");
      term.writeln("\x1b[1;31m");
      term.writeln('  "Hack the Planet!" - Hackers (1995)');
      term.writeln("\x1b[0m");
      term.writeln("\x1b[1;31m  You found the easter egg! \x1b[0m");
      term.writeln(
        "\x1b[1;31m  For actual hacking projects, type 'synos' or 'pursuits'\x1b[0m\r\n"
      );
    },
    matrix: (term, args) => {
      term.writeln("\x1b[1;31m");
      term.writeln("  ╔═══════════════════════════════════════════╗");
      term.writeln("  ║  Wake up, Neo...                          ║");
      term.writeln("  ║  The Matrix has you...                    ║");
      term.writeln("  ║  Follow the white rabbit.                 ║");
      term.writeln("  ╚═══════════════════════════════════════════╝");
      term.writeln("\x1b[0m\r\n");

      term.writeln(
        "\x1b[1;31m  [1] Take the red pill - See Syn_OS (synos)\x1b[0m"
      );
      term.writeln(
        "\x1b[1;31m  [2] Take the blue pill - Return to safety (clear)\x1b[0m\r\n"
      );

      // Matrix rain effect (simplified)
      term.writeln("\x1b[1;31m");
      const chars = "01アイウエオカキクケコサシスセソタチツテト";
      let rainLine = "";
      for (let i = 0; i < 60; i++) {
        rainLine += chars[Math.floor(Math.random() * chars.length)] + " ";
      }
      term.writeln("  " + rainLine);
      term.writeln("\x1b[0m");

      term.writeln(
        '\x1b[1;31m  "Unfortunately, no one can be told what the Matrix is.'
      );
      term.writeln(
        '   You have to see it for yourself." - Morpheus\x1b[0m\r\n'
      );
    },
    hack: (term, args) => {
      const frames = [
        "INITIALIZING CYBERDECK...",
        "LOADING EXPLOIT MODULES...",
        "BYPASSING FIREWALL...",
        "CRACKING ENCRYPTION...",
        "ACCESSING MAINFRAME...",
        "DOWNLOADING DATABASE...",
        "COVERING TRACKS...",
      ];

      let frameIndex = 0;
      const animate = () => {
        if (frameIndex < frames.length) {
          term.write("\r\x1b[K");
          term.write(
            `\x1b[1;31m[${".".repeat(frameIndex + 1)}] ${
              frames[frameIndex]
            }\x1b[0m`
          );
          frameIndex++;
          setTimeout(animate, 300);
        } else {
          term.writeln("\r\n");
          term.writeln(
            "\x1b[1;31m╔════════════════════════════════════════╗\x1b[0m"
          );
          term.writeln(
            "\x1b[1;31m║   ACCESS GRANTED - TLIMOGES MODE    ║\x1b[0m"
          );
          term.writeln(
            "\x1b[1;31m╚════════════════════════════════════════╝\x1b[0m\r\n"
          );
          term.writeln(
            "  Just kidding! This is a portfolio, not a hacking simulator."
          );
          term.writeln("  But if you want to see real cybersecurity work:");
          term.writeln("");
          term.writeln(
            "  \x1b[1;31m→ Type 'synos' for my 452,000+ line OS project\x1b[0m"
          );
          term.writeln(
            "  \x1b[1;31m→ Type 'pursuits' for my CTF profiles\x1b[0m"
          );
          term.writeln(
            "  \x1b[1;31m→ Type 'blog' for security research\x1b[0m"
          );
        }
      };
      term.writeln("");
      animate();
    },
    konami: (term, args) => {
      term.writeln("\x1b[1;31m");
      term.writeln("    ╔══════════════════════════════════════════╗");
      term.writeln("    ║   ACHIEVEMENT UNLOCKED!             ║");
      term.writeln("    ║  Konami Code Master                     ║");
      term.writeln("    ╚══════════════════════════════════════════╝");
      term.writeln("\x1b[0m");
      term.writeln("  You found the secret! Here's a classic:");
      term.writeln("");
      term.writeln(
        "\x1b[1;31m      ___           ___           ___     \x1b[0m"
      );
      term.writeln(
        "\x1b[1;31m     /\\__\\         /\\  \\         /\\__\\    \x1b[0m"
      );
      term.writeln(
        "\x1b[1;31m    /::|  |       /::\\  \\       /:/  /    \x1b[0m"
      );
      term.writeln(
        "\x1b[1;31m   /:|:|  |      /:/\\:\\  \\     /:/__/     \x1b[0m"
      );
      term.writeln(
        "\x1b[1;31m  /:/|:|__|__   /::\\~\\:\\  \\   /::\\__\\____ \x1b[0m"
      );
      term.writeln(
        "\x1b[1;31m /:/ |::::\\__\\ /:/\\:\\ \\:\\__\\ /:/\\:::::\\__\\\x1b[0m"
      );
      term.writeln(
        "\x1b[1;31m \\/__/~~/:/  / \\/__\\:\\/:/  / \\/_|:|~~|~   \x1b[0m"
      );
      term.writeln(
        "\x1b[1;31m       /:/  /       \\::/  /     |:|  |    \x1b[0m"
      );
      term.writeln(
        "\x1b[1;31m      /:/  /        /:/  /      |:|  |    \x1b[0m"
      );
      term.writeln(
        "\x1b[1;31m     /:/  /        /:/  /       |:|  |    \x1b[0m"
      );
      term.writeln(
        "\x1b[1;31m     \\/__/         \\/__/         \\|__|    \x1b[0m"
      );
      term.writeln("");
      term.writeln(
        "\x1b[1;31m  Congrats, hacker! You know your way around a terminal.\x1b[0m"
      );
    },
    snake: (term, args) => {
      term.writeln("\x1b[1;31m TERMINAL SNAKE GAME \x1b[0m\r\n");
      term.writeln(
        "Coming soon! This would be a full snake game implementation."
      );
      term.writeln("For now, here's a snake:\r\n");
      term.writeln("\x1b[1;31m");
      term.writeln("         ~^~^~^~");
      term.writeln("       ~^~^~^~^~^~");
      term.writeln("     ~^~^~^~^~^~^~");
      term.writeln("       @_)~^~^~^~    <-- Snek says hi!");
      term.writeln("\x1b[0m");
      term.writeln(
        "\x1b[1;31mImplementation idea: Use WASD controls + requestAnimationFrame\x1b[0m"
      );
    },
  };

  // --- Auto-run command from URL hash on load ---
  if (window.location.hash) {
    const cmdFromHash = window.location.hash.substring(1);
    if (cmdFromHash) {
      term.write(cmdFromHash);
      runCommand(cmdFromHash);
    }
  }
});
