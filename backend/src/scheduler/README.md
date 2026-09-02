# Scheduler

Emits domain events on an interval or UTC cron. This folder does not execute actions.

```text
Scheduler.tick
  → EventBus.emit({ type: 'scheduled', id: scheduled:{name}:{slot}, payload })
```

The API process owns the clock. BharatBid does not attach procurement workflow actions to these ticks.

Register extra schedules with `scheduler.register({ name, intervalMs | cron, trigger?, payload? })`. Do not add JavaScript conditions or arbitrary command execution here.

See `docs/scheduler.md`.
