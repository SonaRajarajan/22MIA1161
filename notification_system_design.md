# Notification System Design

> **Roll Number:** 22MIA1161  
> **Track:** Full Stack  
> **Platform:** Campus Notification System — Placements, Events & Results

---

## Stage 1

### REST API Design — Notification Platform Contract

#### Core Actions Identified

A student notification platform requires the following core actions:
1. Fetch all notifications for a student (with pagination)
2. Fetch a single notification by ID
3. Mark a notification as read
4. Mark all notifications as read
5. Fetch priority (top-N) notifications with optional type filter

---

### Endpoint Definitions

---

#### 1. `GET /api/v1/notifications`
Fetch all notifications for the authenticated student.

**Headers**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Query Parameters**
| Param | Type | Required | Description |
|---|---|---|---|
| `page` | integer | No | Page number (default: 1) |
| `limit` | integer | No | Items per page (default: 20, max: 100) |
| `type` | string | No | Filter by type: `Placement`, `Event`, `Result` |
| `isRead` | boolean | No | Filter by read status: `true` or `false` |

**Response — 200 OK**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "d146095a-0d86-4a34-9e69-3900a14576bc",
        "type": "Result",
        "message": "mid-sem",
        "isRead": false,
        "timestamp": "2026-04-22T17:51:30Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 12,
      "totalItems": 234,
      "limit": 20
    }
  }
}
```

**Response — 401 Unauthorized**
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired access token"
  }
}
```

---

#### 2. `GET /api/v1/notifications/:id`
Fetch a single notification by its UUID.

**Headers**
```
Authorization: Bearer <access_token>
```

**Path Params**
| Param | Type | Description |
|---|---|---|
| `id` | UUID string | The notification's unique ID |

**Response — 200 OK**
```json
{
  "success": true,
  "data": {
    "id": "b283218f-ea5a-4b7c-93a9-1f2f240d64b0",
    "type": "Placement",
    "message": "CSX Corporation hiring",
    "isRead": true,
    "timestamp": "2026-04-22T17:51:18Z"
  }
}
```

**Response — 404 Not Found**
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Notification with ID b283218f-... not found"
  }
}
```

---

#### 3. `PATCH /api/v1/notifications/:id/read`
Mark a single notification as read.

**Headers**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Response — 200 OK**
```json
{
  "success": true,
  "data": {
    "id": "d146095a-0d86-4a34-9e69-3900a14576bc",
    "isRead": true,
    "updatedAt": "2026-04-22T18:00:00Z"
  }
}
```

---

#### 4. `PATCH /api/v1/notifications/read-all`
Mark all notifications for the authenticated student as read.

**Headers**
```
Authorization: Bearer <access_token>
```

**Response — 200 OK**
```json
{
  "success": true,
  "data": {
    "updatedCount": 47,
    "message": "All notifications marked as read"
  }
}
```

---

#### 5. `GET /api/v1/notifications/priority`
Fetch the top-N priority notifications, ranked by weight and recency.

**Headers**
```
Authorization: Bearer <access_token>
```

**Query Parameters**
| Param | Type | Required | Description |
|---|---|---|---|
| `n` | integer | No | Number of top notifications (default: 10) |
| `type` | string | No | Filter by type: `Placement`, `Event`, `Result` |

**Response — 200 OK**
```json
{
  "success": true,
  "data": {
    "topN": 10,
    "notifications": [
      {
        "id": "8a7412bd-6065-4d09-8501-a37f11cc848b",
        "type": "Placement",
        "message": "Advanced Micro Devices Inc. hiring",
        "isRead": false,
        "timestamp": "2026-04-22T17:49:42Z",
        "priorityScore": 1.98
      }
    ]
  }
}
```

---

### Real-Time Notification Mechanism

**Chosen approach: WebSockets (via Socket.IO)**

A persistent WebSocket connection is established when the student opens the app. The backend emits a `notification:new` event whenever a new notification is created. The frontend listens and prepends the new notification to the list without a page reload.

```
Client                         Server
  |                               |
  |---  WS Connect (auth token) ->|
  |<-- connection:ack ------------|
  |                               |
  |  [New placement created]      |
  |<-- notification:new ----------|  { id, type, message, timestamp }
  |                               |
  |--- notification:read:id ----->|
  |<-- read:ack ------------------|
```

The token provided during HTTP auth is re-validated on WebSocket handshake to prevent unauthenticated connections.

---

## Stage 2

### Persistent Storage — Database Design

#### Database Choice: PostgreSQL

**Rationale:**
- Notifications have a well-defined, consistent schema → relational model is appropriate
- We need complex queries: filter by `isRead`, sort by `type` (enum), sort by timestamp
- PostgreSQL's native `ENUM` types, partial indexes, and `EXPLAIN ANALYZE` tooling make it ideal
- ACID guarantees ensure no notification is lost during a bulk `notify_all` operation

---

### Schema

```sql
-- Enum for notification types
CREATE TYPE notification_type AS ENUM ('Placement', 'Event', 'Result');

-- Core notifications table
CREATE TABLE notifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type          notification_type NOT NULL,
  message       TEXT NOT NULL,
  timestamp     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tracks per-student read state — avoids duplicating notification rows
CREATE TABLE student_notifications (
  student_id    INTEGER NOT NULL,
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  is_read       BOOLEAN NOT NULL DEFAULT FALSE,
  read_at       TIMESTAMPTZ,
  PRIMARY KEY (student_id, notification_id)
);
```

**Why a join table instead of a `studentID` column on `notifications`?**  
Notifications may be broadcast to all 50,000 students. Storing one row per student per notification would mean 50,000 × N rows. The join table stores one notification row + one `student_notifications` row per student, giving O(students) space rather than O(students × notifications).

---

### Key Queries

**Fetch unread notifications for a student (from Stage 1's API):**
```sql
SELECT n.id, n.type, n.message, n.timestamp, sn.is_read
FROM notifications n
JOIN student_notifications sn
  ON n.id = sn.notification_id
WHERE sn.student_id = $1
  AND sn.is_read = FALSE
ORDER BY n.timestamp DESC
LIMIT $2 OFFSET $3;
```

**Mark a single notification as read:**
```sql
UPDATE student_notifications
SET is_read = TRUE, read_at = NOW()
WHERE student_id = $1 AND notification_id = $2;
```

**Mark all as read:**
```sql
UPDATE student_notifications
SET is_read = TRUE, read_at = NOW()
WHERE student_id = $1 AND is_read = FALSE;
```

---

### Scaling Problems at High Volume

| Problem | Description | Solution |
|---|---|---|
| Full table scans | At 50k students × thousands of notifications, unindexed queries become O(n) | Composite indexes (see Stage 3) |
| Write amplification | `notify_all` inserts 50k rows atomically — one slow insert blocks others | Batch inserts + message queue (see Stage 5) |
| Connection exhaustion | Each API request holds a DB connection | PgBouncer connection pooling |
| Hot row contention | `mark-all-read` locks many rows simultaneously | Partition `student_notifications` by `student_id` hash |
| Storage growth | 5M notifications × 50k students = unsustainable | Archive old notifications to cold storage (S3 / TimescaleDB) after 90 days |

---

## Stage 3

### Query Analysis & Optimisation

#### Original Query (Slow)
```sql
SELECT * FROM notifications
WHERE studentID = 1042 AND isRead = false
ORDER BY createdAt ASC;
```

**Why is this slow at scale (50k students, 5M notifications)?**

1. `SELECT *` fetches every column — unnecessary data transfer over the wire
2. No index on `(studentID, isRead)` → full sequential scan of 5M rows
3. `ORDER BY createdAt ASC` without an index triggers an expensive filesort
4. The query is applied to a single monolithic table — no partitioning

**Computation Cost:** O(N) full scan + O(N log N) sort = slow at N = 5,000,000

---

#### Fixed Query
```sql
-- Using the schema from Stage 2's join-table design
SELECT n.id, n.type, n.message, n.timestamp
FROM notifications n
JOIN student_notifications sn
  ON n.id = sn.notification_id
WHERE sn.student_id = 1042
  AND sn.is_read = FALSE
ORDER BY n.timestamp DESC   -- DESC preferred: show newest unread first
LIMIT 50;
```

---

#### Indexes to Create

```sql
-- Composite index: student_id + is_read — covers the WHERE clause exactly
CREATE INDEX idx_sn_student_unread
  ON student_notifications (student_id, is_read)
  WHERE is_read = FALSE;           -- partial index: only unread rows indexed

-- Index on timestamp for ORDER BY
CREATE INDEX idx_notifications_timestamp
  ON notifications (timestamp DESC);

-- Index on type for type-filtered queries
CREATE INDEX idx_notifications_type
  ON notifications (type);
```

**Is indexing every column a good idea (as the other developer suggests)?**  
**No.** Indexes:
- Consume disk space proportional to data size
- Must be maintained on every `INSERT`, `UPDATE`, `DELETE` — slowing writes
- Can confuse the query planner, causing it to pick a suboptimal index

Index only columns that appear in `WHERE`, `JOIN`, or `ORDER BY` clauses in hot paths.

---

#### Query: Students Who Got a Placement Notification in the Last 7 Days

```sql
SELECT DISTINCT sn.student_id
FROM student_notifications sn
JOIN notifications n
  ON sn.notification_id = n.id
WHERE n.type = 'Placement'
  AND n.timestamp >= NOW() - INTERVAL '7 days';
```

This benefits from the `idx_notifications_type` and `idx_notifications_timestamp` indexes created above.

---

## Stage 4

### Caching Strategy — Reducing DB Load on Every Page Load

**Problem:** Every page load fetches all notifications from the DB → DB overwhelmed at 50k concurrent students.

---

### Recommended Strategy: Multi-Layer Caching

#### Layer 1 — Redis Cache (Primary)

Cache the notification list per student with a short TTL:

```
Key:   notifications:student:<student_id>:page:<page>:filter:<type|all>
Value: JSON array of notification objects
TTL:   60 seconds
```

**Cache invalidation:** When a new notification is broadcast or a student marks notifications as read, invalidate that student's cache keys.

**Hit rate expectation:** >90% for active students viewing the same page multiple times per minute.

---

#### Layer 2 — HTTP Cache-Control Headers

For the notifications API response, include:
```
Cache-Control: private, max-age=30
ETag: "<hash of response body>"
```

The frontend sends `If-None-Match` on subsequent calls. If the ETag matches (nothing changed), the server returns `304 Not Modified` — zero DB query, zero payload transfer.

---

#### Layer 3 — In-Memory Cache on the Frontend (React State)

Don't re-fetch on every tab switch. Keep fetched notifications in React context/state and only re-fetch:
- On initial mount
- When a WebSocket `notification:new` event arrives
- When the user explicitly clicks "Refresh"

---

### Trade-off Analysis

| Strategy | Benefit | Trade-off |
|---|---|---|
| Redis TTL cache | Near-zero DB load for repeated reads | Stale data for up to TTL seconds |
| Cache invalidation on write | Fresh data after mutations | Added complexity; every write must invalidate |
| ETag / 304 | Eliminates bandwidth on unchanged data | Requires ETag computation on server |
| Frontend state cache | Zero network call on tab switch | Memory grows with notification count |
| DB read replicas | Distribute read load | Replication lag — slightly stale reads |

**Chosen approach for this implementation:** Redis (Layer 1) + frontend state (Layer 3) + WebSocket push for real-time invalidation.

---

## Stage 5

### Bulk Notification Reliability — Redesigning `notify_all`

#### Original Pseudocode (Problematic)
```python
function notify_all(student_ids: array, message: string):
    for student_id in student_ids:
        send_email(student_id, message)   # calls Email API
        save_to_db(student_id, message)   # DB insert
        push_to_app(student_id, message)  # real-time push
```

#### Shortcomings

1. **Sequential loop** — 50,000 iterations is extremely slow; timing out on email API blocks all subsequent students
2. **No atomicity** — `send_email` can succeed while `save_to_db` fails → data inconsistency
3. **No retry logic** — if email fails for student 1000, the remaining 49,000 are never notified
4. **Tight coupling** — email, DB, and push are in a single synchronous transaction; one slow service stalls all three
5. **No idempotency** — restarting after a crash sends duplicate notifications

#### The logs showed `send_email` failed for 200 students midway
This means exactly the coupling problem above: the loop halted or those 200 students were skipped with no retry.

#### Should save_to_db and send_email happen together (in the same transaction)?
**No.** Email delivery is an external side-effect that cannot be rolled back. If we wrap both in a DB transaction and the email fails, rolling back the DB insert is correct — but the email may have already been sent. These must be decoupled.

---

### Redesigned Architecture: Message Queue + Worker Pool

```
HR clicks "Notify All"
        │
        ▼
[API Controller]
  - Inserts ONE notification row into DB  ← single write
  - Publishes one message to Queue: { notification_id, student_ids[] }
  - Returns 202 Accepted immediately
        │
        ▼
[Message Queue — e.g. BullMQ / RabbitMQ]
  - Splits student_ids into batches of 500
  - Each batch is an independent job
        │
        ▼
[Worker Pool — N parallel workers]
  For each batch:
    1. INSERT student_notifications rows (batch upsert, idempotent)
    2. Send emails in parallel (Promise.all with concurrency limit)
    3. Push real-time notification via WebSocket
    4. On partial failure: failed student_ids re-queued for retry
        │
        ▼
[Dead Letter Queue]
  - After 3 retries, log failed student_ids for manual review
```

#### Revised Pseudocode
```typescript
async function notify_all(notification_id: string, student_ids: string[]): Promise<void> {
  Log("backend", "info", "controller", `notify_all initiated for ${student_ids.length} students`);

  const BATCH_SIZE = 500;
  const batches = chunk(student_ids, BATCH_SIZE);

  for (const batch of batches) {
    await queue.add('send-notification-batch', { notification_id, student_ids: batch }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
    });
  }

  Log("backend", "info", "controller", `${batches.length} batches enqueued successfully`);
}

// Worker (runs in parallel across N processes)
queue.process('send-notification-batch', async (job) => {
  const { notification_id, student_ids } = job.data;

  // 1. Persist to DB (idempotent upsert)
  await db.batchUpsert('student_notifications', student_ids.map(id => ({
    student_id: id, notification_id, is_read: false
  })));
  Log("backend", "info", "db", `Batch of ${student_ids.length} persisted to student_notifications`);

  // 2. Send emails (parallel, non-blocking)
  const emailResults = await Promise.allSettled(
    student_ids.map(id => emailService.send(id, notification_id))
  );
  const failed = emailResults.filter(r => r.status === 'rejected');
  if (failed.length > 0) {
    Log("backend", "warn", "handler", `${failed.length} email sends failed in batch — will retry`);
    throw new Error(`Partial batch failure: ${failed.length} emails`); // triggers BullMQ retry
  }

  // 3. Push real-time in-app notification
  await socketService.broadcastToStudents(student_ids, notification_id);
  Log("backend", "info", "middleware", `Real-time push sent to ${student_ids.length} students`);
});
```

**Key properties:**
- DB write and email are decoupled — DB insert succeeds even if email delivery is delayed
- Idempotent upsert — safe to retry without duplicate rows
- Partial batch failure retries only the failed batch, not all 50k students
- HR receives immediate `202 Accepted` — no timeout waiting for 50k emails

---

## Stage 6

### Priority Inbox — Top-N Notifications by Weight and Recency

#### Approach

Priority is determined by a **weighted score** combining:
- **Type weight:** Placement = 3, Result = 2, Event = 1
- **Recency decay:** More recent notifications score higher

**Score formula:**
```
priorityScore = typeWeight * (1 / (1 + hoursAgo * decayFactor))
```
Where `decayFactor = 0.05` (configurable). This ensures a 1-hour-old Placement outranks a 24-hour-old Result, while a very recent Result can still beat a week-old Placement.

**Why not a DB query?**  
Stage 6 explicitly states: use the provided Notification API to fetch notifications and compute top-N in code. No DB query. No hardcoded data.

**Maintaining top-10 efficiently as new notifications arrive:**  
Use a **min-heap of size N**. As each notification is scored, if its score exceeds the heap's minimum, swap it in. This gives O(M log N) time for M notifications, versus O(M log M) for a full sort — important when M grows to thousands.

#### Implementation
See `notification_app_be/src/domain/priorityInbox.ts` for the full working TypeScript implementation.

---

### How New Notifications Are Integrated

When a WebSocket `notification:new` event is received:
1. Compute the new notification's priority score
2. If score > current 10th-place score → evict the 10th and insert the new one
3. Re-sort the top-10 array (only 10 elements — O(10 log 10) ≈ constant)
4. Update React state → UI re-renders the priority inbox in real time without any API call
