# Build

An open-source agent orchestration platform for physical world tasks.

## Vision

Turn digital plans into physical reality by orchestrating agents, labor, and capital. Start simple (furniture assembly) and scale to complex construction projects.

## Features

- **AI-Powered Planning**: Dynamic schema generation and task planning based on user input
- **Interactive CLI**: npm init-style project creation with guided prompts
- **Provider-Agnostic**: All external services behind swappable adapters
- **Plan-First**: Generate task graphs before execution with detailed cost estimates
- **Human-in-the-Loop**: Approvals at critical points with safety controls
- **Local-First**: Works with mock adapters, no external dependencies required
- **Comprehensive Testing**: Automated test suite with simulated timeouts

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
npm install
```

### Quick Start

1. **Create a new project interactively**:

```bash
npx tsx src/cli.ts init
```

2. **Generate a plan**:

```bash
npx tsx src/cli.ts build my-project.json -p
```

3. **Execute the plan**:

```bash
npx tsx src/cli.ts build my-project.json -e -a
```

4. **Run tests**:

```bash
npx tsx src/cli.ts test
```

## Architecture

### Core Components

- **Schema System**: Versioned schemas (v0) with base types that can be extended
- **AI Schema Generator**: Dynamic schema and task plan generation
- **Project Manager**: Organized output with `./output/project-name/` structure
- **Task Engine**: Dependency-aware execution with mock adapters
- **CLI Interface**: Interactive commands with table formatting

### File Structure

```
src/
├── schemas/v0.ts          # Base schemas and versioning
├── ai/schema-generator.ts # AI-powered schema generation
├── utils/project-manager.ts # Project output management
├── agents/estimator.ts    # Cost estimation
├── engine.ts              # Task execution engine
├── adapters/labor/mock.ts # Mock labor marketplace
└── commands/
    ├── build.ts           # Main build command
    └── test.ts            # Test runner
```

## Development

### Commands

```bash
# Interactive project creation
npx tsx src/cli.ts init

# Generate plan only
npx tsx src/cli.ts build project.json -p

# Execute with auto-approval
npx tsx src/cli.ts build project.json -e -a

# Dry run (simulate without side effects)
npx tsx src/cli.ts build project.json -e -a -d

# Run automated tests
npx tsx src/cli.ts test
```

### Output Structure

Projects are organized in `./output/project-name/`:
- `generated-schema.json` - AI-generated schema and task template
- `project-plan.json` - Complete task plan with estimates
- `execution-log.json` - Execution results (when run)

## Examples

The system now supports any type of project through AI-generated schemas. Examples include:

- Furniture assembly (easy/medium/hard complexity)
- Custom structures
- Installations
- Any physical world task

## Testing

The test suite includes:
- Automated project creation
- Schema generation simulation
- Task planning validation
- Execution dry-runs
- Simulated API timeouts

## License

MIT
