/**
 * Agent-friendly vitest runner.
 * Invokes vitest programmatically via Node so the agent sandbox doesn't need
 * to execute a .bin symlink (which is blocked). Run with:
 *   node run-vitest.mjs
 */
import { startVitest } from 'vitest/node';

const vitest = await startVitest('test', [], { run: true });
const failed = (vitest?.state.getCountOfFailedTests() ?? 1) > 0;
await vitest?.close();
process.exit(failed ? 1 : 0);
