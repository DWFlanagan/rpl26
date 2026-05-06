---
name: rpl26
description: Use when connected to the rpl26 MCP server to write, test, annotate, save, inspect, or export readable User RPL-inspired programs.
---

# rpl26 Readable RPL Authoring

Use this skill when a user asks to work with `rpl26`, the connected `rpl26` MCP server, readable RPL, annotated RPL, stored calculator programs, or calculator-oriented User RPL source export.

## Core Rule

The executable program is an RPL program stored as a normal variable. Treat that variable as the executable source of truth.

Annotated source is the readable authoring form. Use `@ comments` for explanation, stack effects, examples, and intent. Comments are ignored by execution. `hp48-user-rpl` export strips comments for calculator-oriented source output.

Do not invent unsupported RPL behavior.

## Workflow

1. Inspect the session if context matters: `get_stack`, `get_variables`, `list_programs`, and `get_trace`.
2. Use session tools such as `list_sessions`, `create_session`, `select_session`, `delete_session`, `get_session_status`, `save_session`, and `load_session` when the user asks for named sessions, persistence, or project handoff.
3. Use `get_program_source` or `inspect_program` before editing an existing program.
4. Write a small named program as annotated RPL source.
5. Store it with `store_program`.
6. Run examples with `run_program_examples`.
7. If examples fail, revise the executable RPL first, then revise comments to match behavior.
8. Save sessions or projects when the user asks.
9. Use `export_program` with `rpl26` for readable source and `hp48-user-rpl` for stripped calculator-oriented source.

## Annotated Source Style

Start programs with purpose and stack-effect comments:

```rpl
<<
  @ AREA(width, height)
  @ Multiply width by height and leave area on the stack.
  @ Stack: width height -> area
  *
>>
```

Keep executable RPL terse and real. Do not put pseudo-code in executable positions. Prose belongs in `@ comments`.

Stack-effect comments should name the stack contract:

```rpl
@ Stack: width height -> area
```

## Testing Style

Every stored program should have at least one concrete example unless the user explicitly asks only for a sketch.

Example record:

```json
{
  "input": "3 4 AREA",
  "expectedStack": [{ "kind": "real", "value": 12 }]
}
```

Run examples before claiming the program works.

## Scope Discipline

Avoid CAS, symbolic algebra, exact algebra, units, matrices, plotting, graphics, directories, HP binary object formats, System RPL, and real interactive input unless the user explicitly asks to design future behavior.

If the user asks for a program that "asks" for input, represent inputs in comments and stack effects. Let the agent, GUI, or human collect values outside the RPL evaluator for now.

## Export

Use `export_program`:

- `mode: "rpl26"` preserves readable `@ comments`.
- `mode: "hp48-user-rpl"` strips comments for calculator-oriented source.

`hp48-user-rpl` export is source-oriented and limited to the implemented `rpl26` subset. Do not promise binary transfer, ROM compatibility, full HP validation, or support for commands outside that subset.
