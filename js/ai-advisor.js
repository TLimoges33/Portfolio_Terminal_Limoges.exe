// AI-Powered Advisor using Hugging Face Transformers.js
import { pipeline } from "@xenova/transformers";

class AIAdvisor {
  constructor() {
    this.model = null;
    this.isLoading = false;
    this.isReady = false;

    // Portfolio context for AI
    this.portfolioContext = {
      currentGrade: "C+ (70/100)",
      potentialGrade: "B+ (85/100)",
      strengths: [
        "~18,000 lines of kernel-level C code",
        "Professional build system (487-line Makefile)",
        "Multi-language codebase (C, Rust, Python)",
        "5+ years critical infrastructure experience",
        "Active on HTB, THM, OverTheWire",
      ],
      gaps: [
        "No CTF write-ups documented",
        "No security tool showcases",
        "AI Red Teaming claims unsubstantiated",
        "Missing certifications (Network+, Security+)",
        "Security vulnerabilities in portfolio (XSS, no CSP)",
      ],
      quickWins: [
        "Write 3 CTF write-ups this weekend",
        "Extract 3 security tools from Syn_OS",
        "Fix portfolio XSS vulnerabilities",
        "Document AI security research",
        "Add CSP headers to index.html",
      ],
    };
  }

  async initialize() {
    if (this.isReady || this.isLoading) return;

    this.isLoading = true;
    try {
      // Use a lightweight text generation model
      // Using distilgpt2 for fast in-browser inference
      this.model = await pipeline("text-generation", "Xenova/distilgpt2");
      this.isReady = true;
      console.log("AI Advisor initialized successfully");
    } catch (error) {
      console.error("Failed to initialize AI Advisor:", error);
      this.isReady = false;
    }
    this.isLoading = false;
  }

  async chat(userQuery) {
    if (!this.isReady) {
      await this.initialize();
    }

    if (!this.isReady) {
      return this.fallbackResponse(userQuery);
    }

    try {
      // Create context-aware prompt
      const prompt = this.buildPrompt(userQuery);

      // Generate response
      const result = await this.model(prompt, {
        max_new_tokens: 150,
        temperature: 0.7,
        do_sample: true,
        top_k: 50,
      });

      return this.formatResponse(result[0].generated_text, userQuery);
    } catch (error) {
      console.error("AI generation error:", error);
      return this.fallbackResponse(userQuery);
    }
  }

  buildPrompt(userQuery) {
    const context = `You are a cybersecurity career advisor reviewing Ty's portfolio.

Current Status:
- Grade: ${this.portfolioContext.currentGrade}
- Potential: ${this.portfolioContext.potentialGrade}

Key Strengths:
${this.portfolioContext.strengths.map((s) => `- ${s}`).join("\n")}

Critical Gaps:
${this.portfolioContext.gaps.map((g) => `- ${g}`).join("\n")}

User Question: ${userQuery}

Advisor Response:`;

    return context;
  }

  formatResponse(generatedText, originalQuery) {
    // Extract just the new response after the prompt
    const responseStart = generatedText.indexOf("Advisor Response:");
    if (responseStart === -1) {
      return this.fallbackResponse(originalQuery);
    }

    let response = generatedText
      .substring(responseStart + "Advisor Response:".length)
      .trim();

    // Clean up the response
    response = response.split("\n")[0]; // Take first paragraph
    response = response.replace(/User Question:.*$/g, "").trim();

    return response || this.fallbackResponse(originalQuery);
  }

  fallbackResponse(query) {
    const lowerQuery = query.toLowerCase();

    // Rule-based responses for common queries
    if (lowerQuery.includes("ctf") || lowerQuery.includes("write")) {
      return `Priority recommendation: Write 3 CTF write-ups this weekend. Pick HTB/THM machines you've solved and document: Challenge → Recon → Exploitation → PoC → Lessons Learned. This fills your biggest gap.`;
    }

    if (lowerQuery.includes("cert") || lowerQuery.includes("security+")) {
      return `Certification roadmap: Network+ (Nov 2025) → Security+ (Dec 2025) → eJPT (Jan 2026). Network+ is achievable in 3-4 weeks with focused study. Use Professor Messer's free videos and practice exams.`;
    }

    if (lowerQuery.includes("tool") || lowerQuery.includes("github")) {
      return `Extract 3 tools from Syn_OS: (1) Port scanner, (2) HTTP header analyzer, (3) Reverse shell generator. Create standalone repos with professional READMEs. This proves you can ship code, not just write it.`;
    }

    if (
      lowerQuery.includes("ai") ||
      lowerQuery.includes("llm") ||
      lowerQuery.includes("red team")
    ) {
      return `AI Red Teaming needs proof: Document 3 LLM jailbreak attempts (ChatGPT/Claude), create prompt injection PoC, write blog post "Breaking AI Guardrails Responsibly". Your claims need artifacts.`;
    }

    if (
      lowerQuery.includes("job") ||
      lowerQuery.includes("hire") ||
      lowerQuery.includes("interview")
    ) {
      return `For job applications: (1) Fix portfolio XSS vulnerabilities first (shows security awareness), (2) Get Security+ (HR requirement), (3) Have 3 CTF write-ups ready for technical interviews, (4) Practice explaining Syn_OS honestly ("learning OS internals" not "quantum consciousness").`;
    }

    if (lowerQuery.includes("next") || lowerQuery.includes("should i")) {
      return `Immediate next step: Pick ONE action from quick wins. I recommend CTF write-up (2-3 hours, immediate portfolio improvement). Choose an HTB machine you solved, document your methodology, publish by Sunday night.`;
    }

    if (lowerQuery.includes("syn_os") || lowerQuery.includes("synos")) {
      return `Syn_OS positioning: You have real code (~18k lines C) but "consciousness" and "quantum" buzzwords hurt credibility. Rebrand as "experimental security-focused Linux distribution" and remove sci-fi terminology. Make it bootable (even minimal) for demos.`;
    }

    // Default response
    return `Focus on filling critical gaps: CTF write-ups, security certifications, and fixing portfolio vulnerabilities. Type 'advisor status' for full recommendations or ask a specific question about your career path.`;
  }

  getStatus() {
    return {
      grade: this.portfolioContext.currentGrade,
      potential: this.portfolioContext.potentialGrade,
      topPriorities: this.portfolioContext.quickWins.slice(0, 3),
      aiReady: this.isReady,
      aiStatus: this.isReady
        ? "Ready"
        : this.isLoading
        ? "Loading..."
        : "Not initialized",
    };
  }
}

// Export singleton instance
export const aiAdvisor = new AIAdvisor();
