---
name: async-error-handling
description: Use when writing async logic in React Native, including API calls, mutations, uploads, and local persistence. Standardizes try/catch/finally flow, typed errors, loading state handling, and user feedback for mobile UX.
---

# Async Functions and Error Handling (React Native)

Use one consistent async pattern: set loading -> `try` -> success path -> `catch` -> `finally` cleanup.

## Instructions

### Core Pattern

```ts
const handleSave = async () => {
  setSaving(true);
  try {
    const result = await saveProfile(payload);
    if (!result.ok) throw new Error(result.message ?? 'Save failed');

    showToast('Profile saved');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Something went wrong';
    showToast(message);
    console.error('[handleSave]', err);
  } finally {
    setSaving(false);
  }
};
```

### Rules

- Always reset loading in `finally`
- Never leave `catch` empty
- Never swallow errors silently
- Narrow unknown errors before using `.message`

### API and Mutation Handling

Convert domain failures to thrown errors so one catch path handles all failures.

```ts
async function submitBooking(input: BookingInput) {
  const res = await fetch(`${API_URL}/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const json: { message?: string } = await res.json().catch(() => ({}));
    throw new Error(json.message ?? 'Booking failed');
  }

  return res.json() as Promise<BookingResponse>;
}
```

### Background Tasks

If a task is non-critical, isolate it and log errors without blocking main flow.

```ts
async function syncAnalytics(event: AnalyticsEvent) {
  try {
    await analytics.track(event);
  } catch (err) {
    console.error('[syncAnalytics]', err);
  }
}
```

### File Uploads and Downloads

- Validate file size/type before upload
- Throw on failed upload response
- Clean temporary resources after completion

```ts
async function uploadAvatar(uri: string) {
  const formData = new FormData();
  formData.append('file', {
    uri,
    name: 'avatar.jpg',
    type: 'image/jpeg',
  } as any);

  const res = await fetch(`${API_URL}/upload/avatar`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) throw new Error('Avatar upload failed');
}
```

### UI Feedback Guidance

- Form validation errors: show inline near fields
- Mutation failures: show toast/snackbar/banner
- Page load failures: show full-screen error state with retry
- Background task failures: log only unless user action is required

### Async Checklist

- [ ] Loading state starts before async call
- [ ] `catch` exists and handles user-visible error
- [ ] Error type is narrowed safely
- [ ] `finally` always resets loading state
- [ ] Non-critical background errors are logged
- [ ] Retry path exists for recoverable operations
