import { Component, inject } from '@angular/core';
import { ApiService } from './services/api.service';
import { RouterLink, RouterOutlet } from '@angular/router';
import { Loader } from './components/loader/loader';

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: './app.html',
  styleUrl:'./app.css',
  imports:[RouterOutlet,RouterLink,Loader]
})
export class App {

  private readonly apiService = inject(ApiService);

  message = 'Checking backend...';
  sidebarCollapsed = false;

  toggleSidebar(): void {
    this.sidebarCollapsed =
      !this.sidebarCollapsed;
  }

  ngOnInit(): void {

    this.apiService.getHealth().subscribe({
      next: (response) => {
        this.message = response.message;
      },
      error: (error) => {
        console.error('Backend error:', error);
        this.message = 'Backend connection failed';
      }
    });
  }
}