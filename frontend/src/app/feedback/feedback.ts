import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ApiService, Feedback, FeedbackPriority } from '../services/api.service';
import { AuthService } from '../services/auth.service';

interface PriorityOption {
  value: FeedbackPriority;
  label: string;
}

@Component({
  selector: 'app-feedback',
  imports: [RouterModule, DatePipe],
  templateUrl: './feedback.html',
  styleUrl: './feedback.scss',
})
export class FeedbackComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);

  protected readonly items = signal<Feedback[]>([]);
  protected readonly message = signal('');
  protected readonly priority = signal<FeedbackPriority>('MEDIUM');
  protected readonly submitting = signal(false);

  protected readonly priorities: PriorityOption[] = [
    { value: 'LOW', label: 'Niedrig' },
    { value: 'MEDIUM', label: 'Mittel' },
    { value: 'HIGH', label: 'Hoch' },
  ];

  protected readonly currentUserId = computed(() => this.auth.user()?.id ?? null);

  protected readonly openItems = computed(() => this.items().filter(i => !i.done));
  protected readonly doneItems = computed(() => this.items().filter(i => i.done));

  ngOnInit() {
    this.api.getFeedback().subscribe(items => this.items.set(items));
  }

  protected onMessageInput(event: Event) {
    this.message.set((event.target as HTMLTextAreaElement).value);
  }

  protected onPriorityChange(event: Event) {
    this.priority.set((event.target as HTMLSelectElement).value as FeedbackPriority);
  }

  protected submit() {
    const text = this.message().trim();
    if (!text || this.submitting()) return;
    this.submitting.set(true);
    this.api.createFeedback(text, this.priority()).subscribe({
      next: created => {
        this.items.update(list => [created, ...list]);
        this.message.set('');
        this.priority.set('MEDIUM');
        this.submitting.set(false);
      },
      error: () => this.submitting.set(false),
    });
  }

  protected toggleDone(item: Feedback) {
    this.api.setFeedbackDone(item.id, !item.done).subscribe(updated => {
      this.items.update(list => list.map(i => i.id === updated.id ? updated : i));
    });
  }

  protected remove(item: Feedback) {
    if (!confirm('Dieses Feedback wirklich löschen?')) return;
    this.api.deleteFeedback(item.id).subscribe(() => {
      this.items.update(list => list.filter(i => i.id !== item.id));
    });
  }

  protected canDelete(item: Feedback): boolean {
    return item.authorId === this.currentUserId();
  }

  protected priorityLabel(p: FeedbackPriority): string {
    return this.priorities.find(o => o.value === p)?.label ?? p;
  }
}
