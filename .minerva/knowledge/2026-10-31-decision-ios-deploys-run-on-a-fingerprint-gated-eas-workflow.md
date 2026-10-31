# iOS deploys run on a fingerprint-gated EAS Workflow, not GitHub Actions

**Date**: 2026-10-31
**Type**: decision
**Theme**: deployment
**Summary**: Native changes get a TestFlight build, others ship OTA, from an EAS Workflow with no token.
**Context**: .minerva/work/2026-10-31-ios-testflight-deploys (see git history if the worktree has been cleaned up)

## Context
The owner wanted each merge to `main` on a physical iPhone. Three options were weighed: a fingerprint-gated EAS Workflow; a GitHub Actions job with an `EXPO_TOKEN`; and a full build on every merge.

## Finding
`.eas/workflows/deploy-ios.yml` hashes the native side of the app, then either builds and uploads to TestFlight or publishes an update to the `production` branch. iOS only: `android.package` isn't set.

- GitHub Actions lost because it needs a token, a `.github/` change and a privileged workflow on a public repo.
- A build on every merge lost on quota and on 30+ minutes per change.
- `concurrency` serializes runs, so queued merges can't publish in the wrong order. Only the newest waiting run goes, and it contains the merges before it.
- `runtimeVersion` uses the `fingerprint` policy, so an update reaches only builds with the matching native side.
- EAS Hosting was rejected as a server replacement: rate limits are per machine, and the OpenRouter key would have to leave Doppler.
- The trigger is the Expo GitHub App linked to the repo. Expo's docs say only GitHub organization repos can link to Expo organizations, but the owner confirmed that any GitHub repo can link to the `onerlawllc` organization, so don't move the repo or the project because of that line.
- Apple signing credentials and the App Store Connect API key live on EAS. This is a deliberate exception to "all secrets live in Doppler", because EAS has to hold them to sign and upload.

## Implications
- There is one channel and no staging. A bad merge reaches the phone; rollback is `eas update:republish`.
- Android needs a package id and a matching set of jobs.
- A Release simulator build compiled on EAS (build `8cd5fd36`, Xcode 27.1) and launched on an iOS 26.3 simulator, which satisfied the native-verification trigger in the Xcode constraint. No device-signed build, TestFlight upload or OTA delivery has run yet.

## Related
- [[2026-10-29-constraint-sdk-58-ios-dev-build-needs-xcode-26-4]] — its verification trigger was met by the simulator build
- [[2026-10-29-constraint-card-server-rate-limits-are-per-machine]] — why EAS Hosting was rejected
- [[2026-10-31-reference-ios-fingerprint-inputs]] — what takes the build path
- [[2026-10-31-reference-deployment-limits]] — what this pipeline doesn't catch
