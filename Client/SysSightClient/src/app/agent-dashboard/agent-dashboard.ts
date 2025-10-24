import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { interval } from 'rxjs';
import { io, Socket } from 'socket.io-client';

@Component({
  selector: 'app-agent-dashboard',
  imports: [CommonModule],
  templateUrl: './agent-dashboard.html',
  styleUrl: './agent-dashboard.css',
})
export class AgentDashboard {

    private socket: Socket;
      viewing = false;
  processes: any[] = [];
  showProcesses = false;
  logs: any[] = [];
  private updateSub?: any;
  private agentId: string | null = null;
  private apiUrl = `http://localhost:5000/api/agents`; // your backend route


  constructor(private http: HttpClient, private route: ActivatedRoute) {
    this.socket = io('http://localhost:5000');
    this.socket.on('process_data', (data: any) => {
      if (data.agentId === this.agentId) {
        this.processes = data.processes;
      }
    });
  }

  ngOnInit(): void {
    // Get agentId from the URL
    this.agentId = this.route.snapshot.paramMap.get('agentId');
    if (!this.agentId) return;

    this.fetchInitialData();

    // Update every 10 seconds
    this.updateSub = interval(10000).subscribe(() => this.fetchNewData());
  }

  viewProcesses() {
    this.viewing = true;
    this.socket.emit('view_processes', this.agentId);
  }


fetchInitialData() {
  const afterTime = new Date(0).toISOString(); // safe default

  this.http.get<any[]>(`${this.apiUrl}/${this.agentId}/updates?after=${encodeURIComponent(afterTime)}`)
    .subscribe(data => {
      // Transform and sort newest first
      this.logs = data
        .map(d => ({
          agentId: d.agentId,
          time: d.createdAt,
          cpu: d.cpuUsage,
          memory: d.memoryUsage
        }))
        .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    }, err => {
      console.error("Error fetching initial data:", err);
    });
}

fetchNewData() {
  if (this.logs.length === 0) return;
  const lastTime = this.logs[0].time; // newest entry is at index 0

  this.http.get<any[]>(`${this.apiUrl}/${this.agentId}/updates?after=${encodeURIComponent(lastTime)}`)
    .subscribe(newData => {
      if (newData.length > 0) {
        const transformed = newData.map(d => ({
          agentId: d.agentId,
          time: d.createdAt,
          cpu: d.cpuUsage,
          memory: d.memoryUsage
        }));
        // Prepend newest data to the logs
        this.logs = [...transformed.reverse(), ...this.logs];
      }
    });
}

  ngOnDestroy() {
    this.updateSub?.unsubscribe();
  }
}
