# 🛠️ TODO — Hackathon Project with Mastra CLI Agent

A step-by-step checklist to build your CLI-based agent orchestrator using Mastra — optimized for rapid hackathon building and Windsurf use.

---

## ✅ High-Level Goals

- [ ] Set up CLI scaffold
- [ ] Implement orchestrator agent
- [ ] Create sub-agents with tools
- [ ] Wire CLI to the orchestrator
- [ ] Handle OpenAI API key securely
- [ ] Test full agent loop
- [ ] Polish UX and submit hackathon project

---

## 🧠 Phase 1: Project & CLI Setup

- [ ] Initialize project directory with structure:

```

/my-project/
├── cli/
├── agents/
├── tools/
├── prompts/
├── .env
└── index.ts

```

- [ ] Install CLI packages: `commander`, `enquirer`, `chalk`, etc.
- [ ] Create `cli/index.ts` with basic command parsing (e.g. `mycli run`)
- [ ] Add welcome message or banner

---

## 🧠 Phase 2: Mastra Orchestrator Agent

- [ ] Install Mastra core libraries:

```

npm install @mastra/core @mastra/agents

```

- [ ] Create `agents/orchestrator.agent.ts`
- [ ] Use `AgentNetwork` to wire the sub-agents
- [ ] Set orchestrator prompt: _“You delegate tasks to sub-agents to help users build.”_

---

## 🧠 Phase 3: Sub-Agents & Tools

- [ ] **BriefParserAgent**
- [ ] No tools needed
- [ ] Prompt: "Extract components from a product idea."

- [ ] **PlannerAgent**
- [ ] Tool: `persistPlan` → writes plan to JSON
- [ ] Prompt: "Create a step-by-step plan."

- [ ] **ScaffolderAgent**
- [ ] Tool: `writeScaffold` → generates files
- [ ] Prompt: "Scaffold code from a plan."

- [ ] **BoardPublisherAgent**
- [ ] Tools: `trello.createBoard`, `trello.createCard`
- [ ] Prompt: "Publish plan to Trello."

---

## 🧠 Phase 4: API Key + Runtime Config

- [ ] Ask for OpenAI API key in CLI if missing
- [ ] Store or pass via `.env`
- [ ] Inject into Mastra OpenAI client:

```ts
const llm = createOpenAIClient({
  apiKey: process.env.OPENAI_API_KEY,
});
```

- [ ] Warn and exit if no key provided
- [ ] (Optional) Allow user to enter key interactively and persist to `.env`

---

## 🧠 Phase 5: CLI Orchestration

- [ ] In CLI `run` command, instantiate orchestrator agent
- [ ] Parse user intent or idea from CLI prompt
- [ ] Delegate work to sub-agents sequentially:

  - BriefParserAgent → PlannerAgent → ScaffolderAgent → BoardPublisherAgent

- [ ] Display intermediate outputs nicely (e.g., plan steps, file structure)

---

## 🧪 Phase 6: Test & Polish

- [ ] Test entire flow end-to-end
- [ ] Handle and log errors clearly
- [ ] Add retry logic for failed tools
- [ ] Show progress indicator or animations for each sub-agent

---

## 🎁 Final Touches

- [ ] Add README with usage instructions
- [ ] (Optional) Add demo video or GIF
- [ ] Push to GitHub and submit to hackathon

---

Good luck — ship it fast and clean! 🚀

```

```
