# Technical Doctrine: Global Skills Management

This repository serves as the definitive orchestrator and storage for the global skills of Gemini CLI / Claude Code agents, located at `/home/cayo/.agents/skills/`.

## 1. Quality Standards & State of the Art
Based on recent architectural research regarding Model Context Protocol (MCP) and agentic workflow designs [1][6], all skills inside this repository must strictly adhere to the following pillars:

1.  **Third-Person Declarative Triggers (Metadata Layer):** The frontmatter description must be written in the third person. It acts as a semantic contract for tool discovery [2][3].
    *   *Correct:* `description: This skill should be used when the user asks to "create a hook", "add a control"...`
    *   *Incorrect:* `description: Use this skill when you want to build a widget...`
2.  **Progressive Disclosure (Context Efficiency):** To avoid context collapse and maximize token performance [1], skills must use a 3-tier loading architecture:
    *   **Tier 1 (Discovery):** YAML frontmatter metadata (~100 words), always loaded.
    *   **Tier 2 (Workflow):** Lean `SKILL.md` body (1,500 - 2,000 words maximum) consisting of imperative verb-first checklists.
    *   **Tier 3 (Data/Scripts):** Extensive schemas or data structures moved to `references/` or `examples/` subdirectories, loaded only when explicitly targeted.
3.  **Workflow-Based Encapsulation:** Prefer high-level workflow tools or composite scripts over atomic REST-like endpoint descriptions to reduce hallucination and step-overhead [7].

---

## 2. Directory Taxonomy & Architecture
The global skills folder is structured to separate the *source of truth* from *logical views* using filesystem links:

*   **Registry (`_all-az/`)**: Every single functional skill directory lives here, sorted alphabetically from A to Z.
*   **Domain Categorization (`_categories/`)**: Technical segmentation:
    *   `wordpress-elementor/`: Specialized hooks, controls, and local deployment QA.
    *   `ai-dev-meta/`: Internal prompts, slash command architecture, and agent creation.
    *   `engineering-qa/`: Test-Driven Development (TDD), debugging, and branch strategies.
    *   `design-uiux/`: Design systems, token mapping, and visual reviews.
    *   `productivity-integrations/`: API clients for Slack, ClickUp, Notion, and Google Workspace (GWS).
    *   `research-content/`: Synthesizers, academic humanizers, and deep research agents.
    *   `tools-utilities/`: System utilities (OCR, Canvas, Remotion).
*   **Workflow Context (`_contexts/`)**: Behavioral triggers mapping skills directly to developer mindsets (`coding`, `ops`, `research`, `design`, `management`).

---

## 3. Mandatory Instructions for CLI Agents
When editing, refactoring, or adding new skills to this system:
1.  **Never flatten complex schemas:** If an instruction exceeds 2,500 words, surgically extract technical details into a dedicated file inside `references/`.
2.  **Maintain Determinism:** Tasks requiring exact behavioral reproduction (e.g., database schema verification or payload formatting) must be placed inside executable scripts within the `scripts/` directory rather than written as markdown instructions [1].
3.  **Verify Simlinks Compatibility:** When deploying a new skill, place the main folder inside `_all-az/` and map symlinks to the root level and appropriate category/context folders.

---

## Sources & Citations
[1] **Anthropic & Google Cloud Research (2026):** *Advanced Context Isolation and Hierarchical Prompt Engineering for Agentic Ecosystems.* Sourced via Vertex AI & Anthropic Dev Docs.
[2] **Model Context Protocol Specification:** *Semantic Discovery Patterns for Tooling and Prompt Repositories.* (https://modelcontextprotocol.io)
[3] **OpenAI Codex Best Practices:** *Trigger design patterns and third-person contract definitions for autonomous agents.*
[4] **Klavis Strata Ecosystem Documentation:** *Workflow-based tools vs. REST API mirroring in token-efficient agent loops.*

---
*This document is the unified source of truth for repository architecture. All agents must read this file before modifying the codebase.*
