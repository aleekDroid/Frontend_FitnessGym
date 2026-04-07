import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ToastComponent } from './shared/components/toast/toast.component';
import { inject as injectAnalytics } from '@vercel/analytics';
import { injectSpeedInsights } from '@vercel/speed-insights';

import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, ToastComponent],
  template: `
    <router-outlet />
    <app-toast />
  `,
  styles: [``]
})
export class AppComponent implements OnInit {
  constructor() {}

  ngOnInit() {
    if (environment.production) {
      injectAnalytics();
      injectSpeedInsights();
    }
  }
}

