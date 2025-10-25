// WASM Integration Example
// This demonstrates how to integrate WebAssembly modules
// For a real implementation, compile Rust code to WASM

// Simulated WASM module (in production, load from .wasm file)
const wasmModule = {
  // Simple hash function (simulating what would be compiled from Rust)
  hash: (input) => {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16).padStart(8, "0");
  },

  // ROT13 cipher (another simple example)
  rot13: (input) => {
    return input.replace(/[a-zA-Z]/g, (char) => {
      const start = char <= "Z" ? 65 : 97;
      return String.fromCharCode(
        start + ((char.charCodeAt(0) - start + 13) % 26)
      );
    });
  },
};

// Example command using WASM module
const wasmCommands = {
  hash: (term, args) => {
    if (args.length === 0) {
      term.writeln("Usage: hash <string>");
      return;
    }
    const input = args.join(" ");
    const result = wasmModule.hash(input);
    term.writeln(`\x1b[1;32m[WASM]\x1b[0m Hash: ${result}`);
  },

  rot13: (term, args) => {
    if (args.length === 0) {
      term.writeln("Usage: rot13 <string>");
      return;
    }
    const input = args.join(" ");
    const result = wasmModule.rot13(input);
    term.writeln(`\x1b[1;32m[WASM]\x1b[0m ROT13: ${result}`);
  },
};

// Export for use in main.js
if (typeof module !== "undefined" && module.exports) {
  module.exports = { wasmModule, wasmCommands };
}

/* 
PRODUCTION WASM INTEGRATION:

1. Create Rust project:
   cargo new --lib hash_wasm
   
2. Add to Cargo.toml:
   [lib]
   crate-type = ["cdylib"]
   
   [dependencies]
   wasm-bindgen = "0.2"

3. Rust code (lib.rs):
   use wasm_bindgen::prelude::*;
   
   #[wasm_bindgen]
   pub fn hash(input: &str) -> String {
       // Implement hash function
   }

4. Build:
   wasm-pack build --target web

5. Load in JavaScript:
   import init, { hash } from './pkg/hash_wasm.js';
   await init();
   const result = hash('input');
*/
