This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md

## minerva

This project uses [minerva](https://github.com/honerlaw/agent-marketplace/tree/main/plugins/minerva) for durable record discipline.

- `.minerva/knowledge/` — write-once entries (decisions, bugs, patterns, constraints, references), each tagged with a `**Theme**` and a one-line `**Summary**`. Orient by listing the catalog — one `theme | entry | summary` line per entry, grouped by theme, with `(superseded)` on an entry a newer one has retired — then open only the entries whose theme bears on your task:

  ```sh
  find .minerva/knowledge -name '[0-9]*.md' -exec awk 'function p(){if(f!=""){n=f;sub(/.*\//,"",n);sub(/\.md$/,"",n);N[++c]=n;T[n]=(t==""?"(unthemed)":t);S[n]=s;if(b)X[n]=1};f=FILENAME;t="";s="";q=0;r=0;h=0;b=0} function id(x){sub(/.*\//,"",x);sub(/-[a-z]+-.*/,"",x);return x} function tgt(x){sub(/^- \[\[/,"",x);sub(/\]\].*/,"",x);return x} FNR==1{p()} {sub(/\r$/,"")} /^[ \t]*(```|~~~)/{q=!q;next} q{next} /^## /{h=1;r=($0=="## Related")} !h&&/^<!-- superseded-by: /{b=1} /^\*\*Theme\*\*:/&&t==""{sub(/^\*\*Theme\*\*:[ \t]*/,"");sub(/[ \t]+$/,"");t=$0} /^\*\*Summary\*\*:/&&s==""{sub(/^\*\*Summary\*\*:[ \t]*/,"");sub(/[ \t]+$/,"");s=$0} r&&/^- \[\[[^]]*\]\][ \t]*(—|–|-)[ \t]*/&&!/\]\].*\[\[/{l=tolower($0);sub(/^- \[\[[^]]*\]\][ \t]*(—|–|-)[ \t]*/,"",l);x=tgt($0);if(l~/^superseded by([ \t]*(:|;|,|—|–|-)|[ \t]*$)/)b=1;else if(l~/^supersedes([ \t]*(:|;|,|—|–|-)|[ \t]*$)/&&id(f)>=id(x))Y[x]=1} END{p();for(i=1;i<=c;i++){n=N[i];print T[n]" | "n" | "S[n]((n in X)||(n in Y)?" (superseded)":"")}}' {} + | sort
  ```

  Links between entries are forward-only `## Related` lines; find what links *to* an entry with `grep -l '\[\[<entry>\]\]' .minerva/knowledge/*.md`.
- `.minerva/reference/` — present-tense operational docs (architecture, glossary, conventions): how the system works now. Read on demand.
- `.minerva/work/` — historical proposals and replans. Grep when you need the reasoning behind a past feature.

Active work units live at `.minerva/work/<date-slug>/`. Load the installed `minerva:using-minerva` skill for the full methodology using your host's skill loader. In Claude Code use `/minerva:using-minerva`; in Codex select `$minerva:using-minerva`. Follow the loaded plugin's runtime contract for tools and installed paths.

