# Sophisticate — Planned improvements & features

Copy-paste each issue below into GitHub Issues using the corresponding template.

---

## Issue 1: Add 3×4 crop preset

**Type:** Improvement
**Template:** improvement.yml

### Current problem

The crop presets list lacks a 3:4 ratio option. Users must manually adjust dimensions every time they need a portrait crop for typical mobile/social content.

### Proposed change

Add "3:4" to the crop presets menu alongside existing options (16:9, 4:3, square, etc.). It should apply instantly and respect all active constraints (min/max size, lock ratio if enabled).

### Benefit

- Speeds up typical mobile video editing workflow
- Reduces manual tuning errors
- Consistent preset behavior across all formats

### Acceptance criteria

- [ ] Crop presets list includes "3:4" option
- [ ] Selecting "3:4" immediately applies the ratio
- [ ] Works with image and video
- [ ] Respects active constraints (size limits, aspect locks)
- [ ] Preset persists across sessions (if persistence exists)
- [ ] UI naming matches existing preset format ("3:4" not "3x4")

### Labels

- `enhancement`
- `priority:medium`
- `crop`

### Area

crop

---

## Issue 2: Fix free crop mode — allow flexible resizing

**Type:** Bug

**Template:** bug.yml

### What happened

The "Free crop" button does not actually enable free cropping. Instead, the crop box has fixed proportions and limited resizing, making it impossible to create custom aspect ratios.

### Steps to reproduce

1. Open video/image
2. Click crop tool
3. Select "Free crop" or similar mode
4. Attempt to resize crop box by dragging corners/edges
5. Notice: proportions are locked or resize is limited

### Expected behavior

When free crop is active, the user should be able to:

- Drag all four corners/edges independently
- Create any custom aspect ratio
- Resize without proportion constraints
- Move the crop area freely

### Environment

- All platforms (affects core crop logic)

### Priority

`priority:high` — free crop is a core feature

### Additional notes

- Confirm this doesn't conflict with preset modes
- Test with both landscape and portrait inputs
- Verify undo/reset still works correctly

### Labels

- `bug`
- `priority:high`
- `crop`

---

## Issue 3: Allow optional/toggleable processing parameters

**Type:** Feature

**Template:** feature.yml

### Goal

Allow users to selectively enable/disable each processing step (crop, size limit, filters, etc.) so they can apply only the transformations they need.

### Description

Currently, if crop is enabled, it always applies. Same with size constraints, ratios, etc. Users should be able to:

- Toggle crop on/off without reloading
- Toggle size constraints on/off independently
- Toggle any processing step individually
- See which parameters are currently active
- Get predictable output based only on enabled parameters

**Example use case:** User wants to resize a video but keep original crop → disable crop, set size constraints, process.

### Acceptance criteria

- [ ] Each major processing parameter has on/off toggle in UI
- [ ] Disabled parameters don't execute in the pipeline
- [ ] UI clearly highlights enabled vs disabled parameters
- [ ] No hidden constraints applied when a parameter is "off"
- [ ] State persists during session (reset on refresh/new file)
- [ ] Output respects only active parameters
- [ ] Works independently: crop off ≠ breaks size resizing

### Priority

`priority:medium` — improves workflow flexibility

### Considerations

- UX: How to show enabled/disabled state? (checkbox, toggle, color?)
- Edge cases: What if user disables all parameters? (validation needed)
- Help text: Document what each toggle does in output
- Test: Verify no parameter "leakage" when another is off

### Labels

- `enhancement`
- `priority:medium`
- `ui`

---

## Issue 4: Multi-video queue with merge and batch processing

**Type:** Feature

**Template:** feature.yml

### Goal

Enable users to load multiple video clips, apply common processing settings to all, reorder them, edit individually, and merge into a single output file.

### Description

New workflow:

1. User uploads 2+ video files → they appear in a queue/timeline view
2. User can drag files to reorder them
3. User can select a clip to edit individually (crop, duration trim, effects)
4. Global settings (crop dimension, output size limit, etc.) apply to all clips
5. User clicks "Merge & Process" → outputs single video file with proper concatenation
6. Queue allows adding/removing clips, re-editing, re-ordering between sessions

### Example scenario

- Record 4 clips on phone (portrait, all different durations)
- Upload all 4 to Sophisticate
- Set global crop to 4:3 (applies to all)
- Set global size limit to 1920×1080
- Edit clip #2 individually: add 2-second trim at start
- Reorder: make clip #3 first
- Merge → output: one seamless 4:3 video with all clips in new order, all constraints applied

### Acceptance criteria

- [ ] Multiple file upload supported (drag-drop or file picker)
- [ ] Queue/timeline UI shows all loaded clips
- [ ] Clips can be reordered via drag-and-drop
- [ ] Clicking a clip opens individual editor (crop, trim, etc.)
- [ ] Global parameters (crop/size) apply to all clips
- [ ] Each clip can override individual settings locally
- [ ] Merge operation concatenates clips correctly
- [ ] Output file is created and downloadable
- [ ] Queue persists during session (survives navigating away)
- [ ] Removing a clip from queue works correctly
- [ ] No data loss when switching between clips in editor

### Priority

`priority:high` — core feature request from usage

### Considerations

- **UX challenge:** Distinguish global vs per-clip settings clearly
- **File format compatibility:** Ensure all input formats can be merged (codec constraints?)
- **Performance:** Merging large videos may be slow → show progress
- **Undo/redo:** Queue changes need undo support, or at least "reset to last save"
- **Storage:** Temp files for individual clips during merge — cleanup after completion
- **Mobile vs desktop:** Different UX for queue on small vs large screens?

### Labels

- `enhancement`
- `priority:high`
- `queue`
- `merge`

---

**How to add these issues:**

1. Go to your repo → Issues → New issue
2. Choose the template matching the issue type
3. Copy the content above (minus "Type" and "Template" labels) into each field
4. Add labels (automatically add from this document)
5. Don't assign to yourself yet — let them sit in Backlog for triage
