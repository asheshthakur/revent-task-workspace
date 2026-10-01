# VEYA — Desktop Application

Native desktop client for macOS and Windows connecting to VEYA Work Management.

## Features
- **Seamless Live Sync**: Automatically connects to the canonical production deployment (`https://app.veya.com`), live workers.dev fallback, or local development server.
- **Native OS Notifications**: Desktop notifications for task assignments, task status transitions, and team chat messages on macOS Notification Center and Windows Action Center.
- **Dock & Taskbar Badging**: Real-time unread notification count badge in macOS Dock and Windows Taskbar flashing.
- **Deep Linking**: Clicking an OS notification immediately focuses the app and navigates to the relevant task or conversation.
- **External Link Routing**: External links (Google Drive, Figma, Docs, Sheets) safely launch in your default web browser without interrupting your desktop workspace.

## Getting Started

### 1. Install Dependencies
```bash
npm run desktop:install
```

### 2. Run in Development Mode
Connects by default to the production instance:
```bash
npm run desktop:dev
```

To point to a local development server:
```bash
VEYA_URL=http://localhost:3000 npm run desktop:dev
```

### 3. Build Desktop Installers

#### macOS (`.dmg` & `.zip` for Intel & Apple Silicon):
```bash
npm run desktop:dist:mac
```

#### Windows (`.exe` NSIS installer & portable executable):
```bash
npm run desktop:dist:win
```

Build outputs will be generated in `desktop/dist/`.
