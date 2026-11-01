/**
 * Draft Autosave Service & Controller
 * Traceability: FR-ANS-005, FR-TIME-005, UC-12
 * - Autosaves at a configurable interval (default: 10s).
 * - Never extends deadlines or counts as a submission.
 * - Handles timeout mid-edit: last accepted submission is the only finalized state.
 */

import { apiClient } from './apiClient';
import { DraftAutosaveState } from '../types/codeRunner';

export interface DraftAutosaveOptions {
  sessionId: string;
  questionAttemptId: string;
  intervalMs?: number;
  onStateChange?: (state: DraftAutosaveState) => void;
}

export class DraftAutosaveManager {
  private timerId: ReturnType<typeof setInterval> | null = null;
  private lastSavedContent: string | null = null;
  private currentContent: string = '';
  private options: DraftAutosaveOptions;
  private isDestroyed = false;

  private state: DraftAutosaveState = {
    lastSavedAt: null,
    isSaving: false,
    error: null,
  };

  constructor(options: DraftAutosaveOptions) {
    this.options = {
      intervalMs: 10000, // 10 seconds default
      ...options,
    };
  }

  public updateContent(content: string): void {
    this.currentContent = content;
  }

  public start(): void {
    if (this.timerId) clearInterval(this.timerId);
    this.isDestroyed = false;

    this.timerId = setInterval(() => {
      this.triggerAutosave();
    }, this.options.intervalMs);
  }

  public stop(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.isDestroyed = true;
  }

  public getState(): DraftAutosaveState {
    return { ...this.state };
  }

  public async triggerAutosave(): Promise<boolean> {
    if (this.isDestroyed) return false;

    // Skip if unchanged or empty
    if (this.currentContent === this.lastSavedContent || !this.currentContent.trim()) {
      return false;
    }

    const contentToSave = this.currentContent;
    this.state.isSaving = true;
    this.state.error = null;
    this.notifyState();

    try {
      await apiClient.saveDraft(this.options.sessionId, {
        questionAttemptId: this.options.questionAttemptId,
        draftPayload: {
          code: contentToSave,
          savedAt: new Date().toISOString(),
        },
      });

      this.lastSavedContent = contentToSave;
      this.state.isSaving = false;
      this.state.lastSavedAt = new Date().toISOString();
      this.state.error = null;
      this.notifyState();
      return true;
    } catch (err) {
      this.state.isSaving = false;
      this.state.error = (err as Error).message || 'Autosave failed';
      this.notifyState();
      return false;
    }
  }

  private notifyState(): void {
    if (this.options.onStateChange) {
      this.options.onStateChange({ ...this.state });
    }
  }
}
