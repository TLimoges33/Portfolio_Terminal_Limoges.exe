document.addEventListener("DOMContentLoaded", async () => {
  // --- Terminal Initialization ---
  const term = new Terminal({
    cursorBlink: true,
    fontFamily: "'Menlo', 'Consolas', 'monospace'",
    theme: {
      background: "#101010",
      foreground: "#F0F0F0",
      green: "#39FF14",
      yellow: "#F8D808",
      blue: "#00BFFF",
      red: "#ca2323ff",
      purple: "#D420FF",
      cyan: "#00FFFF",
      orange: "#FFAC1C",
    },
  });
  const fitAddon = new FitAddon.FitAddon();
  term.loadAddon(fitAddon);
  term.open(document.getElementById("terminal"));
  fitAddon.fit();
  window.addEventListener("resize", () => fitAddon.fit());

  // --- State Management ---
  const PROMPT = "\x1b[1;32m[Ty@SNHU ~]$\x1b[0m ";
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

  // --- Load Command Data ---
  try {
    const response = await fetch("js/data/commands.json");
    commands = await response.json();
  } catch (error) {
    term.writeln(
      "\x1b[1;31mError: Could not load js/data/commands.json\x1b[0m"
    );
  }

  // --- Welcome Message ---
  const welcomeMessages = [
    "Welcome to TylerLimoges.sh v6.0 // PRODUCTION DEPLOYMENT COMPLETE\r\n",
    "This portfolio is an interactive shell. All project documentation, research, and",
    "scripts are version-controlled and maintained in the primary repository.\r\n",
    "> GitHub: \x1b[4mhttps://github.com/TLimoges33/SynapticOS-Docs\x1b[0m\r\n\r\n",
    "Type 'help' for a list of available commands.\r\n",
    "-------------------------------------------------------------------------------\r\n\r\n",
  ];
  welcomeMessages.forEach((msg) => term.write(msg));
  term.write(PROMPT);

  const runCommand = async (cmd) => {
    term.writeln("");
    if (cmd.trim()) {
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

  // --- Core Command Execution Logic ---
  const executeCommand = async (input) => {
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
        "\r\n\x1b[1;36m╔════════════ COMMAND PALETTE ════════════╗\x1b[0m"
      );
      term.writeln(
        "\x1b[1;36m║ Quick Access to All Commands            ║\x1b[0m"
      );
      term.writeln(
        "\x1b[1;36m╚═════════════════════════════════════════╝\x1b[0m\r\n"
      );
      const cmdList = Object.keys(commands).sort();
      cmdList.forEach((cmd, idx) => {
        if (idx % 3 === 0 && idx > 0) term.writeln("");
        term.write(`  ${cmd.padEnd(15)}`);
        if ((idx + 1) % 3 === 0) term.writeln("");
      });
      term.writeln("\r\n\x1b[90mType any command name to execute it\x1b[0m");
      term.write(PROMPT + currentInput);
      return;
    } else if (domEvent.ctrlKey && key === "d") {
      // Ctrl+D: Logout effect
      domEvent.preventDefault();
      term.writeln("\r\n\x1b[1;33m> Logging out...\x1b[0m");
      setTimeout(() => {
        term.writeln("\x1b[1;32m✓ Session saved\x1b[0m");
        term.writeln("\x1b[90mThanks for visiting! Refresh to restart.\x1b[0m");
      }, 500);
      return;
    } else if (domEvent.ctrlKey && key === "r") {
      // Ctrl+R: Reverse history search
      domEvent.preventDefault();
      term.write("\r\n\x1b[1;33m(reverse-i-search): \x1b[0m");
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
      // Tab
      domEvent.preventDefault();
      const matchingCommands = Object.keys(commands).filter((c) =>
        c.startsWith(currentInput)
      );
      if (matchingCommands.length === 1) {
        term.write(matchingCommands[0].substring(currentInput.length));
        currentInput = matchingCommands[0];
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
      if (args.length === 0) {
        term.writeln("Usage: theme [preset|set color value]");
        term.writeln("Presets: dark, light, matrix, cyberpunk");
        term.writeln("Set: theme set background #000000");
        return;
      }

      const presets = {
        dark: { background: "#101010", foreground: "#F0F0F0" },
        light: { background: "#F0F0F0", foreground: "#101010" },
        matrix: { background: "#000000", foreground: "#00FF00" },
        cyberpunk: { background: "#0a0e27", foreground: "#00ffff" },
      };

      if (args[0] === "set" && args.length === 3) {
        if (!customTheme) customTheme = {};
        customTheme[args[1]] = args[2];
        localStorage.setItem("customTheme", JSON.stringify(customTheme));
        term.options.theme[args[1]] = args[2];
        term.writeln(`Theme updated: ${args[1]} = ${args[2]}`);
      } else if (presets[args[0]]) {
        Object.assign(term.options.theme, presets[args[0]]);
        customTheme = presets[args[0]];
        localStorage.setItem("customTheme", JSON.stringify(customTheme));
        term.writeln(`Theme changed to: ${args[0]}`);
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
            `  \x1b[1;32m${name.padEnd(14, " ")}\x1b[0m - ${
              details.description
            }`
          );
        }
      });
    },
    whoami: (term, args) => {
      term.writeln("> Executing ./get-bio.sh...\r\n");
      term.writeln("Hello, I'm \x1b[1;32mTy Limoges\x1b[0m (DiabloRain).\r\n");
      term.writeln(
        "I am a cybersecurity professional-in-training with a proven background in high-stakes incident response and critical infrastructure management. My current focus is \x1b[1;33mSyn_OS\x1b[0m, an experimental security-focused Linux distribution where I'm developing custom kernel schedulers and security automation at the systems level.\r\n"
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
        "\x1b[1;33m// UMass Memorial Medical Center: Anesthesia Technician II (SysAdmin for Critical Infrastructure)\x1b[0m"
      );
      term.writeln("\x1b[1;33m// 04/2022 – Present\x1b[0m");
      term.writeln(
        "- \x1b[1;32mINFRASTRUCTURE INTEGRITY:\x1b[0m Ensured 100% uptime of critical life-support (Avance CS2) and pharmaceutical dispensing (Pyxis) systems through rigorous inspection, troubleshooting, and real-time diagnostics."
      );
      term.writeln(
        "- \x1b[1;32mLEADERSHIP:\x1b[0m Trained and supervised a team of 13 technicians on operational security protocols for medical technology in a Level 1 Trauma Center."
      );
      term.writeln(
        "- \x1b[1;32mCOMPLIANCE & DATA HANDLING:\x1b[0m Managed Protected Health Information (PHI) within EPIC EMR, enforcing strict HIPAA controls during high-stress incident response scenarios.\r\n"
      );
      term.writeln(
        "\x1b[1;33m// St. Vincent Hospital: Critical Care Technician (Incident Responder)\x1b[0m"
      );
      term.writeln("\x1b[1;33m// 01/2021 – 04/2022\x1b[0m");
      term.writeln(
        "- \x1b[1;32mINCIDENT RESPONSE:\x1b[0m Executed high-priority IR protocols in a dynamic Level 3 Trauma Center, providing critical support and stabilization for high-acuity patients."
      );
      term.writeln(
        "- \x1b[1;32mSYSTEM OPERATIONS:\x1b[0m Operated and maintained diverse point-of-care diagnostic devices, ensuring data accuracy and availability for critical decision-making."
      );
    },
    education: (term, args) => {
      term.writeln("> grep -i 'Credentials' /var/log/qualifications.log\r\n");
      term.writeln("\x1b[1;33m//--- ACADEMIC ---//\x1b[0m");
      term.writeln(
        "- \x1b[1;32mBachelor of Science, Cybersecurity\x1b[0m | Southern New Hampshire University"
      );
      term.writeln("  - Expected Graduation: October 2027");
      term.writeln(
        "  - Status: \x1b[1;32m3.9 GPA, Honor Roll (Last 3 Terms)\x1b[0m\r\n"
      );
      term.writeln(
        "- \x1b[1;32mCS50x: Introduction to Computer Science\x1b[0m | Harvard University (edX)"
      );
      term.writeln(
        "  - Coursework: C, Python, SQL, Memory Management, Data Structures, Algorithms.\r\n"
      );
      term.writeln("\x1b[1;33m//--- CERTIFICATIONS (IN PROGRESS) ---//\x1b[0m");
      term.writeln(
        "- \x1b[33m[ACTIVE]\x1b[0m CompTIA Network+ & Security+ (Target: Fall 2025)"
      );
      term.writeln(
        "- \x1b[33m[ACTIVE]\x1b[0m AWS Certified Security (Target: Winter 2025)"
      );
      term.writeln(
        "- \x1b[36m[STUDYING]\x1b[0m PNPT (Practical Network Penetration Tester)"
      );
      term.writeln(
        "- \x1b[36m[STUDYING]\x1b[0m eJPT (eLearnSecurity Junior Penetration Tester)"
      );
      term.writeln("- \x1b[31m[LONG-TERM]\x1b[0m OSCP, OSEP\r\n");
      term.writeln(
        "\x1b[1;33m//--- MEDICAL CERTIFICATIONS (CURRENT) ---//\x1b[0m"
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
      term.writeln("\x1b[1;33m//=== ACTIVE DEVELOPMENT ===//\x1b[0m\r\n");
      term.writeln(
        "  \x1b[1;33m[1] Syn_OS - Security-Focused Linux Distribution\x1b[0m"
      );
      term.writeln(
        "      ~18k lines of C/Rust/Python | Custom kernel schedulers & security automation"
      );
      term.writeln(
        "      > \x1b[4mhttps://github.com/TLimoges33/Syn_OS\x1b[0m (Private - Available on request)"
      );
      term.writeln(
        "      Type '\x1b[1;36msynos\x1b[0m' for technical deep-dive\r\n"
      );
      term.writeln(
        "  \x1b[1;32m[2] LifeRPG v2.0 - Gamified Productivity & Habit Tracker\x1b[0m"
      );
      term.writeln(
        "      Personal productivity system with RPG mechanics and AI coaching\r\n"
      );
      term.writeln(
        "  \x1b[1;32m[3] Interactive Terminal Portfolio (This Site)\x1b[0m"
      );
      term.writeln(
        "      PWA with xterm.js, CI/CD, Vitest testing, WASM demos"
      );
      term.writeln(
        "      > \x1b[4mhttps://github.com/TLimoges33/portfolio\x1b[0m\r\n"
      );
      term.writeln("\x1b[1;33m//=== RESEARCH & DEVELOPMENT ===//\x1b[0m");
      term.writeln(
        "  \x1b[36m[WIP]\x1b[0m Automated Red Team Lab (Terraform + Ansible)"
      );
      term.writeln(
        "  \x1b[36m[WIP]\x1b[0m EDR Evasion Research - Direct Syscall PoC (C/Assembly)"
      );
      term.writeln(
        "  \x1b[36m[WIP]\x1b[0m Custom Malleable C2 Profile for Cobalt Strike"
      );
      term.writeln(
        "  \x1b[36m[RESEARCH]\x1b[0m Healthcare AI Security (LLM Prompt Injection)\r\n"
      );
      term.writeln("\x1b[1;33m//=== ACTIVE LEARNING & PRACTICE ===//\x1b[0m");
      term.writeln(
        "  \x1b[32m[CTF]\x1b[0m HackTheBox | TryHackMe | OverTheWire Wargames"
      );
      term.writeln(
        "  \x1b[32m[CTF]\x1b[0m HackAPrompt (DiabloRain) - AI/LLM Security"
      );
      term.writeln(
        "  \x1b[32m[STUDY]\x1b[0m freeCodeCamp - Full-stack & web security\r\n"
      );
      term.writeln(
        "Type '\x1b[1;36mpursuits\x1b[0m' for freelance work & bug bounty programs"
      );
    },
    synos: (term, args) => {
      // Handle special demo flags
      if (args[0] === "--demo") {
        term.writeln(
          "\x1b[1;36m╔════════════════════════════════════════════════════╗\x1b[0m"
        );
        term.writeln(
          "\x1b[1;36m║        SYN_OS BOOT SEQUENCE SIMULATION            ║\x1b[0m"
        );
        term.writeln(
          "\x1b[1;36m╚════════════════════════════════════════════════════╝\x1b[0m\r\n"
        );

        const bootSequence = [
          { msg: "[ 0.000000] Initializing cgroup subsys cpuset", delay: 100 },
          { msg: "[ 0.000000] Initializing cgroup subsys cpu", delay: 100 },
          {
            msg: "[ 0.000000] Linux version 6.1.0-syn (diablorain@synos)",
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
            msg: "[ 1.500000] \x1b[1;32mBOOT COMPLETE - Welcome to SYN_OS v1.0\x1b[0m",
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
              "\r\n\x1b[90mThis is a simulation of the actual SYN_OS boot process.\x1b[0m"
            );
          }
        };
        displayNext();
        return;
      }

      if (args[0] === "--memory") {
        term.writeln(
          "\x1b[1;36m╔════════════════════════════════════════════════════╗\x1b[0m"
        );
        term.writeln(
          "\x1b[1;36m║     AI MEMORY MANAGER VISUALIZATION (13k+ LOC)    ║\x1b[0m"
        );
        term.writeln(
          "\x1b[1;36m╚════════════════════════════════════════════════════╝\x1b[0m\r\n"
        );

        term.writeln("\x1b[1;33mMEMORY REGIONS:\x1b[0m\r\n");
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

        term.writeln("\x1b[1;33mAI FEATURES:\x1b[0m");
        term.writeln("  • Predictive page prefetching");
        term.writeln("  • Neural pattern recognition for memory access");
        term.writeln("  • Adaptive cache management");
        term.writeln("  • Consciousness-aware allocation\r\n");

        term.writeln(
          "\x1b[90mImplemented in ai_memory_manager.c (13,027 lines)\x1b[0m"
        );
        return;
      }

      if (args[0] === "--syscalls") {
        term.writeln(
          "\x1b[1;36m╔════════════════════════════════════════════════════╗\x1b[0m"
        );
        term.writeln(
          "\x1b[1;36m║        43 CUSTOM SYSTEM CALLS - OVERVIEW          ║\x1b[0m"
        );
        term.writeln(
          "\x1b[1;36m╚════════════════════════════════════════════════════╝\x1b[0m\r\n"
        );

        term.writeln("\x1b[1;33m[AI & Consciousness]\x1b[0m");
        term.writeln("  sys_consciousness_init()  - Initialize AI engine");
        term.writeln("  sys_neural_query()        - Query neural network");
        term.writeln("  sys_ai_schedule()         - AI process scheduling\r\n");

        term.writeln("\x1b[1;33m[Memory Management]\x1b[0m");
        term.writeln("  sys_smart_alloc()         - AI-guided allocation");
        term.writeln("  sys_memory_predict()      - Prefetch predictions");
        term.writeln("  sys_cache_optimize()      - Neural cache tuning\r\n");

        term.writeln("\x1b[1;33m[Security]\x1b[0m");
        term.writeln("  sys_ebpf_attach()         - eBPF program loading");
        term.writeln("  sys_security_scan()       - Real-time threat scan");
        term.writeln("  sys_sandbox_create()      - Isolated execution\r\n");

        term.writeln("\x1b[1;33m[Process Control]\x1b[0m");
        term.writeln("  sys_quantum_adjust()      - Dynamic time slicing");
        term.writeln("  sys_priority_learn()      - ML-based priority");
        term.writeln("  sys_task_migrate()        - Cross-CPU migration\r\n");

        term.writeln("\x1b[90m+ 31 more custom syscalls...\x1b[0m");
        term.writeln(
          "\x1b[90mFull list: github.com/TLimoges33/Syn_OS/docs/syscalls.md\x1b[0m"
        );
        return;
      }

      // Original synos command output
      term.writeln("> cat /docs/synos-technical-summary.md\r\n");
      term.writeln("\x1b[1;33m=== SYN_OS: TECHNICAL DEEP-DIVE ===\x1b[0m\r\n");
      term.writeln(
        "\x1b[1;32mProject Status:\x1b[0m v1.0 Complete (October 2025)"
      );
      term.writeln(
        "\x1b[1;32mRepository:\x1b[0m Public - github.com/TLimoges33/Syn_OS"
      );
      term.writeln(
        "\x1b[1;32mCodebase:\x1b[0m 452,000+ lines (Rust, C, Python, Shell)"
      );
      term.writeln(
        "\x1b[1;32mDevelopment:\x1b[0m 6 months intensive (310+ commits, 4 contributors)\r\n"
      );

      term.writeln("\x1b[1;33m// TECHNICAL ACHIEVEMENTS //\x1b[0m\r\n");

      term.writeln("\x1b[1;36m[1] KERNEL-LEVEL SYSTEMS PROGRAMMING\x1b[0m");
      term.writeln(
        "    - AI-enhanced process scheduler (consciousness_scheduler)"
      );
      term.writeln(
        "    - Neural memory manager (ai_memory_manager.c - 13,000+ lines)"
      );
      term.writeln("    - Custom system call interface (43 syscalls)");
      term.writeln("    - eBPF security framework");
      term.writeln("    - AI consciousness engine (10,611 lines)\r\n");

      term.writeln("\x1b[1;36m[2] SECURITY TOOLING INTEGRATION\x1b[0m");
      term.writeln("    - 500+ integrated security tools");
      term.writeln("    - ParrotOS/Kali security suite");
      term.writeln("    - Exploitation frameworks");
      term.writeln("    - Forensics & network analysis tools\r\n");

      term.writeln("\x1b[1;36m[3] BUILD INFRASTRUCTURE\x1b[0m");
      term.writeln("    - Professional Makefile (500+ lines, 20+ targets)");
      term.writeln("    - Multi-language build system (Rust/C/Python/Shell)");
      term.writeln("    - CI/CD workflows");
      term.writeln("    - Docker containerization");
      term.writeln("    - Comprehensive testing (175 tests)\r\n");

      term.writeln("\x1b[1;36m[4] SOFTWARE ENGINEERING PRACTICES\x1b[0m");
      term.writeln("    - 992 Rust files (133,649 total lines)");
      term.writeln("    - 8,344 Python files for AI/ML integration");
      term.writeln("    - 565 documentation files");
      term.writeln("    - 310+ commits across 3 months");
      term.writeln(
        "    - Professional project structure (13 root directories)\r\n"
      );

      term.writeln("\x1b[1;33m// SKILLS DEMONSTRATED //\x1b[0m\r\n");
      term.writeln(
        "  \x1b[32m✓\x1b[0m C Programming (kernel-level, 13k+ LOC AI memory manager)"
      );
      term.writeln(
        "  \x1b[32m✓\x1b[0m Rust Systems Programming (992 files, 133k+ LOC)"
      );
      term.writeln(
        "  \x1b[32m✓\x1b[0m Linux Kernel Development (modules, syscalls, eBPF)"
      );
      term.writeln(
        "  \x1b[32m✓\x1b[0m Build Systems (Make, Cargo, complex multi-language)"
      );
      term.writeln(
        "  \x1b[32m✓\x1b[0m Multi-language Integration (Rust/C/Python/Shell)"
      );
      term.writeln(
        "  \x1b[32m✓\x1b[0m Software Architecture (44 workspace crates)"
      );
      term.writeln("  \x1b[32m✓\x1b[0m Git Version Control (310+ commits)");
      term.writeln(
        "  \x1b[32m✓\x1b[0m CI/CD & DevOps (Docker, GitHub Actions)\r\n"
      );

      term.writeln("\x1b[1;33m// HONEST ASSESSMENT //\x1b[0m\r\n");
      term.writeln("\x1b[33mWhat's Real:\x1b[0m");
      term.writeln("  • 452,000+ lines of production code");
      term.writeln("  • Professional development practices (100% compilation)");
      term.writeln(
        "  • Deep systems programming (kernel modules, memory mgmt)"
      );
      term.writeln("  • V1.0 Complete - bootable ISO (12-15GB)\r\n");

      term.writeln("\x1b[33mWhat's Aspirational:\x1b[0m");
      term.writeln("  • AI consciousness is experimental/conceptual");
      term.writeln("  • Neural Darwinism framework is research-oriented");
      term.writeln("  • Not production-ready for enterprise deployment");
      term.writeln("  • Educational OS for learning kernel development\r\n");

      term.writeln(
        "\x1b[1;32m> Key Takeaway:\x1b[0m Demonstrates advanced kernel-level systems"
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

      term.writeln("\r\n\x1b[1;36m💡 TRY INTERACTIVE DEMOS:\x1b[0m");
      term.writeln(
        "  \x1b[36msynos --demo\x1b[0m      Boot sequence animation"
      );
      term.writeln(
        "  \x1b[36msynos --memory\x1b[0m    AI memory manager visualization"
      );
      term.writeln(
        "  \x1b[36msynos --syscalls\x1b[0m  43 custom syscalls overview"
      );
    },
    skills: (term, args) => {
      term.writeln("> grep -r 'expertise' /var/log/skills.db\r\n");

      term.writeln("\x1b[1;33m=== TECHNICAL SKILLS MATRIX ===\x1b[0m\r\n");

      term.writeln("\x1b[1;36m// PROGRAMMING LANGUAGES //\x1b[0m");
      term.writeln(
        "  \x1b[32m●●●●●\x1b[0m Python 3.12 (Scripting, automation, AI/ML, exploit dev)"
      );
      term.writeln(
        "  \x1b[32m●●●●○\x1b[0m JavaScript / Node.js 22 (Web, automation, full-stack)"
      );
      term.writeln(
        "  \x1b[32m●●●●○\x1b[0m C (GCC 14) (Kernel-level, memory mgmt, low-level exploits)"
      );
      term.writeln(
        "  \x1b[32m●●●○○\x1b[0m SQL / PostgreSQL 16 (Database security, injection)"
      );
      term.writeln(
        "  \x1b[32m●●●○○\x1b[0m Rust 1.80 (Systems programming, secure tooling)"
      );
      term.writeln(
        "  \x1b[32m●●●○○\x1b[0m Go 1.23 (Networking tools, concurrency)"
      );
      term.writeln(
        "  \x1b[33m●●○○○\x1b[0m x86-64 Assembly (Malware analysis, exploit dev, reversing)\r\n"
      );

      term.writeln("\x1b[1;36m// SYSTEMS & KERNEL DEVELOPMENT //\x1b[0m");
      term.writeln("  \x1b[32m●●●●○\x1b[0m Linux Internals & System Calls");
      term.writeln("  \x1b[32m●●●○○\x1b[0m Memory Management & Pointers");
      term.writeln(
        "  \x1b[32m●●●○○\x1b[0m Process Scheduling & Kernel Modules"
      );
      term.writeln(
        "  \x1b[32m●●●○○\x1b[0m Build Systems (Make, CMake, Cargo)\r\n"
      );

      term.writeln("\x1b[1;36m// SECURITY & PENETRATION TESTING //\x1b[0m");
      term.writeln("  \x1b[33m●●●●○\x1b[0m Network Security & Protocols");
      term.writeln(
        "  \x1b[33m●●●○○\x1b[0m Offensive Security Tools (Metasploit, Burp, etc)"
      );
      term.writeln(
        "  \x1b[33m●●●○○\x1b[0m Web Application Security (OWASP Top 10)"
      );
      term.writeln(
        "  \x1b[33m●●○○○\x1b[0m Binary Exploitation & Reverse Engineering"
      );
      term.writeln("  \x1b[33m●●○○○\x1b[0m EDR Evasion & Red Team Techniques");
      term.writeln(
        "  \x1b[33m●●●●○\x1b[0m Security Tool Integration & Automation\r\n"
      );

      term.writeln("\x1b[1;36m// INFRASTRUCTURE & DEVOPS //\x1b[0m");
      term.writeln("  \x1b[33m●●●●○\x1b[0m Linux System Administration");
      term.writeln("  \x1b[33m●●●●○\x1b[0m Git & Version Control");
      term.writeln("  \x1b[33m●●●●○\x1b[0m CI/CD (GitHub Actions, Testing)");
      term.writeln("  \x1b[33m●●●○○\x1b[0m Shell Scripting (Bash)");
      term.writeln("  \x1b[33m●●○○○\x1b[0m Docker & Containerization");
      term.writeln("  \x1b[33m●●○○○\x1b[0m Terraform (IaC - Learning)");
      term.writeln(
        "  \x1b[33m●●○○○\x1b[0m Ansible (Configuration Mgmt - Learning)"
      );
      term.writeln(
        "  \x1b[33m●●●○○\x1b[0m Networking (TCP/IP, VPN, Routing)\r\n"
      );

      term.writeln("\x1b[1;36m// DOMAIN EXPERTISE //\x1b[0m");
      term.writeln("  \x1b[32m●●●●●\x1b[0m Critical Infrastructure Operations");
      term.writeln("  \x1b[32m●●●●●\x1b[0m Incident Response (Medical/Trauma)");
      term.writeln("  \x1b[32m●●●●○\x1b[0m Compliance (HIPAA, PHI Handling)");
      term.writeln("  \x1b[32m●●●●○\x1b[0m High-Pressure Decision Making");
      term.writeln("  \x1b[32m●●●●○\x1b[0m Team Leadership & Training\r\n");

      term.writeln("\x1b[1;33m// CERTIFICATIONS & LEARNING PATH //\x1b[0m");
      term.writeln("  \x1b[33m[ACTIVE]\x1b[0m CompTIA Network+ & Security+");
      term.writeln(
        "  \x1b[36m[STUDYING]\x1b[0m PNPT (Practical Network Penetration Tester)"
      );
      term.writeln(
        "  \x1b[36m[STUDYING]\x1b[0m eJPT (eLearnSecurity Junior PT)"
      );
      term.writeln("  \x1b[31m[LONG-TERM]\x1b[0m OSCP, OSEP\r\n");

      term.writeln("\x1b[1;32m> Unique Value Proposition:\x1b[0m");
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
        "\x1b[1;33m=== CURRENT PURSUITS & OPPORTUNITIES ===\x1b[0m\r\n"
      );

      term.writeln("\x1b[1;36m// FREELANCE PLATFORMS (LAUNCHING) //\x1b[0m");
      term.writeln(
        "  \x1b[32m[ACTIVE]\x1b[0m Upwork - Security consulting, pentesting, scripting"
      );
      term.writeln(
        "  \x1b[32m[ACTIVE]\x1b[0m Fiverr - Security tools, automation, web scraping"
      );
      term.writeln(
        "  \x1b[32m[ACTIVE]\x1b[0m Freelancer - Python/JS development, security audits\r\n"
      );

      term.writeln("\x1b[1;36m// BUG BOUNTY PROGRAMS //\x1b[0m");
      term.writeln(
        "  \x1b[33m[JOINING]\x1b[0m HackerOne - Web app security, API testing"
      );
      term.writeln(
        "  \x1b[33m[JOINING]\x1b[0m Bugcrowd - Network security, mobile apps"
      );
      term.writeln(
        "  \x1b[33m[JOINING]\x1b[0m Synack - Private bug bounty platform"
      );
      term.writeln(
        "  \x1b[33m[JOINING]\x1b[0m Intigriti - European-focused security research\r\n"
      );

      term.writeln("\x1b[1;36m// CTF COMPETITIONS & PRACTICE //\x1b[0m");
      term.writeln(
        "  \x1b[32m[ACTIVE]\x1b[0m HackTheBox - \x1b[4mhttps://app.hackthebox.com/profile/227499\x1b[0m"
      );
      term.writeln(
        "  \x1b[32m[ACTIVE]\x1b[0m TryHackMe - \x1b[4mhttps://tryhackme.com/p/TLimoges33\x1b[0m"
      );
      term.writeln(
        "  \x1b[32m[ACTIVE]\x1b[0m OverTheWire Wargames - Linux, networking, exploits"
      );
      term.writeln(
        "  \x1b[32m[ACTIVE]\x1b[0m HackAPrompt (DiabloRain) - AI/LLM security challenges"
      );
      term.writeln(
        "  \x1b[32m[ACTIVE]\x1b[0m freeCodeCamp - Full-stack & web security\r\n"
      );

      term.writeln("\x1b[1;36m// SPECIALIZED SKILLS FOR HIRE //\x1b[0m");
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

      term.writeln("\x1b[1;33m// AVAILABILITY //\x1b[0m");
      term.writeln(
        "  \x1b[32mStatus:\x1b[0m Open to freelance projects & bug bounty work"
      );
      term.writeln(
        "  \x1b[32mFocus:\x1b[0m Security, automation, systems programming"
      );
      term.writeln("  \x1b[32mRate:\x1b[0m Competitive, project-based pricing");
      term.writeln(
        "  \x1b[32mTimeline:\x1b[0m Flexible scheduling around full-time studies\r\n"
      );

      term.writeln("\x1b[1;32m> Contact:\x1b[0m");
      term.writeln("  Email: \x1b[4mmogeem33@gmail.com\x1b[0m");
      term.writeln("  GitHub: \x1b[4mhttps://github.com/TLimoges33\x1b[0m");
      term.writeln(
        "  LinkedIn: \x1b[4mhttps://linkedin.com/in/tylerlimoges\x1b[0m"
      );
    },

    blog: (term, args) => {
      term.writeln("> cat ~/research/blog_posts.md\r\n");

      term.writeln("\x1b[1;33m=== SHELLDIABLO33 RESEARCH BLOG ===\x1b[0m");
      term.writeln(
        "\x1b[1;35mSubstack:\x1b[0m \x1b[4mhttps://shelldiablo33.substack.com\x1b[0m\r\n"
      );

      term.writeln("\x1b[1;36m// TECHNICAL GUIDES //\x1b[0m\r\n");

      term.writeln(
        "\x1b[1;32m1. The Complete Guide to Building Production-Grade C Projects\x1b[0m"
      );
      term.writeln(
        "   \x1b[90m├─\x1b[0m Topics: Makefile mastery, CI/CD, testing, deployment"
      );
      term.writeln(
        "   \x1b[90m├─\x1b[0m Focus: Professional C development workflows"
      );
      term.writeln("   \x1b[90m├─\x1b[0m Level: Intermediate to Advanced");
      term.writeln(
        "   \x1b[90m└─\x1b[0m Link: \x1b[4mhttps://shelldiablo33.substack.com/p/the-complete-guide-to-building-production\x1b[0m\r\n"
      );

      term.writeln(
        "\x1b[1;32m2. Cybersecurity Fundamentals - But Actually Useful\x1b[0m"
      );
      term.writeln(
        "   \x1b[90m├─\x1b[0m Topics: Core security concepts, practical applications"
      );
      term.writeln(
        "   \x1b[90m├─\x1b[0m Focus: Real-world security principles, not just theory"
      );
      term.writeln("   \x1b[90m├─\x1b[0m Level: Beginner to Intermediate");
      term.writeln(
        "   \x1b[90m└─\x1b[0m Link: \x1b[4mhttps://shelldiablo33.substack.com/p/cybersecurity-fundamentals-but-a\x1b[0m\r\n"
      );

      term.writeln("\x1b[1;36m// THEORETICAL RESEARCH //\x1b[0m\r\n");

      term.writeln(
        "\x1b[1;35m3. A Humble Attempt at Theory of Consciousness\x1b[0m"
      );
      term.writeln(
        "   \x1b[90m├─\x1b[0m Topics: Consciousness, AI, philosophy of mind"
      );
      term.writeln(
        "   \x1b[90m├─\x1b[0m Focus: Bridging neuroscience, AI, and consciousness studies"
      );
      term.writeln("   \x1b[90m├─\x1b[0m Level: Advanced theoretical");
      term.writeln(
        "   \x1b[90m├─\x1b[0m Note: Intersects with AI safety & alignment research"
      );
      term.writeln(
        "   \x1b[90m└─\x1b[0m Link: \x1b[4mhttps://shelldiablo33.substack.com/p/a-humble-attempt-at-theory-of-consciousness\x1b[0m\r\n"
      );

      term.writeln("\x1b[1;36m// PROFESSIONAL FRAMEWORKS //\x1b[0m\r\n");

      term.writeln(
        "\x1b[1;33m4. Red Teamer's Comprehensive Playbook Framework\x1b[0m"
      );
      term.writeln(
        "   \x1b[90m├─\x1b[0m Topics: Unified Kill Chain, MITRE ATT&CK, certification mapping"
      );
      term.writeln(
        "   \x1b[90m├─\x1b[0m Focus: Academic + professional red team operations"
      );
      term.writeln(
        "   \x1b[90m├─\x1b[0m Level: Professional (cert prep: PenTest+, CEH, OSCP, PNPT)"
      );
      term.writeln(
        "   \x1b[90m├─\x1b[0m Scope: 18 UKC phases, 8 SNHU categories, blue team perspectives"
      );
      term.writeln(
        "   \x1b[90m├─\x1b[0m Note: Living document for career-long red team development"
      );
      term.writeln(
        "   \x1b[90m└─\x1b[0m Status: Active study guide (academic + certification use)\r\n"
      );

      term.writeln("\x1b[1;33m// WRITING STATS //\x1b[0m");
      term.writeln(
        "  \x1b[32mPublished Posts:\x1b[0m 3 public + 1 comprehensive framework"
      );
      term.writeln("  \x1b[32mPlatform:\x1b[0m Substack (shelldiablo33)");
      term.writeln(
        "  \x1b[32mFocus Areas:\x1b[0m Systems programming, cybersecurity, AI theory, red teaming"
      );
      term.writeln(
        "  \x1b[32mStyle:\x1b[0m Technical depth with practical applications\r\n"
      );

      term.writeln("\x1b[1;33m// UPCOMING CONTENT //\x1b[0m");
      term.writeln(
        "  \x1b[33m[PLANNED]\x1b[0m CTF write-ups (HTB/THM machines)"
      );
      term.writeln(
        "  \x1b[33m[PLANNED]\x1b[0m Security tool development series"
      );
      term.writeln(
        "  \x1b[33m[PLANNED]\x1b[0m AI red teaming & LLM security research"
      );
      term.writeln(
        "  \x1b[33m[PLANNED]\x1b[0m Kernel exploitation techniques\r\n"
      );

      term.writeln(
        "\x1b[1;32m> Subscribe:\x1b[0m \x1b[4mhttps://shelldiablo33.substack.com\x1b[0m"
      );
    },

    certs: (term, args) => {
      term.writeln("> cat ~/certifications/roadmap.md\r\n");

      term.writeln(
        "\x1b[1;36m╔═══════════════════════════════════════════════════════════════╗\x1b[0m"
      );
      term.writeln(
        "\x1b[1;36m║     RED TEAM CERTIFICATION ROADMAP - STRATEGIC ANALYSIS      ║\x1b[0m"
      );
      term.writeln(
        "\x1b[1;36m╚═══════════════════════════════════════════════════════════════╝\x1b[0m\r\n"
      );

      term.writeln("\x1b[1;33m📊 CURRENT STATUS:\x1b[0m");
      term.writeln(
        "  \x1b[90m├─\x1b[0m Phase: Building the Bedrock (Foundational Skills)"
      );
      term.writeln("  \x1b[90m├─\x1b[0m Progress: 6-12 months into roadmap");
      term.writeln(
        "  \x1b[90m└─\x1b[0m Focus: Network foundations → Offensive tactics\r\n"
      );

      term.writeln(
        "\x1b[1;32m🎯 PHASE 1: BUILDING THE BEDROCK (Months 0-12)\x1b[0m"
      );
      term.writeln(
        '\x1b[90m   "You cannot break what you do not understand"\x1b[0m\r\n'
      );

      term.writeln(
        "  \x1b[1;36m1. CompTIA Network+\x1b[0m \x1b[33m[STUDYING]\x1b[0m"
      );
      term.writeln("     \x1b[90m├─\x1b[0m Cost: ~$369 | Time: 2-3 months");
      term.writeln(
        "     \x1b[90m├─\x1b[0m Why: TCP/IP, routing, DNS - the central nervous system"
      );
      term.writeln("     \x1b[90m└─\x1b[0m Target: November 2025\r\n");

      term.writeln(
        "  \x1b[1;36m2. CompTIA Security+\x1b[0m \x1b[33m[STUDYING]\x1b[0m"
      );
      term.writeln("     \x1b[90m├─\x1b[0m Cost: ~$404 | Time: 2-3 months");
      term.writeln(
        "     \x1b[90m├─\x1b[0m Why: Fundamental security vocabulary & frameworks"
      );
      term.writeln("     \x1b[90m└─\x1b[0m Target: December 2025\r\n");

      term.writeln(
        "  \x1b[1;36m3. CompTIA Linux+\x1b[0m \x1b[90m[PLANNED]\x1b[0m"
      );
      term.writeln("     \x1b[90m├─\x1b[0m Cost: ~$369 | Time: 2-3 months");
      term.writeln(
        "     \x1b[90m├─\x1b[0m Why: Most servers & offensive tools are Linux-based"
      );
      term.writeln("     \x1b[90m└─\x1b[0m Target: Q1 2026\r\n");

      term.writeln(
        "\x1b[1;32m⚔️  PHASE 2: OFFENSIVE TACTICS (Months 6-12)\x1b[0m"
      );
      term.writeln(
        '\x1b[90m   "Think like an attacker. Act with methodology."\x1b[0m\r\n'
      );

      term.writeln(
        "  \x1b[1;36m4. eJPT (Junior Penetration Tester)\x1b[0m \x1b[33m[STUDYING]\x1b[0m"
      );
      term.writeln("     \x1b[90m├─\x1b[0m Cost: ~$249 | Time: 1-3 months");
      term.writeln("     \x1b[90m├─\x1b[0m Format: 48-hour hands-on lab exam");
      term.writeln(
        "     \x1b[90m├─\x1b[0m Why: Best first step into practical hacking"
      );
      term.writeln(
        "     \x1b[90m└─\x1b[0m ROI: Exceptional value for hands-on skills\r\n"
      );

      term.writeln(
        "  \x1b[1;36m5. CompTIA PenTest+\x1b[0m \x1b[90m[PLANNED]\x1b[0m"
      );
      term.writeln("     \x1b[90m├─\x1b[0m Cost: ~$404 | Time: 2-4 months");
      term.writeln(
        "     \x1b[90m├─\x1b[0m Format: Hybrid (MCQ + Performance-Based)"
      );
      term.writeln(
        "     \x1b[90m└─\x1b[0m Why: Validates full pentest methodology & process\r\n"
      );

      term.writeln(
        "  \x1b[1;36m6. PNPT (Practical Network PT)\x1b[0m \x1b[90m[PLANNED]\x1b[0m"
      );
      term.writeln("     \x1b[90m├─\x1b[0m Cost: ~$299 | Time: 3-5 months");
      term.writeln(
        "     \x1b[90m├─\x1b[0m Format: 5-day real corporate network + live debrief"
      );
      term.writeln(
        "     \x1b[90m└─\x1b[0m Why: Active Directory exploitation & reporting skills\r\n"
      );

      term.writeln(
        "\x1b[1;32m🏆 PHASE 3: PROFESSIONAL PROFICIENCY (Months 12-30)\x1b[0m"
      );
      term.writeln(
        '\x1b[90m   "The industry-defining certifications"\x1b[0m\r\n'
      );

      term.writeln(
        "  \x1b[1;36m7. CEH (Certified Ethical Hacker)\x1b[0m \x1b[90m[SITUATIONAL]\x1b[0m"
      );
      term.writeln(
        "     \x1b[90m├─\x1b[0m Cost: $1,899-$3,499+ | Time: 2-4 months"
      );
      term.writeln(
        "     \x1b[90m├─\x1b[0m HR Recognition: 9/10 | Technical Cred: 3/10"
      );
      term.writeln(
        "     \x1b[90m└─\x1b[0m Note: For HR filters only. Get if employer pays.\r\n"
      );

      term.writeln(
        "  \x1b[1;36m8. OSCP (Gold Standard)\x1b[0m \x1b[31m[LONG-TERM GOAL]\x1b[0m"
      );
      term.writeln("     \x1b[90m├─\x1b[0m Cost: ~$1,749 | Time: 6-12+ months");
      term.writeln(
        '     \x1b[90m├─\x1b[0m Format: 24-hour practical exam ("Try Harder")'
      );
      term.writeln(
        "     \x1b[90m├─\x1b[0m Why: THE gold standard for hands-on pentesting"
      );
      term.writeln("     \x1b[90m└─\x1b[0m Target: Mid-2026\r\n");

      term.writeln(
        "\x1b[1;32m🎖️  PHASE 4: ADVERSARY EMULATION (Months 24-48)\x1b[0m"
      );
      term.writeln(
        '\x1b[90m   "From penetration tester to red team operator"\x1b[0m\r\n'
      );

      term.writeln(
        "  \x1b[1;36m9. CRTP (Certified Red Team Professional)\x1b[0m"
      );
      term.writeln(
        "     \x1b[90m├─\x1b[0m Cost: ~$249 | Focus: Active Directory mastery"
      );
      term.writeln(
        "     \x1b[90m└─\x1b[0m Why: Best practical AD exploitation cert\r\n"
      );

      term.writeln(
        "  \x1b[1;36m10. OSEP (Experienced Penetration Tester)\x1b[0m \x1b[31m[LONG-TERM]\x1b[0m"
      );
      term.writeln("     \x1b[90m├─\x1b[0m Cost: ~$1,749 | Exam: 48 hours");
      term.writeln(
        "     \x1b[90m├─\x1b[0m Focus: AV evasion, advanced lateral movement"
      );
      term.writeln(
        "     \x1b[90m└─\x1b[0m Why: Operate in mature, defended environments\r\n"
      );

      term.writeln("  \x1b[1;36m11. GPEN (GIAC Penetration Tester)\x1b[0m");
      term.writeln(
        "     \x1b[90m├─\x1b[0m Cost: ~$9,500+ (with SANS training)"
      );
      term.writeln(
        "     \x1b[90m├─\x1b[0m Why: Corporate/gov standard, world-class training"
      );
      term.writeln("     \x1b[90m└─\x1b[0m Note: Employer-funded only\r\n");

      term.writeln("\x1b[1;32m🚀 ELITE SPECIALIZATIONS:\x1b[0m\r\n");

      term.writeln("  \x1b[1;35mAdvanced Active Directory:\x1b[0m");
      term.writeln(
        "     \x1b[90m└─\x1b[0m CRTE (Certified Red Team Expert) - Multi-forest attacks\r\n"
      );

      term.writeln("  \x1b[1;35mCloud Penetration Testing:\x1b[0m");
      term.writeln(
        "     \x1b[90m├─\x1b[0m MCPT (Multi-Cloud PT) - AWS/Azure/GCP"
      );
      term.writeln(
        "     \x1b[90m└─\x1b[0m GCPN (GIAC Cloud PT) - Enterprise standard\r\n"
      );

      term.writeln("  \x1b[1;35mWeb Application Security:\x1b[0m");
      term.writeln(
        "     \x1b[90m└─\x1b[0m OSWE (Offensive Security Web Expert) - White-box analysis\r\n"
      );

      term.writeln("  \x1b[1;35mMobile Security:\x1b[0m");
      term.writeln(
        "     \x1b[90m├─\x1b[0m eMAPT (Mobile App PT) - Android & iOS"
      );
      term.writeln(
        "     \x1b[90m└─\x1b[0m PMPA (Practical Mobile PT) - TCM Security\r\n"
      );

      term.writeln("  \x1b[1;35mExploit Development:\x1b[0m");
      term.writeln(
        "     \x1b[90m├─\x1b[0m OSED (Exploit Developer) - Windows user-mode"
      );
      term.writeln(
        "     \x1b[90m├─\x1b[0m GXPN (Exploit Researcher) - Multi-platform"
      );
      term.writeln(
        "     \x1b[90m└─\x1b[0m OSEE (Exploitation Expert) - Kernel exploitation\r\n"
      );

      term.writeln("\x1b[1;33m📚 PUBLISHED RESEARCH:\x1b[0m");
      term.writeln(
        '  \x1b[1;36m"The Definitive Red Team Certification Roadmap:\x1b[0m'
      );
      term.writeln(
        '  \x1b[1;36m A Strategic Industry Analysis for 2025"\x1b[0m\r\n'
      );

      term.writeln(
        "  \x1b[90m├─\x1b[0m Framework: Two-Axis Evaluation (HR vs Technical Credibility)"
      );
      term.writeln(
        "  \x1b[90m├─\x1b[0m Analysis: 20+ certifications with cost/benefit breakdown"
      );
      term.writeln(
        "  \x1b[90m├─\x1b[0m Citations: 81+ industry sources verified"
      );
      term.writeln(
        "  \x1b[90m├─\x1b[0m Methodology: Red Teamer vs Penetration Tester distinction"
      );
      term.writeln(
        "  \x1b[90m└─\x1b[0m Decision Matrix: OSCP vs PNPT vs GPEN comparison\r\n"
      );

      term.writeln("\x1b[1;33m🎯 KEY INSIGHTS FROM RESEARCH:\x1b[0m\r\n");

      term.writeln("  \x1b[1;32m1. The CEH Dilemma:\x1b[0m");
      term.writeln(
        "     \x1b[90m├─\x1b[0m HR Recognition: 9/10 (highest) | Technical: 3/10 (lowest)"
      );
      term.writeln(
        "     \x1b[90m├─\x1b[0m Cost: $1,899-$3,499+ for mostly multiple-choice exam"
      );
      term.writeln(
        "     \x1b[90m└─\x1b[0m Verdict: Situational - only if employer pays & requires\r\n"
      );

      term.writeln("  \x1b[1;32m2. Best ROI Certifications:\x1b[0m");
      term.writeln(
        "     \x1b[90m├─\x1b[0m eJPT: $249 for first hands-on skills (exceptional value)"
      );
      term.writeln(
        "     \x1b[90m├─\x1b[0m PNPT: $299 for real-world AD attack simulation"
      );
      term.writeln(
        "     \x1b[90m└─\x1b[0m CRTP: $249 for best practical AD exploitation training\r\n"
      );

      term.writeln(
        "  \x1b[1;32m3. The Professional Crossroads (Choose Your Path):\x1b[0m"
      );
      term.writeln(
        "     \x1b[90m├─\x1b[0m OSCP: Industry gold standard, max resume impact ($1,749)"
      );
      term.writeln(
        "     \x1b[90m├─\x1b[0m PNPT: Best real-world simulation + live debrief ($299)"
      );
      term.writeln(
        "     \x1b[90m└─\x1b[0m GPEN: Corporate standard, employer-funded only ($9,500+)\r\n"
      );

      term.writeln("  \x1b[1;32m4. Red Teamer vs Penetration Tester:\x1b[0m");
      term.writeln(
        "     \x1b[90m├─\x1b[0m Pentester: Finds & exploits vulnerabilities"
      );
      term.writeln(
        "     \x1b[90m├─\x1b[0m Red Teamer: Emulates adversary TTPs, tests blue team"
      );
      term.writeln(
        "     \x1b[90m└─\x1b[0m Key Skills: Stealth, persistence, specific objectives\r\n"
      );

      term.writeln("\x1b[1;33m💰 INVESTMENT STRATEGY:\x1b[0m\r\n");

      term.writeln("  \x1b[1;36mSelf-Funded Path (High ROI):\x1b[0m");
      term.writeln("     \x1b[90m├─\x1b[0m Phase 1: eJPT + PenTest+ (~$650)");
      term.writeln("     \x1b[90m├─\x1b[0m Phase 2: PNPT (~$299)");
      term.writeln("     \x1b[90m├─\x1b[0m Phase 3: CRTP + OSCP (~$2,000)");
      term.writeln(
        "     \x1b[90m└─\x1b[0m Total: ~$3,000 for professional-level skills\r\n"
      );

      term.writeln(
        "  \x1b[1;36mEmployer-Sponsored Path (Maximum Recognition):\x1b[0m"
      );
      term.writeln(
        "     \x1b[90m├─\x1b[0m Phase 1: CompTIA Trinity + CEH (~$5,000)"
      );
      term.writeln("     \x1b[90m├─\x1b[0m Phase 2: OSCP or GPEN (~$10,000)");
      term.writeln("     \x1b[90m├─\x1b[0m Phase 3: OSEP + OSWE (~$3,500)");
      term.writeln(
        "     \x1b[90m└─\x1b[0m Phase 4: GXPN or OSEE (~$12,000+)\r\n"
      );

      term.writeln("\x1b[1;33m📈 TIMELINE & MILESTONES:\x1b[0m\r\n");

      term.writeln(
        "  \x1b[32m[NOW - NOV 2025]\x1b[0m Network+ → Security foundation"
      );
      term.writeln("  \x1b[32m[DEC 2025]\x1b[0m Security+ → Industry baseline");
      term.writeln("  \x1b[32m[Q1 2026]\x1b[0m eJPT → First practical cert");
      term.writeln("  \x1b[32m[Q2 2026]\x1b[0m PNPT → Real-world AD skills");
      term.writeln("  \x1b[32m[MID-2026]\x1b[0m OSCP → Industry gold standard");
      term.writeln(
        "  \x1b[32m[2027+]\x1b[0m OSEP/CRTP → Red team operator\r\n"
      );

      term.writeln(
        "\x1b[1;36m╔═══════════════════════════════════════════════════════════════╗\x1b[0m"
      );
      term.writeln(
        "\x1b[1;36m║  Research validates: Skills > Certifications > Job Titles   ║\x1b[0m"
      );
      term.writeln(
        "\x1b[1;36m║  Focus: Hands-on practice, public portfolio, continuous CTF  ║\x1b[0m"
      );
      term.writeln(
        "\x1b[1;36m╚═══════════════════════════════════════════════════════════════╝\x1b[0m\r\n"
      );

      term.writeln(
        "\x1b[90mTip: Use 'blog' to read the full research paper\x1b[0m"
      );
      term.writeln(
        "\x1b[90mTip: Use 'education' to see current certification status\x1b[0m"
      );
    },

    education: (term, args) => {
      term.writeln("> cat /etc/education.conf\r\n");

      term.writeln(
        "\x1b[1;32m> Current: Southern New Hampshire University\x1b[0m"
      );
      term.writeln("  Degree: B.S. Computer Science (Cybersecurity Focus)");
      term.writeln("  Status: Junior (Expected Graduation: May 2026)");
      term.writeln("  GPA: 3.9/4.0\r\n");

      term.writeln("\x1b[1;32m> Relevant Coursework:\x1b[0m");
      term.writeln("  • Operating Systems & Computer Architecture");
      term.writeln("  • Data Structures & Algorithms (C++, Python)");
      term.writeln("  • Network Security & Cryptography");
      term.writeln("  • Reverse Engineering & Malware Analysis");
      term.writeln("  • Web Application Security (OWASP)\r\n");

      term.writeln(
        "\x1b[1;32m> Certifications (In Progress / Planned):\x1b[0m"
      );
      term.writeln("  \x1b[32m[TARGET: NOV 2025]\x1b[0m CompTIA Network+");
      term.writeln("  \x1b[32m[TARGET: DEC 2025]\x1b[0m CompTIA Security+");
      term.writeln(
        "  \x1b[36m[STUDYING]\x1b[0m eJPT (eLearnSecurity Junior PT)"
      );
      term.writeln("  \x1b[31m[LONG-TERM]\x1b[0m OSCP, OSEP\r\n");

      term.writeln("\x1b[1;32m> Unique Value Proposition:\x1b[0m");
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
      term.writeln(`\x1b[1;36m[WASM-DEMO]\x1b[0m Input: "${input}"`);
      term.writeln(`\x1b[1;32m[WASM-DEMO]\x1b[0m Hash:  0x${result}`);
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
      term.writeln(`\x1b[1;36m[WASM-DEMO]\x1b[0m Input:  "${input}"`);
      term.writeln(`\x1b[1;32m[WASM-DEMO]\x1b[0m ROT13:  "${result}"`);
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
        term.writeln("\x1b[1;33m🤖 AI PORTFOLIO ADVISOR\x1b[0m\r\n");

        const status = window.aiAdvisor.getStatus();

        term.writeln(`📊 Current Grade: \x1b[33m${status.grade}\x1b[0m`);
        term.writeln(
          `🎯 Potential Grade: \x1b[32m${status.potential}\x1b[0m\r\n`
        );

        term.writeln("\x1b[1;32m✅ TOP STRENGTHS:\x1b[0m");
        status.strengths.forEach((s, i) => {
          term.writeln(`   ${i + 1}. ${s}`);
        });
        term.writeln("");

        term.writeln("\x1b[1;31m❌ CRITICAL GAPS:\x1b[0m");
        status.gaps.forEach((g, i) => {
          term.writeln(`   ${i + 1}. ${g}`);
        });
        term.writeln("");

        term.writeln("\x1b[1;36m🎯 TOP PRIORITIES:\x1b[0m");
        status.topPriorities.forEach((p, i) => {
          term.writeln(`   ${i + 1}. ${p}`);
        });
        term.writeln("");

        term.writeln("\x1b[1;33m💬 CHAT WITH AI ADVISOR:\x1b[0m");
        term.writeln("  Type: advisor <your question>");
        term.writeln("  \x1b[90mExamples:\x1b[0m");
        term.writeln("    advisor what should I do next?");
        term.writeln("    advisor help me with ctf writeups");
        term.writeln("    advisor how do I get security+ cert?");
        term.writeln("    advisor status\r\n");

        term.writeln(
          "\x1b[1;32m> AI Advisor ready! Ask me anything about your career.\x1b[0m"
        );
        return;
      }

      // Chat mode - answer specific question
      const question = args.join(" ");
      term.writeln(`\r\n\x1b[36m[YOU]\x1b[0m ${question}\r\n`);
      term.writeln("\x1b[90m[AI Advisor thinking...]\x1b[0m\r\n");

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
                term.writeln(`\x1b[32m[AI]\x1b[0m ${currentLine}`);
                currentLine = word + " ";
              } else {
                currentLine += word + " ";
              }
            });
            if (currentLine.trim()) {
              term.writeln(`\x1b[32m[AI]\x1b[0m ${currentLine}`);
            }
          } else {
            term.writeln(`\x1b[32m[AI]\x1b[0m ${line}`);
          }
        });
        term.writeln("");
        term.writeln(
          "\x1b[90m> Ask another question or type 'advisor' for full summary\x1b[0m"
        );
      } catch (error) {
        term.writeln(`\x1b[1;31m[ERROR]\x1b[0m ${error.message}\x1b[0m`);
        term.writeln(
          "\x1b[90m> Fallback: Type 'advisor' with no args for static recommendations\x1b[0m"
        );
      }
    },
    update: (term, args) => {
      term.writeln(
        "\x1b[1;33m> Reloading portfolio with latest changes...\x1b[0m\r\n"
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
          "\x1b[1;32m✓ Update complete. Reloading in 2 seconds...\x1b[0m"
        );
        setTimeout(() => {
          window.location.reload(true);
        }, 2000);
      }, 1000);
    },
    export: (term, args) => {
      term.writeln("\x1b[1;33m> Exporting session transcript...\x1b[0m\r\n");

      const timestamp = new Date().toISOString().split("T")[0];
      const sessionDuration = Math.round(
        (Date.now() - sessionStartTime) / 1000 / 60
      );

      let transcript = `Ty Limoges Portfolio - Session Transcript\n`;
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
        `\x1b[1;32m✓ Session exported to: tylimoges-session-${timestamp}.txt\x1b[0m`
      );
      term.writeln(
        `  Commands: ${commandHistory.length} | Duration: ${sessionDuration}m`
      );
    },
    stats: (term, args) => {
      term.writeln(
        "\x1b[1;36m╔════════════════════════════════════════════════════════════╗\x1b[0m"
      );
      term.writeln(
        "\x1b[1;36m║           PORTFOLIO ANALYTICS DASHBOARD                   ║\x1b[0m"
      );
      term.writeln(
        "\x1b[1;36m╚════════════════════════════════════════════════════════════╝\x1b[0m\r\n"
      );

      const sessionDuration = Math.round(
        (Date.now() - sessionStartTime) / 1000 / 60
      );

      term.writeln("\x1b[1;33m📊 SESSION METRICS:\x1b[0m");
      term.writeln(`  Visit Number:      #${visitCount}`);
      term.writeln(`  Session Duration:  ${sessionDuration} minutes`);
      term.writeln(`  Commands Executed: ${commandHistory.length}`);
      term.writeln(
        `  History Saved:     ${commandHistory.slice(-50).length} (last 50)\r\n`
      );

      term.writeln("\x1b[1;33m🎯 COMMAND USAGE (Top 10):\x1b[0m");
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

      term.writeln("\r\n\x1b[1;33m💾 PERSISTENCE DATA:\x1b[0m");
      term.writeln(`  Aliases:          ${Object.keys(aliases).length}`);
      term.writeln(`  Installed Pkgs:   ${installedPackages.length}`);
      term.writeln(`  Custom Theme:     ${customTheme ? "Yes" : "No"}`);

      term.writeln(
        "\r\n\x1b[90mTip: Use 'export' to download full session transcript\x1b[0m"
      );
    },
    coffee: (term, args) => {
      term.writeln("\x1b[1;33m☕ Brewing virtual coffee...\x1b[0m");
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
          "\x1b[90m  (RFC 2324 - Hyper Text Coffee Pot Control Protocol)\x1b[0m"
        );
      }, 1500);
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
            `\x1b[1;32m[${".".repeat(frameIndex + 1)}] ${
              frames[frameIndex]
            }\x1b[0m`
          );
          frameIndex++;
          setTimeout(animate, 300);
        } else {
          term.writeln("\r\n");
          term.writeln(
            "\x1b[1;32m╔════════════════════════════════════════╗\x1b[0m"
          );
          term.writeln(
            "\x1b[1;32m║   ACCESS GRANTED - DIABLORAIN MODE    ║\x1b[0m"
          );
          term.writeln(
            "\x1b[1;32m╚════════════════════════════════════════╝\x1b[0m\r\n"
          );
          term.writeln(
            "  Just kidding! This is a portfolio, not a hacking simulator."
          );
          term.writeln("  But if you want to see real cybersecurity work:");
          term.writeln("");
          term.writeln(
            "  \x1b[36m→ Type 'synos' for my 452,000+ line OS project\x1b[0m"
          );
          term.writeln(
            "  \x1b[36m→ Type 'pursuits' for my CTF profiles\x1b[0m"
          );
          term.writeln("  \x1b[36m→ Type 'blog' for security research\x1b[0m");
        }
      };
      term.writeln("");
      animate();
    },
    konami: (term, args) => {
      term.writeln("\x1b[1;35m");
      term.writeln("    ╔══════════════════════════════════════════╗");
      term.writeln("    ║  🎮 ACHIEVEMENT UNLOCKED! 🎮            ║");
      term.writeln("    ║  Konami Code Master                     ║");
      term.writeln("    ╚══════════════════════════════════════════╝");
      term.writeln("\x1b[0m");
      term.writeln("  You found the secret! Here's a classic:");
      term.writeln("");
      term.writeln(
        "\x1b[1;32m      ___           ___           ___     \x1b[0m"
      );
      term.writeln(
        "\x1b[1;32m     /\\__\\         /\\  \\         /\\__\\    \x1b[0m"
      );
      term.writeln(
        "\x1b[1;32m    /::|  |       /::\\  \\       /:/  /    \x1b[0m"
      );
      term.writeln(
        "\x1b[1;32m   /:|:|  |      /:/\\:\\  \\     /:/__/     \x1b[0m"
      );
      term.writeln(
        "\x1b[1;32m  /:/|:|__|__   /::\\~\\:\\  \\   /::\\__\\____ \x1b[0m"
      );
      term.writeln(
        "\x1b[1;32m /:/ |::::\\__\\ /:/\\:\\ \\:\\__\\ /:/\\:::::\\__\\\x1b[0m"
      );
      term.writeln(
        "\x1b[1;32m \\/__/~~/:/  / \\/__\\:\\/:/  / \\/_|:|~~|~   \x1b[0m"
      );
      term.writeln(
        "\x1b[1;32m       /:/  /       \\::/  /     |:|  |    \x1b[0m"
      );
      term.writeln(
        "\x1b[1;32m      /:/  /        /:/  /      |:|  |    \x1b[0m"
      );
      term.writeln(
        "\x1b[1;32m     /:/  /        /:/  /       |:|  |    \x1b[0m"
      );
      term.writeln(
        "\x1b[1;32m     \\/__/         \\/__/         \\|__|    \x1b[0m"
      );
      term.writeln("");
      term.writeln(
        "\x1b[90m  Congrats, hacker! You know your way around a terminal.\x1b[0m"
      );
    },
    snake: (term, args) => {
      term.writeln("\x1b[1;33m🐍 TERMINAL SNAKE GAME 🐍\x1b[0m\r\n");
      term.writeln(
        "Coming soon! This would be a full snake game implementation."
      );
      term.writeln("For now, here's a snake:\r\n");
      term.writeln("\x1b[1;32m");
      term.writeln("         ~^~^~^~");
      term.writeln("       ~^~^~^~^~^~");
      term.writeln("     ~^~^~^~^~^~^~");
      term.writeln("       @_)~^~^~^~    <-- Snek says hi!");
      term.writeln("\x1b[0m");
      term.writeln(
        "\x1b[90mImplementation idea: Use WASD controls + requestAnimationFrame\x1b[0m"
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
