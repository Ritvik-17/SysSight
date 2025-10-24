import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dash-board',
  imports: [CommonModule],
  templateUrl: './dash-board.html',
  styleUrl: './dash-board.css',
})
export class DashBoard {

  agents: any = [];

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit() {
    this.loadAgents();
    setInterval(() => this.loadAgents(), 10000); // refresh every 10s
  }

  loadAgents() {
    this.http.get<any[]>('http://localhost:5000/api/agents/latest')
      .subscribe({
        next: data => {this.agents = data; console.log('Agents loaded', data);},
        error: err => console.error('Error loading agents', err)
      });
  }

  onAgentClick(agentId: string) {
    this.router.navigate(['/agent', agentId]);
  }
}