# Entry Payment UI

One TypeScript/React Native codebase for Android, iOS, and web, built with Expo Router. The structure separates routes, reusable components, feature modules, API access, state/query infrastructure, storage, configuration, types, and design tokens.

## Start

1. Install current Node.js 22 LTS.
2. Copy `.env.example` to `.env` and adjust the API address. Android Emulator normally uses `http://10.0.2.2:8080/entry-payment`; a physical device must use the computer's LAN IP.
3. Run `npm install`.
4. Run `npm run android`, `npm run ios` (macOS/Xcode required), or `npm run web`.

Run `npm run typecheck` and `npm run lint` before committing.
