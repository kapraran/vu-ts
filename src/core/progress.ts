/**
 * Progress tracking utilities for long-running operations
 */

export type OutputMode = "quiet" | "normal" | "verbose";

export interface ProgressOptions {
  /** Total number of items to process */
  total: number;
  /** Update frequency (default: every 100 items) */
  updateEvery?: number;
  /** Custom format string using {current}, {total}, {percentage} */
  format?: string;
  /** Show spinner animation */
  showSpinner?: boolean;
  /** Output mode for different verbosity levels */
  mode?: OutputMode;
}

/**
 * Simple progress tracker for batch operations
 */
export class ProgressTracker {
  private current = 0;
  private total: number;
  private updateEvery: number;
  private lastUpdate = 0;
  private format: string;
  private showSpinner: boolean;
  private mode: OutputMode;
  private startTime: number;
  private frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  private frameIndex = 0;

  constructor(options: ProgressOptions) {
    this.total = options.total;
    this.updateEvery = options.updateEvery || 100;
    this.format =
      options.format || "   {spinner} Processing {current}/{total} files...";
    this.showSpinner = options.showSpinner ?? true;
    this.mode = options.mode || "normal";
    this.startTime = Date.now();
  }

  /**
   * Increment progress and display update if needed
   */
  increment(amount: number = 1): void {
    this.current += amount;
    this.lastUpdate = this.current;

    // In quiet mode, only show completion
    if (this.mode === "quiet") {
      if (this.current === this.total) {
        this.display();
      }
      return;
    }

    // Only update display every N items or on final item
    if (this.current % this.updateEvery === 0 || this.current === this.total) {
      this.display();
    }
  }

  /**
   * Display current progress
   */
  private display(): void {
    // Skip display in quiet mode
    if (this.mode === "quiet") return;

    const percentage = Math.round((this.current / this.total) * 100);
    const elapsed = Date.now() - this.startTime;
    const rate = this.current / (elapsed / 1000);
    const eta = rate > 0 ? (this.total - this.current) / rate : 0;

    const spinner = this.showSpinner
      ? this.frames[this.frameIndex % this.frames.length]
      : "";

    let output = this.format
      .replace("{current}", this.current.toString())
      .replace("{total}", this.total.toString())
      .replace("{percentage}", `${percentage}%`)
      .replace("{spinner}", spinner);

    // Add rate and ETA for operations that take a while (verbose mode always shows it)
    if (this.mode === "verbose" || this.total > 1000) {
      if (eta > 60) {
        const mins = Math.floor(eta / 60);
        const secs = Math.floor(eta % 60);
        output += ` (${rate.toFixed(1)}/s, ETA ${mins}m${secs}s)`;
      } else if (eta > 0) {
        output += ` (${rate.toFixed(1)}/s, ETA ${Math.ceil(eta)}s)`;
      } else {
        output += ` (${rate.toFixed(1)}/s)`;
      }
    }

    // Clear the entire line first, then write the new progress
    const lineWidth = process.stdout.columns || 80;
    const spaces = " ".repeat(Math.max(0, lineWidth - output.length));
    process.stdout.write("\r" + output + spaces);
    this.frameIndex++;

    // Write newline on completion
    if (this.current === this.total) {
      process.stdout.write("\n");
    }
  }

  /**
   * Mark as complete
   */
  finish(message?: string): void {
    if (message) {
      process.stdout.write("\r" + " ".repeat(process.stdout.columns || 80) + "\r");
      console.log(message);
    } else {
      this.current = this.total;
      this.display();
    }
  }
}

/**
 * Create a simple status line
 */
export function status(message: string): void {
  const lineWidth = process.stdout.columns || 80;
  process.stdout.write("\r" + " ".repeat(lineWidth) + "\r");
  console.log(message);
}

/**
 * Create a success message with checkmark
 */
export function success(message: string): void {
  console.log(`   ✓ ${message}`);
}

/**
 * Create an info message
 */
export function info(message: string): void {
  console.log(`   ${message}`);
}
