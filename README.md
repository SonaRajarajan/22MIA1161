# @22mia1161/logging-middleware

A reusable, production-grade structured logging package for the AffordMed campus notification platform.

## Quick Start

```bash
cd logging_middleware
npm install
npm run build
```

## Usage

### 1. Initialise (once at app startup)

```typescript
import { initLogger } from '@22mia1161/logging-middleware';

initLogger({
  baseURL: 'http://4.224.186.213',
  accessToken: '<your_access_token>',
  consoleEcho: true, // also prints to console in dev
});
```

### 2. Log anywhere in your codebase

```typescript
import { Log } from '@22mia1161/logging-middleware';

// Generic usage
Log("backend", "info", "controller", "GET /notifications called for student 1042");
Log("backend", "error", "handler", "received string, expected bool");
Log("backend", "fatal", "db", "Critical database connection failure.");
Log("frontend", "warn", "component", "Notification list rendered with 0 items — API may be down");
Log("frontend", "debug", "hook", "usePriorityNotifications: recalculating top-10 for filter=Placement");
```

### 3. Shorthand helpers

```typescript
import { logInfo, logError, logFatal } from '@22mia1161/logging-middleware';

logInfo("backend", "controller", "Priority inbox computed — top 10 returned to client");
logFatal("backend", "db", "Connection pool exhausted after 30s");
```

## API Reference

### `initLogger(config: LoggerConfig): void`
| Field | Type | Description |
|---|---|---|
| `baseURL` | `string` | AffordMed evaluation server base URL |
| `accessToken` | `string` | Bearer token from /evaluation-service/auth |
| `consoleEcho` | `boolean` | Print logs to console too (default: `true`) |

### `Log(stack, level, package, message): Promise<LogResponse | null>`
| Param | Allowed Values |
|---|---|
| `stack` | `"backend"` \| `"frontend"` |
| `level` | `"debug"` \| `"info"` \| `"warn"` \| `"error"` \| `"fatal"` |
| `package` | See full list in `src/index.ts` |
| `message` | Any descriptive string |

## Design Decisions

- **Fire-and-forget safe**: A logging failure never crashes the host application.
- **Single initialisation**: Configuration is held in a singleton — `initLogger()` once, `Log()` anywhere.
- **TypeScript-first**: Full type safety on all enum-constrained fields.
- **Dual output**: Console echo for dev observability + remote server for evaluation scoring.
