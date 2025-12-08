# Implementation Plan: Real-Time Notifications System

This plan addresses the final item in the Notifications section of `cashly-todo.md`:
> `- [ ] Real-time updates (WebSocket or polling) - NOT YET IMPLEMENTED`

## 1. Strategy Selection

We have two viable paths: **Polling** (Simulated Real-time) and **WebSockets** (True Real-time).

*   **Current State:** The application currently uses `refetchInterval: 30000` (30s polling) in React Query.
*   **Recommendation:** Upgrade to **Django Channels (WebSockets)**.
    *   **Why?** We already use **Redis** (for Celery), which is the backbone for Channels. This architecture allows instant alerts (e.g., "Budget Exceeded", "Fraud Alert") without the latency of polling, and lays the groundwork for future real-time features (live stock prices, chat support).

---

## 2. Implementation Steps (WebSocket Architecture)

### Phase 1: Backend Infrastructure (Django Channels)

1.  **Dependencies:**
    *   Add `channels`, `daphne`, and `channels-redis` to `backend/requirements.txt`.
    *   *Note:* `daphne` replaces `gunicorn` or `manage.py runserver` as the ASGI interface.

2.  **Configuration (`settings.py` & `asgi.py`):**
    *   Update `INSTALLED_APPS` to include `'channels'`.
    *   Set `ASGI_APPLICATION = 'config.asgi.application'`.
    *   Configure `CHANNEL_LAYERS` to use the existing Redis service:
        ```python
        CHANNEL_LAYERS = {
            "default": {
                "BACKEND": "channels_redis.core.RedisChannelLayer",
                "CONFIG": {
                    "hosts": [(config('REDIS_HOST', default='redis'), 6379)],
                },
            },
        }
        ```

3.  **Routing & Consumers:**
    *   Create `backend/apps/notifications/consumers.py`.
    *   Implement `NotificationConsumer`:
        *   **Connect:** Authenticate user (via JWT query param or session), add to group `user_{id}`.
        *   **Disconnect:** Remove from group.
        *   **Receive:** (Optional) Handle client-side "mark as read" events.
        *   **Send Notification:** Method to push JSON payload to client.
    *   Create `backend/apps/notifications/routing.py` to map `ws/notifications/` to the consumer.

4.  **Event Triggering (Signals):**
    *   Update `backend/apps/notifications/signals.py` (or `models.py` `save` method).
    *   On `post_save` of a `Notification`, get the channel layer.
    *   Send message to group `user_{notification.user_id}`.
    *   *Payload:* `{ "type": "notification.message", "data": serializer.data }`.

### Phase 2: Frontend Integration (React)

1.  **WebSocket Service:**
    *   Create `frontend/src/services/socketService.ts`.
    *   Manage connection lifecycle (connect, disconnect, auto-reconnect).
    *   Handle JWT authentication in the handshake.

2.  **Notification Hook Update (`useNotifications.ts`):**
    *   Modify `useNotifications` (or create a provider `NotificationProvider`).
    *   On mount: `socketService.connect()`.
    *   On message received:
        *   Show Toast immediately ("New Alert: ...").
        *   **Invalidate Query:** `queryClient.invalidateQueries(['notifications'])`. This triggers a clean fetch of the list to keep sync simple.
        *   **Optimistic Update:** Optionally prepend the new notification to the cached list for instant UI feedback.

### Phase 3: Deployment & DevOps

1.  **Docker Update:**
    *   Update `backend/Dockerfile` or `docker-compose.yml`.
    *   Change command from `python manage.py runserver` to `daphne -b 0.0.0.0 -p 8000 config.asgi:application`.

---

## 3. Fallback Plan: Optimized Polling (Low Effort)

If infrastructure complexity is a concern, we can refine the existing polling strategy:

1.  **Adaptive Polling:**
    *   Use `refetchInterval: 15000` (15s) generally.
    *   Reduce to `5000` (5s) if the user is on the `Notifications` page or `Dashboard`.
2.  **Manual Refresh:**
    *   Ensure the "Notification Bell" dropdown has a clear "Refresh" button (already implicit in most UIs, but explicit is good).

---

## 4. Execution Checklist

- [ ] **Backend:** Install `channels` & `channels-redis`.
- [ ] **Backend:** Create `NotificationConsumer` class.
- [ ] **Backend:** wire up `post_save` signal to push messages to Channel Layer.
- [ ] **Frontend:** Create `WebSocketService` (handling ReconnectingWebSocket).
- [ ] **Frontend:** Integrate Socket events into `useNotifications` to trigger React Query invalidation.
- [ ] **DevOps:** Switch entrypoint to `daphne`.
