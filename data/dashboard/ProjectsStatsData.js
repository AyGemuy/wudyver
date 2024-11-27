import {
  Briefcase,
  ListTask,
  People,
  Bullseye,
  Hourglass,
  ExclamationCircle,
  CheckCircle,
  Map,
  Person
} from 'react-bootstrap-icons';

export const ProjectsStats = [
  {
    id: 1,
    title: "Projects",
    value: 18,
    icon: <Briefcase size={24} className="text-primary" />,
    statInfo: '<span className="text-dark me-2">2</span> Completed',
  },
  {
    id: 2,
    title: "Active Task",
    value: 132,
    icon: <ListTask size={24} className="text-success" />,
    statInfo: '<span className="text-dark me-2">28</span> Completed',
  },
  {
    id: 3,
    title: "Teams",
    value: 12,
    icon: <People size={24} className="text-warning" />,
    statInfo: '<span className="text-dark me-2">1</span> Completed',
  },
  {
    id: 4,
    title: "Productivity",
    value: '76%',
    icon: <Bullseye size={24} className="text-danger" />,
    statInfo: '<span className="text-dark me-2">5%</span> Completed',
  },
  {
    id: 5,
    title: "Pending Tasks",
    value: 45,
    icon: <Hourglass size={24} className="text-secondary" />,
    statInfo: '<span className="text-dark me-2">12</span> Pending',
  },
  {
    id: 6,
    title: "Overdue Projects",
    value: 3,
    icon: <ExclamationCircle size={24} className="text-danger" />,
    statInfo: '<span className="text-dark me-2">1</span> Overdue',
  },
  {
    id: 7,
    title: "On Track Projects",
    value: 10,
    icon: <CheckCircle size={24} className="text-success" />,
    statInfo: '<span className="text-dark me-2">8</span> On Track',
  },
  {
    id: 8,
    title: "Total Routes",
    value: 25,
    icon: <Map size={24} className="text-info" />,
    statInfo: '<span className="text-dark me-2">5</span> New Routes',
  },
  {
    id: 9,
    title: "Visitors",
    value: 1245,
    icon: <Person size={24} className="text-muted" />,
    statInfo: '<span className="text-dark me-2">300</span> New Visitors',
  }
];

export default ProjectsStats;
