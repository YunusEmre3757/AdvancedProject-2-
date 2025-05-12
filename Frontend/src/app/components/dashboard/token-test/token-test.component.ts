import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

import { interval, Subscription } from 'rxjs';
import { AuthService } from '../../../services/auth.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-token-test',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="token-test-container">
      <h3>Token Refresh Test</h3>
      
      <div class="token-info">
        <p><strong>Access Token (Last 10 chars):</strong> {{ getLastChars(accessToken) }}</p>
        <p><strong>Refresh Token (Last 10 chars):</strong> {{ getLastChars(refreshToken) }}</p>
        <p><strong>Last Updated:</strong> {{ lastUpdated | date:'HH:mm:ss' }}</p>
      </div>
      
      <div class="info-panel">
        <div class="info-item">
          <p><strong>Backend Config:</strong></p>
          <ul>
            <li>Max Token Refresh: 5 times</li>
            <li>Rate Limit: 5 requests / 120 seconds</li>
          </ul>
        </div>
        <div *ngIf="isRateLimited" class="rate-limit-warning">
          <p>Rate limit enforced! Wait {{ rateLimitTimeRemaining }} seconds before trying again.</p>
        </div>
      </div>
      
      <div class="controls">
        <button (click)="makeTestRequest()" [disabled]="isRateLimited" class="btn btn-primary">Make Test Request</button>
        <button (click)="forceRefreshToken()" [disabled]="isRateLimited" class="btn btn-warning">Force Refresh Token</button>
        <button (click)="checkTokens()" class="btn btn-info">Check Current Tokens</button>
        <button (click)="logout()" class="btn btn-danger">Logout</button>
      </div>
      
      <div *ngIf="refreshCount > 0" class="refresh-counter">
        <p>Refresh Counter: <strong>{{ refreshCount }}</strong>/5</p>
        <div class="progress">
          <div class="progress-bar" [style.width]="(refreshCount / 5 * 100) + '%'"></div>
        </div>
      </div>
      
      <div *ngIf="rateLimitedAttempts > 0" class="rate-limit-counter">
        <p>Rate Limit Usage: <strong>{{ rateLimitedAttempts }}</strong>/5 attempts in 120 seconds</p>
        <div class="progress">
          <div class="progress-bar" [style.width]="(rateLimitedAttempts / 5 * 100) + '%'" [style.background-color]="'#dc3545'"></div>
        </div>
      </div>
      
      <div *ngIf="requests.length > 0" class="request-log">
        <h4>Request Log:</h4>
        <ul>
          <li *ngFor="let req of requests">
            {{ req.time | date:'HH:mm:ss' }} - {{ req.status }}
            <span *ngIf="req.isRefreshed" class="refreshed-tag">Token Refreshed!</span>
            <span *ngIf="req.isRateLimited" class="rate-limited-tag">Rate Limited!</span>
          </li>
        </ul>
      </div>
    </div>
  `,
  styles: [`
    .token-test-container {
      padding: 20px;
      background-color: #f8f9fa;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    
    .token-info {
      background-color: #e9ecef;
      padding: 15px;
      border-radius: 5px;
      margin-bottom: 20px;
    }
    
    .info-panel {
      background-color: #f0f7ff;
      padding: 15px;
      border-radius: 5px;
      margin-bottom: 20px;
      border-left: 4px solid #007bff;
    }
    
    .info-panel ul {
      margin-bottom: 0;
      padding-left: 20px;
    }
    
    .rate-limit-warning {
      margin-top: 10px;
      padding: 8px;
      background-color: #ffe9e9;
      border-radius: 4px;
      border-left: 4px solid #dc3545;
    }
    
    .rate-limit-warning p {
      margin: 0;
      color: #dc3545;
      font-weight: bold;
    }
    
    .controls {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }
    
    .request-log {
      background-color: #e9ecef;
      padding: 15px;
      border-radius: 5px;
      margin-top: 20px;
      max-height: 300px;
      overflow-y: auto;
    }
    
    .refreshed-tag {
      background-color: #28a745;
      color: white;
      padding: 2px 6px;
      border-radius: 4px;
      margin-left: 10px;
      font-size: 12px;
    }
    
    .rate-limited-tag {
      background-color: #dc3545;
      color: white;
      padding: 2px 6px;
      border-radius: 4px;
      margin-left: 10px;
      font-size: 12px;
    }
    
    .btn {
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      border: none;
      color: white;
    }
    
    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    
    .btn-primary {
      background-color: #007bff;
    }
    
    .btn-info {
      background-color: #17a2b8;
    }
    
    .btn-warning {
      background-color: #ffc107;
      color: #212529;
    }
    
    .btn-danger {
      background-color: #dc3545;
    }
    
    .refresh-counter, .rate-limit-counter {
      margin: 15px 0;
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
      background-color: #f8f9fa;
    }
    
    .refresh-counter p, .rate-limit-counter p {
      margin: 0 0 10px 0;
    }
    
    .progress {
      height: 20px;
      background-color: #e9ecef;
      border-radius: 4px;
      overflow: hidden;
    }
    
    .progress-bar {
      height: 100%;
      background-color: #ffc107;
      transition: width 0.3s ease;
    }
  `]
})
export class TokenTestComponent implements OnInit, OnDestroy {
  accessToken: string = '';
  refreshToken: string = '';
  lastUpdated: Date = new Date();
  requests: Array<{time: Date, status: string, isRefreshed: boolean, isRateLimited?: boolean}> = [];
  previousAccessToken: string = '';
  refreshCount: number = 0;
  
  // Rate limiting related variables
  isRateLimited: boolean = false;
  rateLimitedAttempts: number = 0;
  rateLimitTimeRemaining: number = 0;
  rateLimitTimer: Subscription | null = null;
  
  // Backend configuration constants
  readonly MAX_REFRESH_COUNT = 5;
  readonly RATE_LIMIT_MAX_ATTEMPTS = 5;
  readonly RATE_LIMIT_WINDOW_SECONDS = 120;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.checkTokens();
  }
  
  ngOnDestroy(): void {
    if (this.rateLimitTimer) {
      this.rateLimitTimer.unsubscribe();
    }
  }

  checkTokens(): void {
    this.previousAccessToken = this.accessToken;
    this.accessToken = this.authService.getAccessToken() || '';
    this.refreshToken = this.authService.getRefreshToken() || '';
    this.lastUpdated = new Date();
    
    // Check if token was refreshed
    if (this.previousAccessToken && this.accessToken !== this.previousAccessToken) {
      console.log('Token was refreshed!');
      this.refreshCount++;
      this.requests.push({
        time: new Date(),
        status: 'Tokens updated',
        isRefreshed: true
      });
    }
  }

  makeTestRequest(): void {
    this.incrementRateLimitCounter();
    
    // Make a request to a protected endpoint to test authentication
    this.http.get(`${environment.apiUrl}/test-auth`)
      .subscribe({
        next: (response) => {
          console.log('Request succeeded:', response);
          this.requests.push({
            time: new Date(),
            status: 'Request succeeded',
            isRefreshed: false
          });
          // Check if token was updated after request
          setTimeout(() => this.checkTokens(), 500);
        },
        error: (error) => {
          console.error('Request failed:', error);
          const isRateLimited = error.status === 429;
          
          if (isRateLimited) {
            this.handleRateLimiting();
          }
          
          this.requests.push({
            time: new Date(),
            status: `Request failed: ${error.status} ${error.statusText}`,
            isRefreshed: false,
            isRateLimited
          });
          
          // Check if token was updated after error
          setTimeout(() => this.checkTokens(), 500);
        }
      });
  }
  
  forceRefreshToken(): void {
    this.incrementRateLimitCounter();
    
    this.authService.refreshToken().subscribe({
      next: (response) => {
        console.log('Manually refreshed token successfully:', response);
        this.requests.push({
          time: new Date(),
          status: 'Manually refreshed token',
          isRefreshed: true
        });
        this.checkTokens();
      },
      error: (error) => {
        console.error('Manual token refresh failed:', error);
        const isRateLimited = error.status === 429;
        
        if (isRateLimited) {
          this.handleRateLimiting();
        }
        
        this.requests.push({
          time: new Date(),
          status: `Token refresh failed: ${error.status} ${error.statusText || 'Max usage limit reached'}`,
          isRefreshed: false,
          isRateLimited
        });
      }
    });
  }
  
  incrementRateLimitCounter(): void {
    this.rateLimitedAttempts++;
    
    // Reset counter after window expires
    setTimeout(() => {
      this.rateLimitedAttempts = Math.max(0, this.rateLimitedAttempts - 1);
    }, this.RATE_LIMIT_WINDOW_SECONDS * 1000);
  }
  
  handleRateLimiting(): void {
    this.isRateLimited = true;
    this.rateLimitTimeRemaining = this.RATE_LIMIT_WINDOW_SECONDS;
    
    // Update countdown timer
    if (this.rateLimitTimer) {
      this.rateLimitTimer.unsubscribe();
    }
    
    this.rateLimitTimer = interval(1000).subscribe(() => {
      this.rateLimitTimeRemaining--;
      
      if (this.rateLimitTimeRemaining <= 0) {
        this.isRateLimited = false;
        this.rateLimitedAttempts = 0;
        this.rateLimitTimer?.unsubscribe();
      }
    });
  }
  
  logout(): void {
    const userId = this.authService.currentUserValue?.id;
    if (userId) {
      this.http.post(`${environment.apiUrl}/auth/logout`, null, {
        params: { userId: userId.toString() }
      }).subscribe({
        next: () => {
          this.authService.logout();
          this.requests.push({
            time: new Date(),
            status: 'Logged out successfully',
            isRefreshed: false
          });
          this.refreshCount = 0;
          window.location.href = '/auth/login';
        },
        error: (error) => {
          console.error('Logout failed:', error);
          this.requests.push({
            time: new Date(),
            status: `Logout failed: ${error.status} ${error.statusText}`,
            isRefreshed: false
          });
        }
      });
    } else {
      this.authService.logout();
      window.location.href = '/auth/login';
    }
  }

  getLastChars(token: string, chars: number = 10): string {
    if (!token) return 'Not available';
    return token.length > chars ? '...' + token.slice(-chars) : token;
  }
} 