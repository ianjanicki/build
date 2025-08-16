# Build

An open-source agent orchestration platform for physical world tasks.

## Vision

Turn digital plans into physical reality by orchestrating agents, labor, and capital. Start simple (furniture assembly) and scale to complex construction projects.

## Features

- **AI-Powered Planning**: Dynamic schema generation and task planning based on user input
- **Interactive CLI**: Simplified dev command with clean plan management
- **Provider-Agnostic**: All external services behind swappable adapters (currently using mocks)
- **Plan-First**: Generate task graphs before execution with detailed cost estimates
- **Human-in-the-Loop**: Approvals at critical points with safety controls
- **Local-First**: Works with mock adapters, no external dependencies required
- **Comprehensive Testing**: Automated evaluation system with natural language prompts

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
git clone https://github.com/ianjanicki/build.git
cd build
npm install
```

### Usage

Start the interactive development mode:

```bash
npm run dev
```

This opens a clean interface where you can:
- **Create new plans** interactively
- **Execute existing plans** with status tracking
- **Run evaluations** to test the system

## Commands

### Main Commands

```bash
npm run dev          # Interactive development mode (recommended)
npm run plan         # Create a new project plan interactively
npm run test         # Run evaluation tests
npm run interactive  # Full interactive wizard
```

### Direct CLI Commands

```bash
# Interactive planning
npx tsx src/cli.ts plan --interactive

# Execute a specific plan
npx tsx src/cli.ts run .output/project-name/project.json --dry-run

# Run evaluations
npx tsx src/cli.ts test
```

## Project Structure

```
src/
├── commands/
│   ├── dev.ts        # Main interactive interface
│   ├── plan.ts       # Project planning
│   ├── run.ts        # Plan execution
│   └── test.ts       # Evaluation system
├── ai/
│   ├── ai-schema-generator.ts      # AI SDK integration (model-agnostic)
│   └── mock-schema-generator.ts    # Mock AI generator
├── types/0.0.0/      # Versioned type definitions
├── schemas/v0.ts     # Zod validation schemas
└── utils/            # Project management utilities

tests/
├── eval-prompts.json # Natural language test prompts
└── mock-labor-adapter.ts

.output/              # Generated project files (gitignored)
└── project-name/
    └── project.json  # Complete project state
```

## How It Works

### 1. Planning Phase
- **Interactive Input**: Describe your project in natural language
- **AI Analysis**: System generates project specifications, requirements, and constraints
- **Follow-up Questions**: AI asks clarifying questions about tools, safety, etc.
- **Task Generation**: Creates detailed task plan with dependencies and estimates

### 2. Execution Phase
- **Pre-execution Checks**: Budget validation, approval requirements
- **Task Execution**: Runs tasks with mock labor marketplace integration
- **Status Tracking**: Real-time updates on task completion
- **Interactive Control**: Choose tasks, modify estimates, add new tasks

### 3. Project Management
- **Status Tracking**: `[PLAN]`, `[EXECUTE]`, `[COMPLETED]`
- **Continue Execution**: Resume in-progress projects
- **Plan Reset**: Start completed projects from beginning
- **Dry Run Mode**: Test execution without side effects

## Examples

### Simple Furniture Assembly
```
Project: IKEA Malm Bed Assembly
Status: [PLAN]
Tasks:
  • Site Preparation (0.5h, $10)
  • Assembly (2h, $60) 
  • Quality Check (0.25h, $7.5)
Total: 2.75h, $77.5
```

### Complex Projects
The system scales to handle:
- Room renovations
- Deck construction
- Kitchen installations
- Any physical world task

## AI Integration

### AI Integration (Coming Soon)
The system is designed to support multiple AI providers through the AI SDK:

```bash
# OpenAI
export OPENAI_API_KEY=your_key_here

# Anthropic (future)
export ANTHROPIC_API_KEY=your_key_here

# Local models (future)
export OLLAMA_HOST=http://localhost:11434
```

### Mock Mode (Current Default)
Currently using intelligent mock generators that simulate:
- Project specification generation
- Task planning
- Follow-up questions
- Tool requirements

The AI SDK integration is ready but needs final testing with the latest SDK version.

## Testing

The evaluation system uses natural language prompts:

```json
{
  "prompt": "I want to assemble an IKEA Malm bed frame...",
  "expectedOutcomes": {
    "totalHours": {"min": 2.0, "max": 4.0},
    "totalCost": {"min": 60, "max": 120}
  },
  "evaluationCriteria": [
    "Plan includes safety considerations",
    "Tasks have logical dependencies"
  ]
}
```

Run evaluations:
```bash
npm run test
```

## Development

### Architecture Principles

- **Provider-Agnostic**: All external services behind narrow interfaces
- **Type-Safe**: Comprehensive TypeScript types with Zod validation
- **Versioned Schemas**: Semantic versioning for project schemas
- **Event-Sourced**: Deterministic and replayable execution
- **Local-First**: Works offline with mock adapters

### Adding New Features

1. **New Adapters**: Implement interfaces in `src/adapters/`
2. **New Commands**: Add to `src/commands/`
3. **Schema Updates**: Version in `src/types/`
4. **Tests**: Add natural language prompts to `tests/eval-prompts.json`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Roadmap

- [ ] Real labor marketplace integrations
- [ ] Payment processing
- [ ] Site survey automation
- [ ] Communication layer (SMS/email)
- [ ] CAD integration
- [ ] Permit automation
- [ ] Construction project scaling
