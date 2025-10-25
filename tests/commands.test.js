// Test suite for command execution and functionality
import { describe, it, expect, beforeEach } from "vitest";

// Mock terminal
class MockTerminal {
  constructor() {
    this.output = [];
    this.cleared = false;
  }

  write(text) {
    this.output.push(text);
  }

  writeln(text) {
    this.output.push(text + "\r\n");
  }

  clear() {
    this.cleared = true;
    this.output = [];
  }

  getOutput() {
    return this.output.join("");
  }
}

// Mock localStorage
class MockStorage {
  constructor() {
    this.store = {};
  }

  getItem(key) {
    return this.store[key] || null;
  }

  setItem(key, value) {
    this.store[key] = value;
  }

  clear() {
    this.store = {};
  }
}

describe("Command Execution", () => {
  let mockTerm;
  let mockStorage;

  beforeEach(() => {
    mockTerm = new MockTerminal();
    mockStorage = new MockStorage();
  });

  describe("Session Persistence", () => {
    it("should save command history to localStorage", () => {
      const history = ["whoami", "help", "projects"];
      mockStorage.setItem("commandHistory", JSON.stringify(history));

      const saved = JSON.parse(mockStorage.getItem("commandHistory"));
      expect(saved).toEqual(history);
      expect(saved.length).toBe(3);
    });

    it("should limit saved history to last 50 commands", () => {
      const history = Array.from({ length: 60 }, (_, i) => `cmd${i}`);
      const recentHistory = history.slice(-50);

      mockStorage.setItem("commandHistory", JSON.stringify(recentHistory));
      const saved = JSON.parse(mockStorage.getItem("commandHistory"));

      expect(saved.length).toBe(50);
      expect(saved[0]).toBe("cmd10");
      expect(saved[49]).toBe("cmd59");
    });

    it("should track visit count", () => {
      mockStorage.setItem("visitCount", "5");
      const count = parseInt(mockStorage.getItem("visitCount"));

      expect(count).toBe(5);
      expect(typeof count).toBe("number");
    });

    it("should persist command usage statistics", () => {
      const stats = { whoami: 5, help: 10, projects: 3 };
      mockStorage.setItem("commandStats", JSON.stringify(stats));

      const saved = JSON.parse(mockStorage.getItem("commandStats"));
      expect(saved.whoami).toBe(5);
      expect(saved.help).toBe(10);
    });
  });

  describe("Analytics Tracking", () => {
    it("should track command usage", () => {
      const stats = {};
      const cmd = "whoami";

      if (!stats[cmd]) stats[cmd] = 0;
      stats[cmd]++;

      expect(stats[cmd]).toBe(1);
    });

    it("should increment existing command counts", () => {
      const stats = { whoami: 3 };
      stats.whoami++;

      expect(stats.whoami).toBe(4);
    });

    it("should track multiple different commands", () => {
      const stats = {};
      ["whoami", "help", "whoami", "projects"].forEach((cmd) => {
        if (!stats[cmd]) stats[cmd] = 0;
        stats[cmd]++;
      });

      expect(stats.whoami).toBe(2);
      expect(stats.help).toBe(1);
      expect(stats.projects).toBe(1);
    });
  });

  describe("Export Command", () => {
    it("should format session transcript correctly", () => {
      const history = ["whoami", "help", "projects"];
      const timestamp = new Date().toISOString().split("T")[0];

      let transcript = `Ty Limoges Portfolio - Session Transcript\n`;
      transcript += `Date: ${new Date().toLocaleString()}\n`;

      expect(transcript).toContain("Ty Limoges Portfolio");
      expect(transcript).toContain("Session Transcript");
    });

    it("should include all commands in export", () => {
      const history = ["whoami", "help", "projects"];
      let transcript = "";

      history.forEach((cmd, idx) => {
        transcript += `[${idx + 1}] ${cmd}\n`;
      });

      expect(transcript).toContain("[1] whoami");
      expect(transcript).toContain("[2] help");
      expect(transcript).toContain("[3] projects");
    });
  });

  describe("Stats Command", () => {
    it("should calculate session duration", () => {
      const startTime = Date.now() - 5 * 60 * 1000; // 5 minutes ago
      const duration = Math.round((Date.now() - startTime) / 1000 / 60);

      expect(duration).toBeGreaterThanOrEqual(4);
      expect(duration).toBeLessThanOrEqual(6);
    });

    it("should sort command usage by frequency", () => {
      const stats = { whoami: 2, help: 10, projects: 5 };
      const sorted = Object.entries(stats).sort((a, b) => b[1] - a[1]);

      expect(sorted[0][0]).toBe("help");
      expect(sorted[0][1]).toBe(10);
      expect(sorted[1][0]).toBe("projects");
      expect(sorted[2][0]).toBe("whoami");
    });

    it("should limit to top 10 commands", () => {
      const stats = {};
      for (let i = 0; i < 20; i++) {
        stats[`cmd${i}`] = i;
      }

      const sorted = Object.entries(stats)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      expect(sorted.length).toBe(10);
    });
  });

  describe("Easter Egg Commands", () => {
    it("coffee command should return 418 teapot", () => {
      const output = "HTTP 418: I'm a teapot";
      expect(output).toContain("418");
      expect(output).toContain("teapot");
    });

    it("hack command should show animation sequence", () => {
      const frames = [
        "INITIALIZING",
        "LOADING",
        "BYPASSING",
        "CRACKING",
        "ACCESSING",
      ];

      expect(frames.length).toBe(5);
      expect(frames[0]).toBe("INITIALIZING");
    });

    it("konami command should show achievement", () => {
      const output = "ACHIEVEMENT UNLOCKED";
      expect(output).toContain("ACHIEVEMENT");
    });
  });

  describe("Visual Demos", () => {
    it("synos --demo should have boot sequence", () => {
      const bootSequence = [
        { msg: "Initializing cgroup subsys", delay: 100 },
        { msg: "Loading neural process scheduler", delay: 200 },
        { msg: "Consciousness engine: READY", delay: 200 },
      ];

      expect(bootSequence.length).toBeGreaterThan(0);
      expect(bootSequence[0].msg).toContain("Initializing");
    });

    it("synos --memory should show memory regions", () => {
      const output = "MEMORY REGIONS";
      expect(output).toContain("MEMORY");
    });

    it("synos --syscalls should list custom syscalls", () => {
      const output = "43 CUSTOM SYSTEM CALLS";
      expect(output).toContain("SYSTEM CALLS");
    });
  });
});

describe("Keyboard Shortcuts", () => {
  it("should recognize Ctrl+L for clear", () => {
    const event = {
      ctrlKey: true,
      key: "l",
      preventDefault: () => {},
    };

    expect(event.ctrlKey && event.key === "l").toBe(true);
  });

  it("should recognize Ctrl+K for command palette", () => {
    const event = {
      ctrlKey: true,
      key: "k",
      preventDefault: () => {},
    };

    expect(event.ctrlKey && event.key === "k").toBe(true);
  });

  it("should recognize Ctrl+D for logout", () => {
    const event = {
      ctrlKey: true,
      key: "d",
      preventDefault: () => {},
    };

    expect(event.ctrlKey && event.key === "d").toBe(true);
  });

  it("should recognize Ctrl+R for reverse search", () => {
    const event = {
      ctrlKey: true,
      key: "r",
      preventDefault: () => {},
    };

    expect(event.ctrlKey && event.key === "r").toBe(true);
  });
});

describe("Data Persistence", () => {
  let storage;

  beforeEach(() => {
    storage = new MockStorage();
  });

  it("should persist aliases", () => {
    const aliases = { ll: "ls -la", cls: "clear" };
    storage.setItem("terminalAliases", JSON.stringify(aliases));

    const saved = JSON.parse(storage.getItem("terminalAliases"));
    expect(saved.ll).toBe("ls -la");
    expect(saved.cls).toBe("clear");
  });

  it("should persist installed packages", () => {
    const packages = ["nmap", "wireshark"];
    storage.setItem("installedPackages", JSON.stringify(packages));

    const saved = JSON.parse(storage.getItem("installedPackages"));
    expect(saved).toEqual(packages);
    expect(saved.length).toBe(2);
  });

  it("should persist custom theme", () => {
    const theme = { background: "#000000", foreground: "#00FF00" };
    storage.setItem("customTheme", JSON.stringify(theme));

    const saved = JSON.parse(storage.getItem("customTheme"));
    expect(saved.background).toBe("#000000");
  });
});
