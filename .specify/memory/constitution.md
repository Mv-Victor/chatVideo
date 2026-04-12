<!--
SYNC IMPACT REPORT
==================
Version change: (unversioned template) → 1.0.0
Modified principles: N/A (initial population from template)
Added sections:
  - Core Principles (I–V)
  - Technology Stack
  - Development Workflow
  - Governance
Removed sections: N/A (replaced all template placeholders)
Templates reviewed:
  - .specify/templates/plan-template.md   ✅ Constitution Check section present; aligns with principles
  - .specify/templates/spec-template.md   ✅ Mandatory sections and FR/SC pattern align with principles
  - .specify/templates/tasks-template.md  ✅ Phase structure supports conversational-first and simplicity principles
Deferred TODOs:
  - TODO(RATIFICATION_DATE): Exact open-source date confirmed as 2026-02-10 from README NEWS section.
-->

# FireRed-OpenStoryline Constitution

## Core Principles

### I. Conversational-First Interface

Every user-facing capability MUST be accessible through natural language conversation.
The system MUST NOT require users to learn command syntax or configuration schemas
to perform standard video creation tasks. GUI and CLI surfaces are secondary delivery
mechanisms; the conversational MCP/Agent interface is the primary contract.

**Rationale**: The project's stated mission is to make video creation "easy and
friendly to beginners and creative enthusiasts alike." Any feature that is only
reachable via non-conversational means violates this mission.

### II. Modular Node Architecture

Video processing capabilities MUST be implemented as discrete, independently
testable nodes under `src/open_storyline/nodes/`. Each node MUST:
- Declare explicit input/output schemas via `node_schema.py`.
- Be registerable through `node_manager.py` without modifying other nodes.
- Carry no direct dependencies on sibling nodes (orchestration belongs to the agent layer).

**Rationale**: Modularity enables parallel development, isolated testing, and safe
extensibility of the processing pipeline without systemic regressions.

### III. Prompt-as-Configuration

LLM behaviour MUST be governed by externalized prompt files stored under `prompts/`
(organized by task and locale). Prompt logic MUST NOT be hard-coded in Python source.
Bilingual support (zh/en) is REQUIRED for all user-facing prompts.

**Rationale**: Externalizing prompts allows non-engineers to iterate on model
behaviour, supports A/B evaluation, and makes locale additions a file-level
change rather than a code change.

### IV. Skill Archiving & Reproducibility

Any complete editing workflow that is demonstrated to produce acceptable output
MUST be expressible as a reusable Skill stored under `.storyline/skills/`. Skills
MUST be self-contained: media paths may be parameterized, but all style/effect
decisions MUST be encoded within the skill definition. Skills MUST be applicable
to new media without code changes.

**Rationale**: "Editing Skill Archiving" is a headline feature. Constitution-level
enforcement ensures it remains a first-class concern during design reviews.

### V. Simplicity & Incremental Complexity

The simplest solution that satisfies the requirement MUST be chosen. Additional
abstractions, dependencies, or architectural layers MUST be justified by a concrete
current need — not anticipated future need (YAGNI). Every complexity trade-off MUST
be documented in the relevant plan.md Complexity Tracking table.

**Rationale**: The codebase serves a research and open-source audience. Unnecessary
complexity raises the barrier to contribution and increases maintenance burden.

## Technology Stack

- **Language**: Python ≥ 3.11 (REQUIRED; no earlier versions supported).
- **Core dependencies**: MoviePy, FFmpeg, LangChain — additions MUST be justified
  in the feature plan and recorded in `requirements.txt`.
- **Interfaces**: MCP server (`src/open_storyline/mcp/server.py`), FastAPI web
  (`agent_fastapi.py`), CLI (`cli.py`). All three MUST remain functional on every
  release.
- **Configuration**: All runtime secrets and API keys MUST reside in `config.toml`
  (gitignored). Keys MUST NOT appear in source code, prompts, or logs.
- **License**: Apache 2.0. All added dependencies MUST carry a compatible license.

## Development Workflow

- Features MUST be specified via `speckit.specify` before implementation begins.
- Implementation plans MUST include a Constitution Check section verifying alignment
  with all five Core Principles before Phase 0 research proceeds.
- Pull requests MUST reference the relevant spec or task ID.
- Docker image MUST remain buildable and functional after each release tag.
- Agent Skills (`openstoryline-install`, `openstoryline-use`) MUST be updated
  whenever the installation or runtime invocation procedure changes.

## Governance

This constitution supersedes all other development guidelines. In case of conflict,
the constitution takes precedence.

**Amendment procedure**:
1. Propose change in a PR with a rationale comment referencing the affected principle.
2. Increment `CONSTITUTION_VERSION` per semantic versioning rules defined in the
   speckit.constitution skill (MAJOR / MINOR / PATCH).
3. Update `LAST_AMENDED_DATE` to the merge date.
4. Run consistency propagation across all `.specify/templates/` files and document
   results in the Sync Impact Report embedded at the top of this file.
5. All open feature specs and plans MUST be reviewed for compliance within one sprint
   of any MAJOR version amendment.

**Versioning policy**: MAJOR — principle removal or incompatible redefinition;
MINOR — new principle or material guidance expansion; PATCH — wording clarifications
and typo fixes.

**Compliance review**: Every plan.md Constitution Check section serves as the
per-feature compliance gate. The overall constitution health is reviewed at each
milestone release.

**Version**: 1.0.0 | **Ratified**: 2026-02-10 | **Last Amended**: 2026-04-13
