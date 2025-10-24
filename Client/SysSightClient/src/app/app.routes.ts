import { Routes } from '@angular/router';
import { DashBoard } from './dash-board/dash-board';
import { AgentDashboard } from './agent-dashboard/agent-dashboard';
import { Processes } from './agent-dashboard/processes/processes';

export const routes: Routes = [
    { path: '', redirectTo: '/dashboard', pathMatch: 'full' }, // default redirect
    { path: 'dashboard', component: DashBoard },
    { path: 'agent/:agentId', component: AgentDashboard},
        { path: 'process/:agentId', component: Processes}
];
