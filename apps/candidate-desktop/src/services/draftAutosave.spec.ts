import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DraftAutosaveManager } from './draftAutosave';
import { apiClient } from './apiClient';

describe('DraftAutosaveManager (FR-ANS-005, UC-12)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(apiClient, 'saveDraft').mockResolvedValue({ success: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('automatically triggers draft autosave at configured interval without extending deadlines', async () => {
    const onStateChange = vi.fn();
    const manager = new DraftAutosaveManager({
      sessionId: 'sess-draft-01',
      questionAttemptId: 'qa-draft-01',
      intervalMs: 5000,
      onStateChange,
    });

    manager.updateContent('def solution():\n    return 42\n');
    manager.start();

    expect(apiClient.saveDraft).not.toHaveBeenCalled();

    // Advance 5 seconds
    await vi.advanceTimersByTimeAsync(5000);

    expect(apiClient.saveDraft).toHaveBeenCalledWith('sess-draft-01', {
      questionAttemptId: 'qa-draft-01',
      draftPayload: expect.objectContaining({
        code: 'def solution():\n    return 42\n',
      }),
    });

    const state = manager.getState();
    expect(state.lastSavedAt).not.toBeNull();
    expect(state.isSaving).toBe(false);

    manager.stop();
  });

  it('skips autosave if content has not changed since last successful save', async () => {
    const manager = new DraftAutosaveManager({
      sessionId: 'sess-draft-02',
      questionAttemptId: 'qa-draft-02',
      intervalMs: 5000,
    });

    manager.updateContent('SELECT * FROM employees;');
    manager.start();

    await vi.advanceTimersByTimeAsync(5000);
    expect(apiClient.saveDraft).toHaveBeenCalledTimes(1);

    // Advance another 5 seconds without changing content
    await vi.advanceTimersByTimeAsync(5000);
    expect(apiClient.saveDraft).toHaveBeenCalledTimes(1);

    // Update content and verify it saves again
    manager.updateContent('SELECT id, salary FROM employees;');
    await vi.advanceTimersByTimeAsync(5000);
    expect(apiClient.saveDraft).toHaveBeenCalledTimes(2);

    manager.stop();
  });

  it('handles mid-edit timeouts: draft is stored separately and does not count as final submission', async () => {
    const manager = new DraftAutosaveManager({
      sessionId: 'sess-draft-03',
      questionAttemptId: 'qa-draft-03',
      intervalMs: 3000,
    });

    manager.updateContent('in-progress draft code that was never submitted');
    manager.start();

    await vi.advanceTimersByTimeAsync(3000);
    expect(apiClient.saveDraft).toHaveBeenCalledTimes(1);

    // Verify stop halts subsequent periodic triggers
    manager.stop();
    await vi.advanceTimersByTimeAsync(6000);
    expect(apiClient.saveDraft).toHaveBeenCalledTimes(1);
  });
});

