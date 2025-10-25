// AI-Powered Advisor using Hugging Face Inference API
// This version uses the HF API instead of in-browser models for better responses

class AIAdvisor {
  constructor() {
    this.apiKey = null; // User will set this
    this.conversationHistory = [];

    // Portfolio context for AI
    this.portfolioContext = {
      owner: "Ty Limoges (DiabloRain)",
      role: "Cybersecurity Student & Anesthesia Technician",
      currentGrade: "B+ (83/100)",
      potentialGrade: "A- (90/100)",
      strengths: [
        "~18,000 lines of kernel-level C code (Syn_OS project)",
        "Professional build system (487-line Makefile)",
        "Multi-language codebase (C, Rust, Python, Go, JavaScript)",
        "5+ years critical infrastructure experience (Level 1 Trauma Center)",
        "Active on HTB, THM, OverTheWire, HackAPrompt",
        "Building security-focused Linux distribution",
        "Team leadership (trained 13 technicians)",
        "HIPAA compliance expertise",
        "Published technical blog (shelldiablo33.substack.com)",
        "5 published works: C development, cybersecurity fundamentals, AI consciousness theory, Red Team Playbook, Red Team Certification Roadmap",
        "Comprehensive certification research (20+ certs analyzed, 81+ citations)",
        "Strategic framework: Two-Axis evaluation (HR Recognition vs Technical Credibility)",
        "Red Team Playbook framework (18 UKC phases, MITRE ATT&CK, cert mapping)",
      ],
      gaps: [
        "No CTF write-ups documented publicly",
        "No security tool showcases or GitHub repos",
        "Missing certifications (Network+, Security+, eJPT)",
        "Security vulnerabilities in portfolio (XSS, no CSP)",
        "Syn_OS not bootable yet (early alpha)",
      ],
      quickWins: [
        "Write 3 CTF write-ups this weekend (HTB/THM)",
        "Extract 3 security tools from Syn_OS to GitHub",
        "Fix portfolio XSS vulnerabilities + add CSP",
        "Document LLM jailbreak research",
        "Schedule Network+ exam (target: Nov 2025)",
      ],
      timeline: {
        immediate: "CTF write-ups + fix portfolio security (this week)",
        week2: "Security tools extraction + CTF content",
        week3: "AI red teaming blog post + interactive demos",
        week4: "Content marketing + bug bounty profiles",
        threeMonths: "Network+ → Security+ → eJPT certified",
      },
    };
  }

  async chat(userQuery, useAPI = false) {
    // Try API first if key is set, fallback to rule-based
    if (useAPI && this.apiKey) {
      try {
        return await this.chatWithAPI(userQuery);
      } catch (error) {
        console.warn("API failed, using rule-based:", error);
        return this.ruleBased(userQuery);
      }
    }

    return this.ruleBased(userQuery);
  }

  async chatWithAPI(userQuery) {
    const prompt = this.buildPrompt(userQuery);

    const response = await fetch(
      "https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_length: 200,
            temperature: 0.7,
            top_p: 0.9,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const result = await response.json();
    return this.formatAPIResponse(result);
  }

  buildPrompt(userQuery) {
    return `You are an expert cybersecurity career advisor. Ty is a cybersecurity student building a portfolio. Current grade: ${this.portfolioContext.currentGrade}. Main gaps: no CTF write-ups, missing certifications, security vulnerabilities in portfolio. Question: ${userQuery}\n\nAdvice:`;
  }

  formatAPIResponse(result) {
    if (Array.isArray(result) && result[0]?.generated_text) {
      return result[0].generated_text.replace(/^.*Advice:/i, "").trim();
    }
    return "Let me help you with that...";
  }

  ruleBased(query) {
    const lowerQuery = query.toLowerCase();

    // Conversational responses
    if (lowerQuery.includes("hello") || lowerQuery.includes("hi")) {
      return `👋 Hey! I'm your AI career advisor. I've analyzed your portfolio (current grade: ${this.portfolioContext.currentGrade}). What would you like to work on? Try asking about CTFs, certifications, or next steps.`;
    }

    if (lowerQuery.includes("status") || lowerQuery === "how am i doing") {
      return `📊 Portfolio Status:\n\n✅ Strong: ${this.portfolioContext.strengths[0]}\n✅ ${this.portfolioContext.strengths[4]}\n\n❌ Critical Gap: ${this.portfolioContext.gaps[0]}\n❌ ${this.portfolioContext.gaps[3]}\n\n🎯 Top Priority: ${this.portfolioContext.quickWins[0]}\n\nCurrent: ${this.portfolioContext.currentGrade} → Potential: ${this.portfolioContext.potentialGrade}`;
    }

    if (lowerQuery.includes("ctf") || lowerQuery.includes("write")) {
      return `📝 CTF Write-ups Strategy:\n\n1. Pick 3 HTB/THM machines you've solved\n2. Document: Challenge → Recon → Exploitation → PoC → Lessons\n3. Target: 1,000-1,500 words each\n4. Publish to Medium/Dev.to\n5. Add 'writeups' command to portfolio\n\n⏱️ Time: 2-3 hours per write-up\n🎯 Impact: Fills biggest credibility gap\n💡 Start with easiest machine first`;
    }

    if (
      lowerQuery.includes("cert") ||
      lowerQuery.includes("security+") ||
      lowerQuery.includes("network+") ||
      lowerQuery.includes("oscp") ||
      lowerQuery.includes("ejpt")
    ) {
      return `🎓 Certification Roadmap (Research-Backed):\n\nYou've published comprehensive certification research analyzing 20+ certs with 81+ industry citations. Your roadmap follows the proven "Self-Funded High-ROI Path":\n\n📅 Phase 1: Building the Bedrock (Now - Q1 2026)\n   ├─ Network+: Nov 2025 (~$369) - Foundation\n   ├─ Security+: Dec 2025 (~$404) - Industry baseline\n   └─ Linux+: Q1 2026 (~$369) - Essential for tools\n\n📅 Phase 2: Offensive Tactics (Q1-Q2 2026)\n   ├─ eJPT: Q1 2026 (~$249) - Best first practical cert\n   ├─ PenTest+: Q2 2026 (~$404) - Methodology validation\n   └─ PNPT: Q2 2026 (~$299) - Real-world AD simulation\n\n📅 Phase 3: Gold Standard (Mid-2026)\n   └─ OSCP: ~$1,749 - Industry gold standard (24hr exam)\n\n💡 Key Insights from Your Research:\n   • eJPT = Best ROI ($249 for hands-on skills)\n   • PNPT = Real corporate network + live debrief\n   • CEH = Skip unless employer pays (HR filter only)\n   • OSCP = Maximum resume impact, technical respect\n\n� Total Self-Funded Cost: ~$3,000 for professional-level\n🎯 Timeline: 18 months to OSCP\n\nType 'certs' to see full strategic analysis!`;
    }

    if (
      lowerQuery.includes("tool") ||
      lowerQuery.includes("github") ||
      lowerQuery.includes("repo")
    ) {
      return `🛠️ Security Tools to Extract from Syn_OS:\n\n1. Port Scanner (Python)\n   - Async scanning, colorized output\n   - Repo name: 'portsweeper'\n\n2. HTTP Header Analyzer (Go)\n   - Security header checker\n   - Repo name: 'httpeek'\n\n3. Reverse Shell Generator (Rust)\n   - Multiple payload types\n   - Repo name: 'shellshock'\n\n📦 Each needs:\n- Professional README\n- Usage examples\n- Installation instructions\n- Screenshots/GIFs\n\n⏱️ Time: 1-2 days\n🎯 Impact: Proves you ship code`;
    }

    if (
      lowerQuery.includes("ai") ||
      lowerQuery.includes("llm") ||
      lowerQuery.includes("red team") ||
      lowerQuery.includes("jailbreak")
    ) {
      return `🤖 AI Red Teaming Evidence Needed:\n\n1. LLM Jailbreak Research\n   - 3 successful bypasses (ChatGPT/Claude)\n   - Document methodology\n   - Responsible disclosure\n\n2. Prompt Injection PoC\n   - Create demo application\n   - Show attack vectors\n   - Mitigation strategies\n\n3. Blog Post\n   - "Breaking AI Guardrails Responsibly"\n   - 2,000+ words, technical depth\n   - Publish + share on LinkedIn\n\n⏱️ Time: 1 week\n🎯 Impact: Substantiates AI security claims`;
    }

    if (
      lowerQuery.includes("job") ||
      lowerQuery.includes("hire") ||
      lowerQuery.includes("interview") ||
      lowerQuery.includes("apply")
    ) {
      return `💼 Job Application Strategy:\n\n🔧 Before applying:\n1. Fix portfolio XSS vulns (shows security awareness)\n2. Get Security+ cert (HR requirement)\n3. Have 3 CTF write-ups ready\n4. Clean up Syn_OS messaging\n\n🎯 During interviews:\n1. Lead with medical → cyber story\n2. Explain Syn_OS honestly ("learning OS internals")\n3. Discuss specific CTF challenges solved\n4. Show genuine curiosity + learning mindset\n\n🚫 Avoid:\n- "Quantum consciousness" terminology\n- Claiming team of 8 developers\n- Overpromising on AI capabilities\n\n✅ Emphasize:\n- 18k lines of real code\n- Critical infrastructure experience\n- Active learning (HTB, THM)`;
    }

    if (
      lowerQuery.includes("next") ||
      lowerQuery.includes("should i") ||
      lowerQuery.includes("what do")
    ) {
      return `🎯 Your Next Action (Choose ONE):\n\n🥇 OPTION 1: CTF Write-up (RECOMMENDED)\n   Time: 2-3 hours\n   Impact: High\n   Difficulty: Medium\n   → Pick HTB machine, start writing\n\n🥈 OPTION 2: Fix Portfolio Security\n   Time: 1-2 hours\n   Impact: Medium\n   Difficulty: Easy\n   → Add CSP header + input sanitization\n\n🥉 OPTION 3: Extract One Tool\n   Time: 3-4 hours\n   Impact: Medium\n   Difficulty: Medium\n   → Port scanner to GitHub\n\n💡 Recommendation: Do Option 1 this weekend. Immediate visible improvement to portfolio.`;
    }

    if (
      lowerQuery.includes("syn_os") ||
      lowerQuery.includes("synos") ||
      lowerQuery.includes("quantum") ||
      lowerQuery.includes("consciousness")
    ) {
      return `🔧 Syn_OS Repositioning:\n\n✅ What's Real:\n- ~18k lines of kernel C code\n- Professional build system\n- Custom schedulers, memory managers\n- Active development (48k git objects)\n\n❌ What Hurts Credibility:\n- "Consciousness" terminology\n- "Quantum" buzzwords\n- "Interdimensional" features\n- Not bootable yet\n\n🎯 Rebrand As:\n"Experimental security-focused Linux distribution for learning OS internals and kernel development"\n\n📝 Action Items:\n1. Global find/replace problematic terms\n2. Update all READMEs\n3. Add "Early Alpha (v0.3)" disclaimer\n4. Focus on bootable minimal demo`;
    }

    if (
      lowerQuery.includes("blog") ||
      lowerQuery.includes("write") ||
      lowerQuery.includes("article")
    ) {
      return `✍️ Blog Status & Writing Strategy:\n\n✅ PUBLISHED (shelldiablo33.substack.com):\n\n1. "The Complete Guide to Building Production-Grade C Projects"\n   • Professional C development workflows\n   • Makefile mastery, CI/CD, testing\n   • Directly showcases Syn_OS expertise\n\n2. "Cybersecurity Fundamentals - But Actually Useful"\n   • Practical security principles\n   • Real-world applications\n   • Demonstrates security knowledge\n\n3. "A Humble Attempt at Theory of Consciousness"\n   • AI, neuroscience, philosophy intersection\n   • Shows intellectual depth\n   • Relevant to AI safety research\n\n4. "Red Teamer's Comprehensive Playbook Framework" ⭐ NEW!\n   • 18-phase Unified Kill Chain breakdown\n   • MITRE ATT&CK integration\n   • Cert mapping: PenTest+, CEH, OSCP, PNPT, CySA+\n   • Blue team detection/mitigation for each phase\n   • Academic (SNHU 8 categories) + professional use\n   • 81+ citations, comprehensive TTP documentation\n\n� STRENGTHS PROVEN:\n   ✅ Technical writing ability (4 comprehensive articles)\n   ✅ Systems programming expertise (C development guide)\n   ✅ Security fundamentals (cybersecurity guide)\n   ✅ Red team methodology (UKC playbook)\n   ✅ Theoretical depth (consciousness research)\n   ✅ Certification preparation (living study guide)\n\n�📅 NEXT POSTS (Recommendation):\n\nWeek 1: CTF Write-up (HTB/THM machine)\n   • 1,500-2,000 words\n   • Challenge → Recon → Exploit → PoC\n   • Fills last major gap in portfolio\n\nWeek 2: "Extracting Security Tools from Syn_OS"\n   • Showcase 3 tools you built\n   • Code walkthrough + usage\n   • Link to GitHub repos\n\nWeek 3: "AI Red Teaming: Breaking LLM Guardrails"\n   • Document your jailbreak research\n   • Responsible disclosure approach\n   • Leverage consciousness theory article\n\n🎯 Strategy: Your Red Team Playbook proves deep knowledge!\n💡 Now focus on practical demonstrations (CTF write-ups)`;
    }

    if (
      lowerQuery.includes("time") ||
      lowerQuery.includes("when") ||
      lowerQuery.includes("deadline")
    ) {
      return `⏰ 30-Day Timeline:\n\n📅 WEEK 1 (This week):\n${this.portfolioContext.timeline.immediate}\n\n📅 WEEK 2:\n${this.portfolioContext.timeline.week2}\n\n📅 WEEK 3:\n${this.portfolioContext.timeline.week3}\n\n📅 WEEK 4:\n${this.portfolioContext.timeline.week4}\n\n🎓 3-Month Goal:\n${this.portfolioContext.timeline.threeMonths}\n\n🎯 Focus: One major task per week. Consistent progress beats sporadic sprints.`;
    }

    if (lowerQuery.includes("help") || lowerQuery === "?") {
      return `💬 Ask me about:\n\n• "status" - Current portfolio assessment\n• "ctf" - CTF write-up strategy\n• "certs" - Certification roadmap\n• "tools" - GitHub project ideas\n• "ai red team" - Evidence you need\n• "jobs" - Application strategy\n• "next" - What to do right now\n• "syn_os" - Project repositioning\n• "blog" - Technical writing plan\n• "timeline" - 30-day roadmap\n\nOr ask any specific question about your career!`;
    }

    // Default intelligent response
    return `🤔 Interesting question! Based on your portfolio:\n\n• Current: ${this.portfolioContext.currentGrade}\n• Potential: ${this.portfolioContext.potentialGrade}\n\n🎯 Top priority: ${this.portfolioContext.quickWins[0]}\n\nTry asking about: "ctf writeups", "certifications", "next steps", or "status" for specific guidance.`;
  }

  getStatus() {
    return {
      grade: this.portfolioContext.currentGrade,
      potential: this.portfolioContext.potentialGrade,
      topPriorities: this.portfolioContext.quickWins.slice(0, 3),
      strengths: this.portfolioContext.strengths.slice(0, 3),
      gaps: this.portfolioContext.gaps.slice(0, 3),
    };
  }

  setAPIKey(key) {
    this.apiKey = key;
  }
}

// Create global instance
window.aiAdvisor = new AIAdvisor();
