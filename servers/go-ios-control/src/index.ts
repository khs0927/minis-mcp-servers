import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { McpServer } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import * as z from 'zod/v4';
import { publicRunResult, runIos } from './runner.js';
import { assertBundleId, assertCoordinate, assertDuration, assertHttpUrl } from './validators.js';

const Udid = z.string().min(1).max(128).optional();
const BundleId = z.string().min(3).max(255);
const Coord = z.number().min(0).max(10000);

function text(value: unknown, isError = false) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }],
    ...(isError ? { isError: true } : {})
  };
}

async function invoke(args: string[], udid?: string, timeoutMs?: number) {
  const result = await runIos(args, { udid, timeoutMs });
  return text(publicRunResult(result), !result.ok);
}

function createServer() {
  const server = new McpServer({ name: 'go-ios-control', version: '0.1.0' });

  server.registerTool('ios_doctor', {
    description: 'Check go-ios availability, attached devices, iOS 17+ tunnel state, and UI driver readiness. Read-only.',
    inputSchema: z.object({ udid: Udid })
  }, async ({ udid }) => {
    const [version, devices, tunnels, ui] = await Promise.all([
      runIos(['version'], { udid, timeoutMs: 10_000 }),
      runIos(['list', '--details'], { udid, timeoutMs: 10_000 }),
      runIos(['tunnel', 'ls'], { udid, timeoutMs: 10_000 }),
      runIos(['ui', 'status'], { udid, timeoutMs: 10_000 })
    ]);
    return text({
      version: publicRunResult(version),
      devices: publicRunResult(devices),
      tunnels: publicRunResult(tunnels),
      ui: publicRunResult(ui),
      realDeviceVerified: false
    });
  });

  server.registerTool('ios_devices', {
    description: 'List iPhones/iPads connected to the go-ios host.',
    inputSchema: z.object({ details: z.boolean().optional().default(true) })
  }, async ({ details }) => invoke(details ? ['list', '--details'] : ['list']));

  server.registerTool('ios_apps', {
    description: 'List installed applications on the target iPhone/iPad.',
    inputSchema: z.object({ udid: Udid })
  }, async ({ udid }) => invoke(['apps'], udid));

  server.registerTool('ios_launch_app', {
    description: 'Launch an installed iOS app by bundle identifier.',
    inputSchema: z.object({ udid: Udid, bundle_id: BundleId, kill_existing: z.boolean().optional().default(false) })
  }, async ({ udid, bundle_id, kill_existing }) => {
    const args = ['launch', assertBundleId(bundle_id)];
    if (kill_existing) args.push('--kill-existing');
    return invoke(args, udid);
  });

  server.registerTool('ios_terminate_app', {
    description: 'Terminate an iOS app by bundle identifier.',
    inputSchema: z.object({ udid: Udid, bundle_id: BundleId })
  }, async ({ udid, bundle_id }) => invoke(['kill', assertBundleId(bundle_id)], udid));

  server.registerTool('ios_ui_source', {
    description: 'Return the current iOS accessibility/UI hierarchy through go-ios UI driver (WDA or DeviceKit).',
    inputSchema: z.object({ udid: Udid })
  }, async ({ udid }) => invoke(['ui', 'source'], udid));

  server.registerTool('ios_ui_tap', {
    description: 'Tap screen coordinates through the go-ios UI driver.',
    inputSchema: z.object({ udid: Udid, x: Coord, y: Coord })
  }, async ({ udid, x, y }) => invoke(['ui', 'tap', `--x=${assertCoordinate(x)}`, `--y=${assertCoordinate(y)}`], udid));

  server.registerTool('ios_ui_swipe', {
    description: 'Swipe between screen coordinates through the go-ios UI driver.',
    inputSchema: z.object({
      udid: Udid,
      from_x: Coord,
      from_y: Coord,
      to_x: Coord,
      to_y: Coord,
      duration: z.number().positive().max(10).optional().default(0.3)
    })
  }, async ({ udid, from_x, from_y, to_x, to_y, duration }) => invoke([
    'ui', 'swipe',
    `--from-x=${assertCoordinate(from_x)}`,
    `--from-y=${assertCoordinate(from_y)}`,
    `--to-x=${assertCoordinate(to_x)}`,
    `--to-y=${assertCoordinate(to_y)}`,
    `--duration=${assertDuration(duration)}`
  ], udid));

  server.registerTool('ios_ui_type', {
    description: 'Type text into the focused iOS control. Do not use this tool for passwords, passcodes, recovery codes, or OTPs.',
    inputSchema: z.object({ udid: Udid, value: z.string().max(10000) })
  }, async ({ udid, value }) => invoke(['ui', 'type', `--text=${value}`], udid));

  server.registerTool('ios_ui_home', {
    description: 'Press the iPhone/iPad Home action through the go-ios UI driver.',
    inputSchema: z.object({ udid: Udid })
  }, async ({ udid }) => invoke(['ui', 'button', 'home'], udid));

  server.registerTool('ios_screenshot', {
    description: 'Capture the physical iPhone/iPad screen using go-ios and return it as a PNG image.',
    inputSchema: z.object({ udid: Udid })
  }, async ({ udid }) => {
    const dir = await mkdtemp(join(tmpdir(), 'go-ios-mcp-'));
    const output = join(dir, 'screen.png');
    try {
      const result = await runIos(['screenshot', `--output=${output}`], { udid, timeoutMs: 30_000 });
      if (!result.ok) return text(publicRunResult(result), true);
      const image = await readFile(output);
      return {
        content: [
          { type: 'text' as const, text: JSON.stringify({ ok: true, bytes: image.byteLength }) },
          { type: 'image' as const, data: image.toString('base64'), mimeType: 'image/png' }
        ]
      };
    } catch (error) {
      return text({ ok: false, error: error instanceof Error ? error.message : String(error) }, true);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  server.registerTool('ios_web_pages', {
    description: 'List inspectable Safari tabs and eligible iOS WebViews through go-ios Web Inspector.',
    inputSchema: z.object({ udid: Udid, timeout_seconds: z.number().positive().max(30).optional().default(3) })
  }, async ({ udid, timeout_seconds }) => invoke(['webinspector', 'list', `--timeout=${timeout_seconds}`], udid));

  server.registerTool('ios_web_open', {
    description: 'Open a URL using iOS Remote Automation. Without bundle_id it targets Safari; bundle_id may target another inspectable browser/app supported by iOS.',
    inputSchema: z.object({
      udid: Udid,
      url: z.string().url(),
      bundle_id: BundleId.optional(),
      timeout_seconds: z.number().positive().max(30).optional().default(5)
    })
  }, async ({ udid, url, bundle_id, timeout_seconds }) => {
    const args = ['webinspector', 'launch', assertHttpUrl(url), `--timeout=${timeout_seconds}`];
    if (bundle_id) args.push(`--bundle-id=${assertBundleId(bundle_id)}`);
    return invoke(args, udid);
  });

  server.registerTool('ios_web_eval', {
    description: 'Evaluate JavaScript in an inspectable Safari/WebView page by page ID. This is the main DOM-level browser control primitive.',
    inputSchema: z.object({
      udid: Udid,
      page_id: z.string().min(1).max(256),
      expression: z.string().min(1).max(50000),
      timeout_seconds: z.number().positive().max(30).optional().default(5)
    })
  }, async ({ udid, page_id, expression, timeout_seconds }) => invoke([
    'webinspector', 'eval', page_id, expression, `--timeout=${timeout_seconds}`
  ], udid, (timeout_seconds + 5) * 1000));

  return server;
}

void serveStdio(createServer);
console.error('go-ios-control MCP server running on stdio');
