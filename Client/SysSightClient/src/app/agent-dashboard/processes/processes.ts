import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { io, Socket } from 'socket.io-client';

@Component({
  selector: 'app-processes',
  templateUrl: './processes.html',
  styleUrl: './processes.css',
  imports: [CommonModule]
})
export class Processes {
  private socket!: Socket;
  agentId: string | null = null;
  processes: any[] = [];
  loading = true;

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.agentId = this.route.snapshot.paramMap.get('agentId');
    if (!this.agentId) return;

    this.socket = io('http://localhost:5000');

    // Listen for process data
    this.socket.on('process_data', (data: any) => {
      if (data.agentId === this.agentId) {
        this.processes = data.processes;
        this.loading = false;
      }
    });

    // Request processes from server
    this.socket.emit('view_processes', this.agentId);
  }

  ngOnDestroy(): void {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}
