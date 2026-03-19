export class BannerRenderer {
  private el: HTMLElement;
  private hideTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.el = document.getElementById('banner')!;
  }

  show(text: string, type: 'win' | 'lose', durationMs: number): void {
    if (this.hideTimeout) clearTimeout(this.hideTimeout);
    this.el.textContent = text;
    this.el.className = type;
    // Force reflow before adding visible so transition fires
    void this.el.offsetHeight;
    this.el.classList.add('visible');
    this.hideTimeout = setTimeout(() => this.hide(), durationMs);
  }

  hide(): void {
    this.el.classList.remove('visible');
  }
}
