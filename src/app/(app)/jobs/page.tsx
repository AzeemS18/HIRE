
'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Job, Candidate } from '@/lib/types';
import { MoreHorizontal, PlusCircle, Calendar as CalendarIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid, Cell } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import ClientOnly from '@/components/ui/client-only';
import { useFirestore, useUser, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function JobsPage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();

  const jobsRef = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, 'jobs');
  }, [firestore, user]);

  const { data: jobs, isLoading: isLoadingJobs } = useCollection<Job>(jobsRef);
  
  const candidatesRef = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, 'users', user.uid, 'candidates');
  }, [firestore, user]);

  const { data: allCandidates, isLoading: isLoadingCandidates } = useCollection<Candidate>(candidatesRef);
  
  const [isCreateJobOpen, setCreateJobOpen] = useState(false);
  const [isEditJobOpen, setEditJobOpen] = useState(false);
  const [isAnalyticsOpen, setAnalyticsOpen] = useState(false);
  const [isScheduleJobOpen, setScheduleJobOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  
  const [newJobExperienceLevel, setNewJobExperienceLevel] = useState<Job['requiredExperienceLevel']>('Mid-level');
  const [editJobData, setEditJobData] = useState<Partial<Job> | null>(null);
  const [scheduleDate, setScheduleDate] = useState<Date | undefined>(new Date());
  const [scheduleTime, setScheduleTime] = useState('10:00');


  const jobsWithCandidateCounts = useMemo(() => {
    if (!jobs) return [];
    return jobs.map(job => ({
      ...job,
      candidateCount: (allCandidates || []).filter(c => c.jobTitle === job.title).length
    }));
  }, [jobs, allCandidates]);

  const analyticsData = useMemo(() => {
    if (!selectedJob) return [];
    const jobCandidates = (allCandidates || []).filter(c => c.jobTitle === selectedJob.title);
    return [
      { stage: 'Sourced', count: jobCandidates.filter(c => c.status === 'Sourced').length, fill: 'var(--color-violet)' },
      { stage: 'Screening', count: jobCandidates.filter(c => c.status === 'Screening').length, fill: 'var(--color-indigo)' },
      { stage: 'Interview', count: jobCandidates.filter(c => c.status === 'Interview').length, fill: 'var(--color-blue)' },
      { stage: 'Offer', count: jobCandidates.filter(c => c.status === 'Offer').length, fill: 'var(--color-green)' },
      { stage: 'Hired', count: jobCandidates.filter(c => c.status === 'Hired').length, fill: 'var(--color-yellow)' },
    ];
  }, [selectedJob, allCandidates]);


  const statusVariant = {
    Scheduled: 'secondary',
    'Open': 'default',
    'On Process': 'default',
    Completed: 'outline',
  } as const;

  const handleCreateJob = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!jobsRef) return;
    const formData = new FormData(e.currentTarget);
    const newJob: Omit<Job, 'id'> = {
      title: formData.get('title') as string,
      department: formData.get('department') as string,
      requiredSkills: (formData.get('skills') as string).split(',').map(s => s.trim()),
      requiredExperienceLevel: newJobExperienceLevel,
      status: 'Open',
    };

    if (newJob.status === 'Open' && allCandidates) {
        allCandidates.forEach(candidate => {
            if(candidate.jobTitle === newJob.title) {
                const candidateDocRef = doc(candidatesRef, candidate.id);
                updateDocumentNonBlocking(candidateDocRef, { status: 'Sourced' });
            }
        });
    }

    addDocumentNonBlocking(jobsRef, newJob);
    setCreateJobOpen(false);
    toast({
      title: 'Job Created',
      description: `${newJob.title} has been added.`,
    });
  };

  const handleOpenEditDialog = (job: Job) => {
    setSelectedJob(job);
    setEditJobData(job);
    setEditJobOpen(true);
    setOpenActionMenuId(null);
  };
  
  const handleOpenAnalyticsDialog = (job: Job) => {
    setSelectedJob(job);
    setAnalyticsOpen(true);
    setOpenActionMenuId(null);
  };

  const handleEditJob = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedJob || !jobsRef || !editJobData || !candidatesRef || !allCandidates) return;

    const docRef = doc(jobsRef, selectedJob.id);
    
    if (editJobData.status === 'Scheduled') {
      setEditJobOpen(false);
      setScheduleJobOpen(true);
      // The rest of the update logic will be handled by handleScheduleJob
      return;
    }

    if (editJobData.status === 'On Process') {
        allCandidates.forEach(candidate => {
            if (candidate.jobTitle === selectedJob.title) {
                const candidateDocRef = doc(candidatesRef, candidate.id);
                if (candidate.skillFit > 50 && candidate.experienceFit > 50) {
                    updateDocumentNonBlocking(candidateDocRef, { status: 'Interview' });
                } else if (candidate.skillFit < 50 && candidate.experienceFit < 50) {
                    updateDocumentNonBlocking(candidateDocRef, { status: 'Rejected' });
                }
            }
        });
    } else if (editJobData.status === 'Open') {
        allCandidates.forEach(candidate => {
            if (candidate.jobTitle === selectedJob.title) {
                const candidateDocRef = doc(candidatesRef, candidate.id);
                updateDocumentNonBlocking(candidateDocRef, { status: 'Sourced' });
            }
        });
    }

    updateDocumentNonBlocking(docRef, editJobData);
    setEditJobOpen(false);
    toast({
      title: 'Job Updated',
      description: `${selectedJob.title} has been updated.`,
    });
  };

  const handleScheduleJob = () => {
    if (!selectedJob || !jobsRef || !editJobData || !scheduleDate) return;

    const [hours, minutes] = scheduleTime.split(':');
    const scheduledDateTime = new Date(scheduleDate);
    scheduledDateTime.setHours(parseInt(hours, 10));
    scheduledDateTime.setMinutes(parseInt(minutes, 10));

    const updatedJobData = {
      ...editJobData,
      scheduledTime: scheduledDateTime,
    };
    
    const docRef = doc(jobsRef, selectedJob.id);
    updateDocumentNonBlocking(docRef, updatedJobData);
    setScheduleJobOpen(false);
    setEditJobData(null);
    setSelectedJob(null);
    toast({
      title: 'Job Scheduled',
      description: `${selectedJob.title} has been scheduled.`,
    });
  };

  const renderTable = () => {
    if (isLoadingJobs || isLoadingCandidates) {
      return (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      );
    }
    if (!jobsWithCandidateCounts || jobsWithCandidateCounts.length === 0) {
      return (
         <div className="text-center py-12">
          <h3 className="text-lg font-semibold">No jobs found</h3>
          <p className="text-muted-foreground">Create a new job to get started.</p>
        </div>
      )
    }

    return (
       <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Job Title</TableHead>
            <TableHead className="hidden md:table-cell">
              Department
            </TableHead>
            <TableHead>Candidates</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobsWithCandidateCounts.map((job) => (
            <TableRow key={job.id}>
              <TableCell>
                <div className="font-medium">{job.title}</div>
                {job.status === 'Scheduled' && job.scheduledTime && (
                  <div className="text-xs text-muted-foreground">
                    {format(new Date((job.scheduledTime as any).seconds * 1000), "PPP p")}
                  </div>
                )}
              </TableCell>
              <TableCell className="hidden md:table-cell">
                {job.department}
              </TableCell>
              <TableCell>
                <Badge variant="outline">{job.candidateCount} Applied</Badge>
              </TableCell>
              <TableCell>
                <Badge
                  variant={
                    statusVariant[job.status as keyof typeof statusVariant] ?? 'default'
                  }
                >
                  {job.status}
                </Badge>
              </TableCell>
              <TableCell>
                <DropdownMenu open={openActionMenuId === job.id} onOpenChange={(isOpen) => setOpenActionMenuId(isOpen ? job.id : null)}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      aria-haspopup="true"
                      size="icon"
                      variant="ghost"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">Toggle menu</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                       <Link href={`/candidates?q=${encodeURIComponent(job.title)}`}>
                        View Candidates
                       </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleOpenEditDialog(job)}>
                      Edit Job
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleOpenAnalyticsDialog(job)}>
                      View Analytics
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  return (
    <ClientOnly>
      <div className="flex flex-col gap-6">
        <div className="flex items-center">
          <h1 className="text-2xl font-semibold md:text-3xl">Job Openings</h1>
          <div className="ml-auto flex items-center gap-2">
            <Button size="sm" onClick={() => setCreateJobOpen(true)}>
              <PlusCircle className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:ml-2">Create Job</span>
            </Button>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>All Job Postings</CardTitle>
            <CardDescription>
              Manage your open roles and their candidate pipelines.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {renderTable()}
          </CardContent>
        </Card>
        {/* Create Job Dialog */}
        <Dialog open={isCreateJobOpen} onOpenChange={setCreateJobOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create New Job</DialogTitle>
              <DialogDescription>
                Enter the details for the new job opening.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateJob}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="title" className="text-right">
                    Job Title
                  </Label>
                  <Input id="title" name="title" className="col-span-3" required />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="department" className="text-right">
                    Department
                  </Label>
                  <Input
                    id="department"
                    name="department"
                    className="col-span-3"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="skills" className="text-right">
                    Required Skills
                  </Label>
                  <Textarea
                    id="skills"
                    name="skills"
                    className="col-span-3"
                    placeholder="Enter skills separated by commas"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="experience" className="text-right">
                    Experience
                  </Label>
                  <Select onValueChange={(value: Job['requiredExperienceLevel']) => setNewJobExperienceLevel(value)} defaultValue={newJobExperienceLevel}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select experience level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Entry-level">Entry-level</SelectItem>
                      <SelectItem value="Mid-level">Mid-level</SelectItem>
                      <SelectItem value="Senior">Senior</SelectItem>
                      <SelectItem value="Lead">Lead</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Save Job</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

         {/* Edit Job Dialog */}
        <Dialog open={isEditJobOpen} onOpenChange={setEditJobOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Edit Job: {selectedJob?.title}</DialogTitle>
               <DialogDescription>
                  Update the details for this job opening.
              </DialogDescription>
            </DialogHeader>
             <form onSubmit={handleEditJob}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-title" className="text-right">
                    Job Title
                  </Label>
                  <Input id="edit-title" name="title" className="col-span-3" required defaultValue={editJobData?.title} onChange={(e) => setEditJobData(p => ({ ...p, title: e.target.value }))} />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-department" className="text-right">
                    Department
                  </Label>
                  <Input
                    id="edit-department"
                    name="department"
                    className="col-span-3"
                    required
                    defaultValue={editJobData?.department}
                    onChange={(e) => setEditJobData(p => ({ ...p, department: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-skills" className="text-right">
                    Required Skills
                  </Label>
                  <Textarea
                    id="edit-skills"
                    name="skills"
                    className="col-span-3"
                    placeholder="Enter skills separated by commas"
                    required
                    defaultValue={editJobData?.requiredSkills?.join(', ')}
                    onChange={(e) => setEditJobData(p => ({...p, requiredSkills: e.target.value.split(',').map(s => s.trim())}))}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-experience" className="text-right">
                    Experience
                  </Label>
                  <Select onValueChange={(value: Job['requiredExperienceLevel']) => setEditJobData(p => ({...p, requiredExperienceLevel: value}))} value={editJobData?.requiredExperienceLevel}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select experience level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Entry-level">Entry-level</SelectItem>
                      <SelectItem value="Mid-level">Mid-level</SelectItem>
                      <SelectItem value="Senior">Senior</SelectItem>
                      <SelectItem value="Lead">Lead</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">
                    Status
                  </Label>
                  <Select onValueChange={(value: Job['status']) => setEditJobData(p => ({ ...p, status: value }))} value={editJobData?.status}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Scheduled">Scheduled</SelectItem>
                      <SelectItem value="Open">Open</SelectItem>
                      <SelectItem value="On Process">On Process</SelectItem>
                      <SelectItem value="Completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setEditJobOpen(false)}>Cancel</Button>
                <Button type="submit">Save Changes</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        
        {/* Schedule Job Dialog */}
        <Dialog open={isScheduleJobOpen} onOpenChange={setScheduleJobOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Schedule Job</DialogTitle>
              <DialogDescription>
                Select a date and time for the job: {selectedJob?.title}.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="schedule-date" className="text-right">Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-[240px] col-span-3 justify-start text-left font-normal",
                        !scheduleDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {scheduleDate ? format(scheduleDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={scheduleDate}
                      onSelect={setScheduleDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="schedule-time" className="text-right">Time</Label>
                <Input
                  id="schedule-time"
                  type="time"
                  className="col-span-3"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setScheduleJobOpen(false)}>Cancel</Button>
              <Button onClick={handleScheduleJob}>Schedule Job</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Analytics Dialog */}
        <Dialog open={isAnalyticsOpen} onOpenChange={setAnalyticsOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Analytics for: {selectedJob?.title}</DialogTitle>
              <DialogDescription>
                A high-level overview of the candidate pipeline for this role.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <ChartContainer config={{}} className="h-[250px] w-full">
                <BarChart data={analyticsData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="stage" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
                  <YAxis tickLine={false} axisLine={false} tickMargin={8} fontSize={12} allowDecimals={false}/>
                  <Tooltip cursor={false} content={<ChartTooltipContent />} />
                  <Legend />
                  <Bar dataKey="count" name="Candidates" radius={[4, 4, 0, 0]}>
                     {analyticsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAnalyticsOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ClientOnly>
  );
}
