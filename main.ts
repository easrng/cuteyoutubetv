#!/usr/bin/env -S deno -A
// deno-lint-ignore-file no-explicit-any
import getPort from "get-port";
import { TextLineStream } from "@std/streams/text-line-stream";
const port = await getPort();
const cmd = new Deno.Command(
  new URL(import.meta.resolve("./foo.cobalt.Cobalt.AppImage")),
  {
    args: [
      "--disable_webdriver",
      "--remote_debugging_port=" + port,
      "--user_agent=Mozilla/5.0 (X11; Linux x86_64) Cobalt/0 (unlike Gecko) v8/8.8.278.17-jit gles Evergreen/1.0.0 Evergreen-Full Evergreen-Compressed Starboard/16, SystemIntegratorName_DESKTOP_ChipsetModelNumber_2025/FirmwareVersion (BrandName, ModelName)",
    ],
    stdout: "piped",
    stderr: "inherit",
  },
).spawn();
let connected = false;
async function connect() {
  connected = true;
  const ws = new WebSocket(`ws://[::1]:${port}/devtools/page/cobalt`);
  ws.addEventListener("message", ({ data: json }) => {
    const data = JSON.parse(json);
    if (data.method === "Runtime.executionContextCreated") {
      ws.send(JSON.stringify({
        "id": id++,
        "method": "Runtime.evaluate",
        "params": {
          "expression": `(${function () {
            const JSONParse = JSON.parse;
            const JSONStringify = JSON.stringify;
            const isArray = Array.isArray;

            JSON.parse = function (text, reviver) {
              const value = JSONParse(text, (_, value) => {
                if (typeof value === "object" && value) {
                  if ("adPlacements" in value && isArray(value.adPlacements)) {
                    value.adPlacements = [];
                  }
                  if ("playerAds" in value && value.playerAds === true) {
                    value.playerAds = false;
                  }
                  if ("adSlots" in value && isArray(value.adSlots)) {
                    value.adSlots = [];
                  }
                  if ("items" in value && isArray(value.items)) {
                    value.items = value.items.filter((e: any) =>
                      !e.adSlotRenderer
                    );
                  }
                  if ("contents" in value && isArray(value.contents)) {
                    value.contents = value.contents.filter((e: any) =>
                      !e.adSlotRenderer &&
                      !(e?.feedNudgeRenderer?.primaryButton?.buttonRenderer
                        ?.command?.commandExecutorCommand?.commands?.[0]
                        ?.signInEndpoint) &&
                      !(e?.alertWithActionsRenderer?.icon?.iconType ===
                          "PERSON_CIRCLE" &&
                        e?.alertWithActionsRenderer?.actionButtons?.[0]
                            ?.buttonRenderer?.command?.authDeterminedCommand
                            ?.unauthenticatedCommand?.authRequiredCommand
                            ?.identityActionContext?.eventTrigger ===
                          "ACCOUNT_EVENT_TRIGGER_WATCH_PROMO")
                    );
                  }
                  if (
                    !isArray(value) && "entries" in value &&
                    isArray(value.entries)
                  ) {
                    value.entries = value.entries.filter((elm: any) =>
                      !elm?.command?.reelWatchEndpoint?.adClientParams?.isAd
                    );
                  }
                }
                return value;
              });
              if (reviver) {
                return JSONParse(JSONStringify(value), reviver);
              } else {
                return value;
              }
            };

            const cssTextDescriptor = Object.getOwnPropertyDescriptor(
              (window as any).CSSStyleDeclaration.prototype,
              "cssText",
            )!;
            Object.defineProperty(
              (window as any).CSSStyleDeclaration.prototype,
              "cssText",
              {
                ...cssTextDescriptor,
                set(value) {
                  cssTextDescriptor.set!.call(this, value);
                  upgradeBgImg(this);
                },
              },
            );

            // functions from https://github.com/webosbrew/youtube-webos/blob/main/src/thumbnail-quality.ts
            function rewriteURL(url: URL) {
              const YT_THUMBNAIL_PATHNAME_REGEX =
                /vi(?:_webp)?(\/.*?\/)([a-z0-9]+?)(_\w*?)?\.[a-z]+$/g;

              const YT_TARGET_THUMBNAIL_NAMES = [
                "sddefault",
                "hqdefault",
                "mqdefault",
                "default",
              ] as const;

              const isABTest = url.hostname.match(/^i\d/) !== null;
              // Don't know how to handle A/B test thumbnails so we don't upgrade them.
              if (isABTest) return null;

              const replacementPathname = url.pathname.replace(
                YT_THUMBNAIL_PATHNAME_REGEX,
                (match, p1, p2, p3) => {
                  if (!YT_TARGET_THUMBNAIL_NAMES.includes(p2)) return match; // Only rewrite regular thumbnail URLs. Not shorts, etc.
                  return `vi_webp${p1}sddefault${p3 ?? ""}.webp`;
                },
              );
              if (url.pathname === replacementPathname) {
                // pathname not changed because not a regular thumbnail or already upgraded.
                return null;
              }

              url = new URL(url);

              url.pathname = replacementPathname;
              url.search = "";

              return url;
            }

            function parseCSSUrl(value: string): URL | undefined {
              try {
                return new URL(value.slice(4, -1).replace(/["']/g, ""));
              } catch {
                return undefined; // Not a valid URL
              }
            }

            function upgradeBgImg(style: CSSStyleDeclaration) {
              const old = parseCSSUrl(style.backgroundImage);
              if (!old) return;

              const target = rewriteURL(old);
              if (!target) return;

              const lazyLoader = new Image();

              lazyLoader.onload = () => {
                const curr = parseCSSUrl(style.backgroundImage);
                if (!curr) return;

                // Don't swap out element image if it has been changed while target image was loading.
                if (curr.href !== old.href) return;

                style.backgroundImage = `url(${target.href})`;
              };

              lazyLoader.src = target.href;
            }
            // end thumbnail-quality
          }})()`,
          "objectGroup": "console",
          "includeCommandLineAPI": false,
          "silent": false,
          "contextId": data.params.context.id,
          "returnByValue": false,
          "generatePreview": false,
          "userGesture": false,
          "awaitPromise": false,
          "replMode": false,
        },
      }));
    } else if (data.method === "Runtime.consoleAPICalled") {
      const message = "[" + data.params.type + "] " +
        data.params.args.map((e: any) =>
          e.type === "string" ? e.value : JSON.stringify(e)
        ).join(" ");
      if (
        /(error|warning)\: unsupported (value|property)/.test(message)
      ) {
        // ignore
      } else {
        /* console.log(
          message,
        ); */
      }
    }
  });
  await new Promise((cb) => ws.addEventListener("open", cb, { once: true }));
  let id = 0;
  ws.send(JSON.stringify({
    "id": id++,
    "method": "Runtime.enable",
  }));
}
(async () => {
  for await (
    const value of (cmd.stdout.pipeThrough(new TextDecoderStream()).pipeThrough(
      new TextLineStream(),
    ) as any).values()
  ) {
    if (value.includes("http") && value.includes(port + "")) {
      if (!connected) {
        connect();
      }
    }
    console.log("%s", value);
  }
})().catch(console.error);
Deno.exitCode = (await cmd.status).code;
