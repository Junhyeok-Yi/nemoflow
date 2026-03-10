# PM Feedback v1 (from Josh)

## Keep (approved)
1. Meeting mode UI location
2. Tagging UI visible while writing (user-editable)
3. To-Do completion rate inside category view
4. Sticky note card fills space densely in diagram

## PM Risks to monitor

### 1) Meeting mode UI placement
- Risk: context switching / cognitive load during memo writing
- Metric: meeting mode toggle CTR vs actual meeting start/end completion

### 2) Tagging UI exposure + manual correction
- Risk: frequent manual correction may imply low auto-classification trust
- Metric: auto-tag -> manual override rate

### 3) Category To-Do completion rate
- Risk: completion-only KPI can hide difficulty/priority
- Metric: completion rate + unfinished dwell time

### 4) Dense sticky layout
- Risk: scanability drops on long text/mobile
- Metric: card click/open rate, re-edit entry rate, scroll depth

## Implementation direction (next)
- Keep approved UI as default
- Add lightweight analytics events for above metrics
- Review after 1 week of data and adjust UX if override/fatigue is high
