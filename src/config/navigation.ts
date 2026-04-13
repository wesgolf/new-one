import { 
  LayoutDashboard, 
  Music, 
  Calendar, 
  BarChart3, 
  Users, 
  Mic2, 
  Link as LinkIcon,
} from 'lucide-react';

export const navigationRoutes = [
  { icon: LayoutDashboard, label: 'Command Center', path: '/' },
  { icon: Music, label: 'Release Tracker', path: '/releases' },
  { icon: Calendar, label: 'Content Engine', path: '/content' },
  { icon: BarChart3, label: 'Analytics', path: '/analytics' },
  { icon: Users, label: 'Opportunities', path: '/opportunities' },
  { icon: Mic2, label: 'Shows & Live', path: '/shows' },
  { icon: LinkIcon, label: 'Links Hub', path: '/links' },
];
