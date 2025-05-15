# 📄 Design Document: hack-helper (Hackathon Project)

## 📌 Objective

To build a CLI-based project starter and enhancer tool called **hack-helper**, powered by **Mastra** agent framework. The tool helps users bootstrap and progressively evolve full-stack projects using AI-powered agents, tools, and deployers.

## 🎯 Goals

- Let users describe a project idea via a prompt.
- Automatically parse the idea into logical components.
- Generate a scaffold for the project.
- Allow prompt-based feature enhancement and code insertion.
- Optionally deploy the project using Mastra deployers.
- Provide a seamless CLI experience with minimal configuration.

---

## 🧱 System Architecture

```txt
User
 └──> CLI (Node.js based)
       └──> OrchestratorAgent (Mastra)
              ├──> BriefExtractorAgent
              ├──> BriefParserAgent
              ├──> PlannerAgent
              ├──> ScaffolderAgent
              ├──> FeatureEnhancerAgent (new)
              ├──> BoardPublisherAgent
              └──> DeployerAgent (Mastra deployer plugin)
```

---

## 🧠 Agent Responsibilities

### OrchestratorAgent

- Central coordinator exposed via CLI.
- Delegates task to internal sub-agents.

### BriefExtractorAgent ✅ **(New)**

- Sends user’s project idea prompt to LLM.
- Returns a structured brief/sample.
- Feeds result into BriefParserAgent.

### BriefParserAgent

- Extracts modules/components from structured brief.
- No external tools used.

### PlannerAgent

- Plans step-by-step roadmap.
- Tool: `persistPlan` (writes plan JSON).

### ScaffolderAgent

- Generates project structure and boilerplate code.
- Tool: `writeScaffold`.

### FeatureEnhancerAgent ✅ **(New)**

- Accepts follow-up prompts like "add login form" or "support file uploads".
- Updates existing scaffold with working code.
- Uses Mastra's dynamic toolset (e.g. `insertCode`, `modifyRoutes`, etc).

### BoardPublisherAgent

- Publishes plan/tasks to Trello.
- Tools: `trello.createBoard`, `trello.createCard`.

### DeployerAgent ✅ **(New)**

- Supports deploying project via Mastra deployers.
- E.g. Vercel, Netlify, Fly.io, or container-based deployment.

---

## 🧪 CLI Capabilities

- `hack-helper init` → Initializes project from idea prompt.
- `hack-helper add "user auth"` → Adds feature to existing project.
- `hack-helper deploy` → Deploys the project.
- `.env` file used for API keys and config.

---

## 🔐 OpenAI API Key Handling

- CLI checks for `OPENAI_API_KEY` in `.env`.
- If missing, prompts user and saves locally.
- Injected into Mastra’s LLM client runtime.

---

## ⚡ Development Priorities

1. Implement CLI wrapper using `commander`, `enquirer`, `chalk`.
2. Set up orchestrator and sub-agents.
3. Implement BriefExtractor → Parser → Planner flow.
4. Build scaffolder tools and write logic.
5. Build dynamic feature enhancer tools.
6. Add deployer hooks.
7. Wrap final testing and polish UX.

---

## 🏁 Output

- Fully working CLI tool to launch and expand projects from prompts.
- Uses Mastra for orchestrated agent calls and tool execution.
- Minimally configurable, ready for hackathon usage.
