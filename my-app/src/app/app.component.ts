import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { AfterViewChecked, ChangeDetectorRef, Component, ElementRef, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { marked } from 'marked';
import { firstValueFrom, TimeoutError, timeout } from 'rxjs';

interface ChatMessage {
  id: number;
  type: 'user' | 'ai' | 'error';
  content: string;
  timestamp: Date;
}

interface GenerateResponse {
  output_text: string;
  model: string;
}

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [DatePipe, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements AfterViewChecked {
  @ViewChild('messagesContainer') private messagesContainer?: ElementRef<HTMLDivElement>;

  private readonly http = inject(HttpClient);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly apiUrl = 'http://localhost:8000/generate';
  private renderedMessageCount = 0;

  messages: ChatMessage[] = [];
  draft = '';
  model = 'gpt-5.4-nano';
  isLoading = false;
  readonly suggestions = [
    { icon: '✳', title: 'לכתוב משהו', text: 'עזור לי לנסח הודעה ברורה ונעימה' },
    { icon: '⌘', title: 'לחשוב יחד', text: 'תן לי רעיונות לפרויקט יצירתי חדש' },
    { icon: '⌁', title: 'ללמוד נושא', text: 'הסבר לי נושא מורכב בצורה פשוטה' },
  ];

  ngAfterViewChecked(): void {
    if (this.messages.length !== this.renderedMessageCount) {
      this.renderedMessageCount = this.messages.length;
      this.messagesContainer?.nativeElement.scrollTo({
        top: this.messagesContainer.nativeElement.scrollHeight,
        behavior: 'smooth',
      });
    }
  }

  async sendMessage(): Promise<void> {
    const prompt = this.draft.trim();
    if (!prompt || this.isLoading) return;

    this.messages = [
      ...this.messages,
      { id: Date.now(), type: 'user', content: prompt, timestamp: new Date() },
    ];
    this.draft = '';
    this.isLoading = true;

    try {
      const conversation = this.messages
        .filter((message) => message.type === 'user' || message.type === 'ai')
        .map(
          (message): ConversationMessage => ({
            role: message.type === 'user' ? 'user' : 'assistant',
            content: message.content,
          }),
        );
      const response = await firstValueFrom(
        this.http
          .post<GenerateResponse>(this.apiUrl, { model: this.model, input: conversation })
          .pipe(timeout({ first: 110_000 })),
      );

      if (!response.output_text) {
        throw new Error('השרת החזיר תשובה ריקה. נסו שוב.');
      }

      this.messages = [
        ...this.messages,
        { id: Date.now(), type: 'ai', content: response.output_text, timestamp: new Date() },
      ];
    } catch (error: unknown) {
      this.messages = [
        ...this.messages,
        { id: Date.now(), type: 'error', content: this.getErrorMessage(error), timestamp: new Date() },
      ];
    } finally {
      this.isLoading = false;
      this.changeDetector.markForCheck();
    }
  }

  useSuggestion(text: string): void {
    this.draft = text;
  }

  clearChat(): void {
    if (this.isLoading) return;
    this.messages = [];
    this.draft = '';
  }

  onComposerKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void this.sendMessage();
    }
  }

  renderMarkdown(content: string): string {
    return marked.parse(content, { async: false, breaks: true, gfm: true });
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof TimeoutError) {
      return 'לא התקבלה תשובה מהשרת בתוך שתי דקות. נסו שוב בעוד רגע.';
    }

    if (error instanceof HttpErrorResponse) {
      const detail = error.error?.detail;
      if (typeof detail === 'string') return `לא הצלחנו לקבל תשובה: ${detail}`;
      if (error.status === 0) return 'לא ניתן להתחבר לשרת. בדקו שהשרת פועל ונסו שוב.';
      return `השרת החזיר שגיאה (${error.status}). ${error.message}`;
    }
    return error instanceof Error
      ? `לא הצלחנו לקבל תשובה: ${error.message}`
      : 'אירעה שגיאה לא צפויה. נסו שוב.';
  }
}
