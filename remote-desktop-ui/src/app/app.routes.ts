import { Routes } from '@angular/router';
import { PcList } from './components/pc-list/pc-list';
import { PcCreate } from './components/pc-create/pc-create';
import { Dashboard } from './components/dashboard/dashboard';
import { RemoteSession } from './components/remote-session/remote-session';
import { NetworkDevices } from './components/network-devices/network-devices';

export const routes: Routes = [
  {
    path: 'dashboard',
    component: Dashboard,
  },
  {
    path: 'remote-pcs',
    component: PcList,
  },
  {
    path: 'remote-session/:pcId',
    component: RemoteSession,
  },
  {
    path: 'remote-pcs/add',
    component: PcCreate,
  },
  { path: 'network-devices', component: NetworkDevices },
  {
    path: 'manage-remote-pc',
    loadComponent: () =>
      import('./../../src/app/components/manage-remote-pc/manage-remote-pc').then(
        (m) => m.ManageRemotePcComponent,
      ),
  },
  {
    path: 'video-call/:roomId',
    loadComponent: () =>
      import('./components/video-call/video-call').then((m) => m.VideoCallComponent),
  },
  {
    path: 'join-browser-session',
    loadComponent: () =>
      import('./components/join-browser-session/join-browser-session').then(
        (m) => m.JoinBrowserSession,
      ),
  },
  {
    path: 'video-call/:roomId',
    loadComponent: () =>
      import('./components/video-call/video-call').then((m) => m.VideoCallComponent),
  },
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
];
