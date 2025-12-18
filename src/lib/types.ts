import { Timestamp } from 'firebase/firestore';

export type Candidate = {
  id: string;
  name: string;
  avatarUrl: string;
  email: string;
  jobTitle: string;
  skills: string[];
  experienceLevel: 'Entry-level' | 'Mid-level' | 'Senior' | 'Lead';
  skillFit: number; 
  experienceFit: number; 
  status: "Sourced" | "Screening" | "Interview" | "Offer" | "Hired" | "Rejected";
  appliedDate: Timestamp | string;
};

export type Job = {
  id: string;
  title: string;
  department: string;
  status: "Scheduled" | "Open" | "On Process" | "Completed";
  requiredSkills: string[];
  requiredExperienceLevel: 'Entry-level' | 'Mid-level' | 'Senior' | 'Lead';
  scheduledTime?: Timestamp | string;
};

export type OnboardingTask = {
  id: string;
  name: string;
  status: "Completed" | "In Progress" | "Not Started";
};

export type NewHire = {
  id: string;
  name: string;
  avatarUrl: string;
  jobTitle: string;
  hireDate: string;
  onboardingStatus: "On Track" | "At Risk" | "Delayed";
  tasks: OnboardingTask[];
};

    