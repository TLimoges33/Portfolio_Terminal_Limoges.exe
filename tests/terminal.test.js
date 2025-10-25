// Test suite for terminal portfolio core functionality
import { describe, it, expect, beforeEach } from "vitest";

// Mock command parser
function parseCommand(input) {
  const parts = input.trim().split(" ");
  return {
    command: parts[0],
    args: parts.slice(1),
  };
}

// Mock command history handler
class CommandHistory {
  constructor() {
    this.history = [];
    this.index = -1;
  }

  add(cmd) {
    if (this.history[this.history.length - 1] !== cmd) {
      this.history.push(cmd);
    }
    this.index = this.history.length;
  }

  getPrevious() {
    if (this.index > 0) {
      this.index--;
      return this.history[this.index];
    }
    return null;
  }

  getNext() {
    if (this.index < this.history.length - 1) {
      this.index++;
      return this.history[this.index];
    }
    this.index = this.history.length;
    return "";
  }
}

// Mock autocomplete
function autocomplete(input, commands) {
  const matches = Object.keys(commands).filter((c) => c.startsWith(input));
  return matches.length === 1 ? matches[0] : null;
}

describe("Command Parser", () => {
  it("should parse simple command", () => {
    const result = parseCommand("help");
    expect(result.command).toBe("help");
    expect(result.args).toEqual([]);
  });

  it("should parse command with arguments", () => {
    const result = parseCommand("man nmap");
    expect(result.command).toBe("man");
    expect(result.args).toEqual(["nmap"]);
  });

  it("should handle multiple arguments", () => {
    const result = parseCommand("cve search 2024-1234");
    expect(result.command).toBe("cve");
    expect(result.args).toEqual(["search", "2024-1234"]);
  });

  it("should handle extra whitespace", () => {
    const result = parseCommand("  whoami  ");
    expect(result.command).toBe("whoami");
    expect(result.args).toEqual([]);
  });
});

describe("Command History", () => {
  let history;

  beforeEach(() => {
    history = new CommandHistory();
  });

  it("should add commands to history", () => {
    history.add("help");
    history.add("whoami");
    expect(history.history).toEqual(["help", "whoami"]);
  });

  it("should not add duplicate consecutive commands", () => {
    history.add("help");
    history.add("help");
    expect(history.history).toEqual(["help"]);
  });

  it("should navigate backwards through history", () => {
    history.add("help");
    history.add("whoami");
    history.add("projects");
    expect(history.getPrevious()).toBe("projects");
    expect(history.getPrevious()).toBe("whoami");
    expect(history.getPrevious()).toBe("help");
  });

  it("should navigate forwards through history", () => {
    history.add("help");
    history.add("whoami");
    history.getPrevious();
    history.getPrevious();
    expect(history.getNext()).toBe("whoami");
  });

  it("should return empty string at end of history", () => {
    history.add("help");
    history.getPrevious();
    expect(history.getNext()).toBe("");
  });
});

describe("Autocomplete", () => {
  const commands = {
    help: {},
    whoami: {},
    projects: {},
    press: {},
    print: {},
  };

  it("should complete unique prefix", () => {
    expect(autocomplete("who", commands)).toBe("whoami");
  });

  it("should return null for ambiguous prefix", () => {
    expect(autocomplete("pr", commands)).toBe(null);
  });

  it("should return null for no matches", () => {
    expect(autocomplete("xyz", commands)).toBe(null);
  });

  it("should handle exact match", () => {
    expect(autocomplete("help", commands)).toBe("help");
  });
});
