# koban-research

Smart AI agent that can detect vulnerabilities in your solidity codebase.

![Frame 1 (8)](https://github.com/user-attachments/assets/31da9ebc-046a-46b4-9d85-e6b91804d3b1)


## Note
This project at early concept stage. Everything in this repo is subject to change. Nothing is optimized or adjusted to production quality. Just PoC.

## We've already solved
- [damn-vulnerable-defi](https://www.damnvulnerabledefi.xyz/)
- [eco protocol](https://audits.sherlock.xyz/contests/80?filter=results)

## Architecture
For the demonstration, we use a simple `[Agents..] -> Aggregator` architecture. We generate N queries to different LLMs, analyze the responses and aggregate them through an additional call to the `Aggregator` or `Synthesizer`, it identifies the most likely vulnerabilities.

With good prompt optimization, `o1-preview` model is able to identify vulnerabilities in real-world [contests](./reports/eco-protocol/) and production.

![Architecture](./assets/arch.jpg)

## Basic limitations
- Currently we limited by LLM's context window. Biggest models support up to 128000 tokens ±3000 nSLOC. But this could be potentially solved by analyzing different parts of AST.
- We can't create a PoC because at the moment it complicates the architecture too much and is beyond the scope of the demo, however we plan to make it a priority.
