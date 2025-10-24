
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnDestroy, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { io, Socket} from 'socket.io-client';
import { interval, Subscription } from 'rxjs';
import { Chart,  registerables } from 'chart.js';

Chart.register(...registerables);

interface AgentLog {
  agentId: string;
  hostname: string;
  time: string;
  cpu: number;
  memory: number;
  disk: number;
  netSentRate: number;
  netRecvRate: number;
  netBytesSent: number;
  netBytesRecv: number;
  load1: number;
  load5: number;
  load15: number;
  os: string;
  os_version: string;


}

@Component({
  selector: 'app-agent-dashboard',
  imports: [CommonModule],
  templateUrl: './agent-dashboard.html',
  styleUrl: './agent-dashboard.css',
})

export class AgentDashboard implements OnInit, AfterViewInit {
  @ViewChild('cpuChart') cpuChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('memoryChart') memoryChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('diskChart') diskChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('networkChart') networkChartRef!: ElementRef<HTMLCanvasElement>;
private socket!: Socket; // tell TS that this will be initialized later

  logs: AgentLog[] = [];
  latestLog: AgentLog | null = null;
  processes: any[] = [];
  viewing: boolean = false;
  showAlert = false;
  alertMessage = '';

  private cpuChart: Chart | null = null;
  private memoryChart: Chart | null = null;
  private diskChart: Chart | null = null;
  private networkChart: Chart | null = null;
  
  private updateSub?: Subscription;
  private agentId: string | null = null;
  private apiUrl = `http://localhost:5000/api/agents`;
  private maxDataPoints = 20; // Keep last 20 data points for charts

  constructor(private http: HttpClient, private route: ActivatedRoute,  private router: Router ) {
    this.socket = io('http://localhost:5000');
    this.socket.on('process_data', (data: any) => {
      if (data.agentId === this.agentId) {
        this.processes = data.processes;
      }
    });
  }

  ngOnInit(): void {
    this.agentId = this.route.snapshot.paramMap.get('agentId');
    if (!this.agentId) return;

    this.fetchInitialData();
    this.updateSub = interval(10000).subscribe(() => this.fetchNewData());
  }
    ngAfterViewInit(): void {

    this.initializeCharts();
  }

  viewProcesses() {
    this.viewing = true;
    this.socket.emit('view_processes', this.agentId);
  }

  fetchInitialData() {
    const afterTime = new Date(0).toISOString();

    this.http.get<any[]>(`${this.apiUrl}/${this.agentId}/updates?after=${encodeURIComponent(afterTime)}`)
      .subscribe(data => {
        this.logs = data
          .map(d => this.transformData(d))
          .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
          .slice(0, this.maxDataPoints);
        
        if (this.logs.length > 0) {
          this.latestLog = this.logs[0];
          this.updateCharts();
        }
      }, err => {
        console.error("Error fetching initial data:", err);
      });
  }

  openProcesses(){
      if (this.agentId) {
    this.router.navigate([`/process/${this.agentId}`]);
  }     
  }

  fetchNewData() {
    if (this.logs.length === 0) return;
    const lastTime = this.logs[0].time;

    this.http.get<any[]>(`${this.apiUrl}/${this.agentId}/updates?after=${encodeURIComponent(lastTime)}`)
      .subscribe(newData => {
        if (newData.length > 0) {
          const transformed = newData.map(d => this.transformData(d));
          this.logs = [...transformed.reverse(), ...this.logs].slice(0, this.maxDataPoints);
          this.latestLog = this.logs[0];
          this.updateCharts();
        }
      });
  }

  private transformData(d: any): AgentLog {
    return {
      agentId: d.agentId,
      hostname: d.hostname,
      time: d.createdAt,
      cpu: d.cpuUsage,
      memory: d.memoryUsage,
      disk: d.diskUsage,
      netSentRate: d.netSentRate,
      netRecvRate: d.netRecvRate,
      netBytesSent: d.netBytesSent,
      netBytesRecv: d.netBytesRecv,
      load1: d.load1,
      load5: d.load5,
      load15: d.load15,
      os: d.os,
      os_version: d.os_version
    };
  }

  private initializeCharts() {
    if (!this.cpuChartRef || !this.memoryChartRef || !this.diskChartRef || !this.networkChartRef) {
      return;
    }


    this.cpuChart = new Chart(this.cpuChartRef.nativeElement, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'CPU Usage (%)',
          data: [],
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true },
          title: { display: true, text: 'CPU Usage' }
        },
        scales: {
          y: { beginAtZero: true, max: 100 }
        }
      }
    });

    this.memoryChart = new Chart(this.memoryChartRef.nativeElement, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'Memory Usage (%)',
          data: [],
          borderColor: 'rgb(168, 85, 247)',
          backgroundColor: 'rgba(168, 85, 247, 0.1)',
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true },
          title: { display: true, text: 'Memory Usage' }
        },
        scales: {
          y: { beginAtZero: true, max: 100 }
        }
      }
    });


    this.diskChart = new Chart(this.diskChartRef.nativeElement, {
      type: 'doughnut',
      data: {
        labels: ['Used', 'Free'],
        datasets: [{
          data: [0, 100],
          backgroundColor: ['rgb(239, 68, 68)', 'rgb(229, 231, 235)'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true },
          title: { display: true, text: 'Disk Usage' }
        }
      }
    });


    this.networkChart = new Chart(this.networkChartRef.nativeElement, {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          {
            label: 'Sent (KB/s)',
            data: [],
            borderColor: 'rgb(34, 197, 94)',
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            tension: 0.4,
            fill: true
          },
          {
            label: 'Received (KB/s)',
            data: [],
            borderColor: 'rgb(249, 115, 22)',
            backgroundColor: 'rgba(249, 115, 22, 0.1)',
            tension: 0.4,
            fill: true
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true },
          title: { display: true, text: 'Network Activity' }
        },
        scales: {
          y: { beginAtZero: true }
        }
      }
    });

    this.updateCharts();
  }

  private updateCharts() {
    if (!this.cpuChart || !this.memoryChart || !this.diskChart || !this.networkChart) {
      return;
    }

    const reversedLogs = [...this.logs].reverse();
    const labels = reversedLogs.map(log => new Date(log.time).toLocaleTimeString());

    this.cpuChart.data.labels = labels;
    this.cpuChart.data.datasets[0].data = reversedLogs.map(log => log.cpu);
    this.cpuChart.update('none');


    this.memoryChart.data.labels = labels;
    this.memoryChart.data.datasets[0].data = reversedLogs.map(log => log.memory);
    this.memoryChart.update('none');


    if (this.latestLog) {
      this.diskChart.data.datasets[0].data = [this.latestLog.disk, 100 - this.latestLog.disk];
      this.diskChart.update('none');
    }


    this.networkChart.data.labels = labels;
    this.networkChart.data.datasets[0].data = reversedLogs.map(log => log.netSentRate / 1024);
    this.networkChart.data.datasets[1].data = reversedLogs.map(log => log.netRecvRate / 1024);
    this.networkChart.update('none');

if (this.latestLog) {
  const cpu = this.latestLog.cpu;
  const memory = this.latestLog.memory;

  if (cpu > 35 || memory > 85) {
    this.showAlert = true;
    if (cpu > 35 && memory > 85) {
      this.alertMessage = `High CPU (${cpu.toFixed(1)}%) and Memory (${memory.toFixed(1)}%) usage detected!`;
    } else if (cpu > 35) {
      this.alertMessage = `High CPU usage detected: ${cpu.toFixed(1)}%`;
    } else {
      this.alertMessage = `High Memory usage detected: ${memory.toFixed(1)}%`;
    }
  } else {
    this.showAlert = false;
  }
}

  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  

}