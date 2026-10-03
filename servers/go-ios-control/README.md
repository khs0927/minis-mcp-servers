# go-ios Control MCP

A thin MCP adapter around [danielpaulus/go-ios](https://github.com/danielpaulus/go-ios). The goal is to reuse go-ios instead of reimplementing iPhone device protocols.

## First scope

The server exposes:

- device and app discovery
- app launch/terminate
- physical-device screenshot
- UI hierarchy, tap, swipe, type, and Home through go-ios UI/WDA/DeviceKit
- Safari / inspectable WebView discovery
- URL launch through iOS Remote Automation
- JavaScript evaluation in an inspectable page

The server executes the `ios` binary with `shell: false`; tool inputs never become shell commands.

## Host setup

Install current go-ios using an upstream-supported method. The upstream README currently documents:

```bash
npm install -g go-ios
ios --help
```

For iOS 17+ a go-ios tunnel must be running. go-ios also supports a userspace tunnel:

```bash
ios tunnel start --userspace
```

Set `GO_IOS_UDID` when more than one device is connected. Set `GO_IOS_BIN` if the `ios` executable is not on PATH.

### Browser preparation

On the iPhone enable:

- Settings → Apps → Safari → Advanced → Web Inspector
- Settings → Apps → Safari → Advanced → Remote Automation

Then the browser tools can use:

```text
ios_web_pages
ios_web_open
ios_web_eval
```

`ios_web_open` accepts an optional bundle ID for another browser/app, but support depends on whether iOS exposes that target to Remote Automation / Web Inspector. Safari is the baseline target.

### UI preparation

The `ios_ui_*` tools depend on a go-ios UI driver. go-ios supports WebDriverAgent and DeviceKit and provides `ios ui download`, `ios ui install`, `ios ui run`, and `ios ui status`.

This repository intentionally does not automate signing/provisioning yet. That is the next layer after the basic go-ios bridge is verified on the user's physical iPhone.

## MCP server

```bash
cd servers/go-ios-control
npm install
npm start
```

Run `ios_doctor` first. It checks the binary, connected devices, tunnel state, and UI driver state.

## Verification status

- Upstream command surface: checked against go-ios commit `273d3e06e803fb6ee95e4df914d8be82c5ee4bb0`.
- MCP wrapper static tests: included.
- Physical iPhone execution: **not yet verified**. Do not label UI/browser control VERIFIED until the device is connected and the smoke suite is run.

See `provenance.json` for the pinned upstream reference.
