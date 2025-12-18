
'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { jobs as allJobs } from '@/lib/data';
import type { Candidate, Job } from '@/lib/types';
import { MoreHorizontal, PlusCircle, Bot, VenetianMask, CircleDashed, User, MessageSquare, Trash2, ArrowRight, ThumbsUp, PartyPopper, Download, Upload, Calendar as CalendarIcon, Mail } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { generateRoleBasedScreeningQuestions } from '@/flows/subflows/generate-role-based-screening-questions';
import { summarizeInterviewFeedback } from '@/flows/subflows/summarize-interview-feedback';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { parseResume, type ParseResumeOutput } from '@/flows/subflows/parse-resume-flow';
import ClientOnly from '@/components/ui/client-only';
import { useCollection, useUser, useFirestore, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc, serverTimestamp } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';


type CandidateStatus = Candidate['status'];

const statusColors: Record<CandidateStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  Interview: 'default',
  Screening: 'secondary',
  Offer: 'default',
  Hired: 'default',
  Rejected: 'destructive',
  Sourced: 'outline',
};

const experienceLevelMap: Record<Candidate['experienceLevel'], number> = {
  'Entry-level': 1,
  'Mid-level': 2,
  'Senior': 3,
  'Lead': 4,
};

const calculateFit = (candidates: Candidate[], jobs: Job[]): Candidate[] => {
  if (!candidates) return [];
  const jobMap = new Map(jobs.map(job => [job.title, job]));

  return candidates.map(candidate => {
    const job = jobMap.get(candidate.jobTitle);
    if (!job) {
      return { ...candidate, skillFit: 0, experienceFit: 0 };
    }

    const matchingSkills = candidate.skills.filter(skill => job.requiredSkills.includes(skill));
    const skillFit = Math.round((matchingSkills.length / job.requiredSkills.length) * 100);

    const candidateExp = experienceLevelMap[candidate.experienceLevel];
    const requiredExp = experienceLevelMap[job.requiredExperienceLevel];
    const experienceFit = Math.min(Math.round((candidateExp / requiredExp) * 100), 100);

    return { ...candidate, skillFit, experienceFit };
  });
};


function CandidateTable({ 
  candidates,
  onGenerateQuestions,
  onSummarizeFeedback,
  onUpdateStatus,
  onReject,
  onViewProfile,
  onScheduleInterview
 }: { 
  candidates: Candidate[];
  onGenerateQuestions: (candidate: Candidate) => void;
  onSummarizeFeedback: (candidate: Candidate) => void;
  onUpdateStatus: (candidate: Candidate, status: CandidateStatus) => void;
  onReject: (candidate: Candidate) => void;
  onViewProfile: (candidate: Candidate) => void;
  onScheduleInterview: (candidate: Candidate) => void;
}) {
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);

  const getActionsForStatus = (candidate: Candidate) => {
    switch (candidate.status) {
      case 'Sourced':
      case 'Screening':
        return (
          <Button variant="outline" className="justify-start" onClick={() => handleAction(() => onScheduleInterview(candidate))}>
            <ArrowRight className="mr-2 h-4 w-4" />
            Move to Interview
          </Button>
        );
      case 'Interview':
        return (
          <Button variant="outline" className="justify-start" onClick={() => handleAction(() => onUpdateStatus(candidate, 'Offer'))}>
            <ThumbsUp className="mr-2 h-4 w-4" />
            Make Offer
          </Button>
        );
      case 'Offer':
        return (
          <Button variant="outline" className="justify-start" onClick={() => handleAction(() => onUpdateStatus(candidate, 'Hired'))}>
            <PartyPopper className="mr-2 h-4 w-4" />
            Mark as Hired
          </Button>
        );
      default:
        return null;
    }
  };

  const handleAction = (action: () => void) => {
    action();
    setOpenActionMenuId(null);
  };


  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Candidate</TableHead>
          <TableHead className="hidden md:table-cell">Role</TableHead>
          <TableHead>Skill Fit</TableHead>
          <TableHead>Experience Fit</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {candidates.map((candidate) => (
          <TableRow key={candidate.id}>
            <TableCell>
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarFallback>
                    {candidate.name.split(' ').map(n => n[0]).slice(0,2).join('')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium">{candidate.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {candidate.email}
                  </div>
                </div>
              </div>
            </TableCell>
            <TableCell className="hidden md:table-cell">
              {candidate.jobTitle}
            </TableCell>
            <TableCell>{candidate.skillFit}%</TableCell>
            <TableCell>{candidate.experienceFit}%</TableCell>
            <TableCell>
              <Badge variant={statusColors[candidate.status]}>
                {candidate.status}
              </Badge>
            </TableCell>
            <TableCell>
               <Sheet open={openActionMenuId === candidate.id} onOpenChange={(isOpen) => setOpenActionMenuId(isOpen ? candidate.id : null)}>
                <SheetTrigger asChild>
                  <Button aria-haspopup="true" size="icon" variant="ghost">
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">Toggle menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Actions for {candidate.name}</SheetTitle>
                  </SheetHeader>
                  <div className="grid gap-4 py-4">
                    <Button variant="outline" onClick={() => handleAction(() => onViewProfile(candidate))} className="justify-start">
                      <User className="mr-2 h-4 w-4" />
                      View Profile
                    </Button>
                    <Button variant="outline" onClick={() => handleAction(() => onGenerateQuestions(candidate))} className="justify-start">
                      <Bot className="mr-2 h-4 w-4" />
                      Generate Screening Questions
                    </Button>
                    <Button variant="outline" onClick={() => handleAction(() => onSummarizeFeedback(candidate))} className="justify-start">
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Summarize Feedback
                    </Button>
                  </div>
                  <Separator />
                  <div className="grid gap-4 py-4">
                    {getActionsForStatus(candidate)}
                    {candidate.status !== 'Hired' && candidate.status !== 'Rejected' && (
                      <Button variant="destructive" onClick={() => handleAction(() => onReject(candidate))} className="justify-start">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Reject Candidate
                      </Button>
                    )}
                  </div>
                </SheetContent>
              </Sheet>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

const defaultNewCandidate: Partial<ParseResumeOutput> & { jobTitle: string } = {
  name: '',
  email: '',
  jobTitle: '',
  skills: [],
  experienceLevel: 'Entry-level',
};


export default function CandidatesPage() {
  const searchParams = useSearchParams();
  const firestore = useFirestore();
  const { user } = useUser();

  const candidatesRef = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, 'users', user.uid, 'candidates');
  }, [firestore, user]);

  const { data: candidates, isLoading: isLoadingCandidates } = useCollection<Candidate>(candidatesRef);
  
  const [jobs] = useState<Job[]>(allJobs);
  const [isAddCandidateOpen, setAddCandidateOpen] = useState(false);
  const [addCandidateStep, setAddCandidateStep] = useState(1);
  const [activeCandidate, setActiveCandidate] = useState<Candidate | null>(null);
  const [isQuestionsDialogOpen, setQuestionsDialogOpen] = useState(false);
  const [isSummaryDialogOpen, setSummaryDialogOpen] = useState(false);
  const [isRejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [isProfileSheetOpen, setProfileSheetOpen] = useState(false);
  const [isScheduleInterviewOpen, setScheduleInterviewOpen] = useState(false);
  const [interviewDate, setInterviewDate] = useState<Date | undefined>(new Date());
  const [interviewTime, setInterviewTime] = useState('10:00');

  const [generatedQuestions, setGeneratedQuestions] = useState<string[]>([]);
  const [feedbackSummary, setFeedbackSummary] = useState('');
  const [feedbackToSummarize, setFeedbackToSummarize] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isParsingResume, setIsParsingResume] = useState(false);
  const { toast } = useToast();

  const [newCandidateData, setNewCandidateData] = useState(defaultNewCandidate);

  const availableSkills = useMemo(() => {
    const job = jobs.find(j => j.title === newCandidateData.jobTitle);
    return job ? job.requiredSkills : [];
  }, [newCandidateData.jobTitle, jobs]);

  const resetAddCandidateForm = useCallback(() => {
    setNewCandidateData(defaultNewCandidate);
  }, []);

  useEffect(() => {
    if (isAddCandidateOpen) {
      resetAddCandidateForm();
      setAddCandidateStep(1);
    }
  }, [isAddCandidateOpen, resetAddCandidateForm]);

  useEffect(() => {
    // When job title changes, reset skills
    setNewCandidateData(prev => ({...prev, skills: []}));
  }, [newCandidateData.jobTitle]);


  const searchQuery = searchParams.get('q') || '';

  const filteredCandidates = useMemo(() => {
    const calculatedCandidates = calculateFit(candidates || [], jobs);
    if (!searchQuery) {
      return calculatedCandidates;
    }
    return calculatedCandidates.filter((candidate) =>
      candidate.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      candidate.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      candidate.jobTitle.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [candidates, jobs, searchQuery]);


  const allFilteredCandidates = filteredCandidates;
  const hiredCandidates = filteredCandidates.filter((c) => c.status === 'Hired');
  const offerCandidates = filteredCandidates.filter((c) => c.status === 'Offer');
  const interviewCandidates = filteredCandidates.filter(
    (c) => c.status === 'Interview'
  );
  const screeningCandidates = filteredCandidates.filter(
    (c) => c.status === 'Sourced' || c.status === 'Screening'
  );
  const rejectedCandidates = filteredCandidates.filter((c) => c.status === 'Rejected');

  const handleAddCandidate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!candidatesRef) return;

    if (!newCandidateData.jobTitle || !newCandidateData.name || !newCandidateData.email) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description: 'Please fill out all required fields.',
      });
      return;
    }

    const newCandidate: Omit<Candidate, 'id'> = {
      name: newCandidateData.name,
      email: newCandidateData.email,
      jobTitle: newCandidateData.jobTitle,
      avatarUrl: '',
      skills: newCandidateData.skills || [],
      experienceLevel: newCandidateData.experienceLevel || 'Entry-level',
      status: 'Sourced',
      appliedDate: serverTimestamp() as any, // Will be converted by Firestore
      // Fits are calculated on the fly
      skillFit: 0,
      experienceFit: 0,
    };
    addDocumentNonBlocking(candidatesRef, newCandidate);
    setAddCandidateOpen(false);
     toast({
      title: "Candidate Added",
      description: `${newCandidate.name} has been added to your pipeline.`,
    });
  };
  
  const handleOpenGenerateQuestions = (candidate: Candidate) => {
    setActiveCandidate(candidate);
    setQuestionsDialogOpen(true);
    handleGenerateQuestions(candidate);
  };

  const handleGenerateQuestions = async (candidate: Candidate) => {
    setIsLoading(true);
    setGeneratedQuestions([]);
    try {
      const job = jobs.find(j => j.title === candidate.jobTitle);
      const response = await generateRoleBasedScreeningQuestions({
        jobRole: candidate.jobTitle,
        jobDescription: job ? `Required experience: ${job.requiredExperienceLevel}. Required skills: ${job.requiredSkills.join(', ')}` : 'A challenging and rewarding role for a skilled professional.',
        candidateSkills: candidate.skills.join(', '),
      });
      setGeneratedQuestions(response.screeningQuestions);
    } catch (error) {
      console.error('Error generating questions:', error);
      toast({
        variant: "destructive",
        title: "Generation Error",
        description: "Could not generate screening questions. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenSummarizeFeedback = (candidate: Candidate) => {
    setActiveCandidate(candidate);
    setFeedbackSummary('');
    setFeedbackToSummarize('');
    setSummaryDialogOpen(true);
  };

  const handleSummarizeFeedback = async () => {
    if (!feedbackToSummarize.trim()) {
      toast({
        variant: "destructive",
        title: "Input Required",
        description: "Please enter some feedback to summarize.",
      });
      return;
    }
    setIsLoading(true);
    setFeedbackSummary('');
    try {
      const response = await summarizeInterviewFeedback({
        feedback: feedbackToSummarize,
      });
      setFeedbackSummary(response.summary);
    } catch (error) {
      console.error('Error summarizing feedback:', error);
      toast({
        variant: "destructive",
        title: "Summarization Error",
        description: "Could not summarize feedback. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleOpenRejectDialog = (candidate: Candidate) => {
    setActiveCandidate(candidate);
    setRejectDialogOpen(true);
  };
  
  const handleRejectCandidate = () => {
    if (!activeCandidate || !candidatesRef) return;
    const docRef = doc(candidatesRef, activeCandidate.id);
    updateDocumentNonBlocking(docRef, { status: 'Rejected' });
    setRejectDialogOpen(false);
    toast({
      title: "Candidate Rejected",
      description: `${activeCandidate.name} has been moved to the rejected list.`,
    });
    setActiveCandidate(null);
  };

  const handleUpdateStatus = (candidate: Candidate, newStatus: CandidateStatus) => {
    if (!candidatesRef) return;
    const docRef = doc(candidatesRef, candidate.id);
    updateDocumentNonBlocking(docRef, { status: newStatus });
    toast({
      title: 'Candidate Updated',
      description: `${candidate.name} has been moved to ${newStatus}.`,
    });
  }

  const handleScheduleInterview = () => {
    if (!activeCandidate) return;
    handleUpdateStatus(activeCandidate, 'Interview');
    setScheduleInterviewOpen(false);
    toast({
      title: 'Interview Scheduled!',
      description: `An interview has been scheduled with ${activeCandidate.name}.`,
    });
  };

  const handleOpenScheduleInterview = (candidate: Candidate) => {
    setActiveCandidate(candidate);
    setScheduleInterviewOpen(true);
  };

  const handleExport = () => {
    const csvHeader = "ID,Name,Email,Job Title,Status,Skill Fit,Experience Fit,Applied Date\n";
    const csvRows = allFilteredCandidates.map(c => 
      [c.id, c.name, c.email, c.jobTitle, c.status, c.skillFit, c.experienceFit, c.appliedDate].join(',')
    ).join('\n');
    
    const csvContent = csvHeader + csvRows;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.href) {
      URL.revokeObjectURL(link.href);
    }
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', 'candidates.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
     toast({
      title: "Exporting Candidates",
      description: "Your file is downloading.",
    });
  }
  
  const handleViewProfile = (candidate: Candidate) => {
    setActiveCandidate(candidate);
    setProfileSheetOpen(true);
  };
  
  const handleResumeUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsParsingResume(true);
    toast({
      title: 'Parsing Resume...',
      description: 'The system is analyzing the document.',
    });

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const resumeDataUri = reader.result as string;
        const parsedData = await parseResume({ resumeDataUri });
        
        setNewCandidateData(prev => ({
          ...prev,
          name: parsedData.name,
          email: parsedData.email,
          // Only select skills that are relevant for the currently selected job
          skills: parsedData.skills.filter(s => availableSkills.includes(s)),
          experienceLevel: parsedData.experienceLevel,
        }));

        toast({
          title: 'Resume Parsed!',
          description: 'Candidate details have been auto-filled.',
        });
      };
      reader.onerror = (error) => {
        throw new Error('Error reading file.');
      }
    } catch (error) {
      console.error('Error parsing resume:', error);
      toast({
        variant: "destructive",
        title: "Parsing Error",
        description: "Could not parse the resume. Please enter details manually.",
      });
    } finally {
      setIsParsingResume(false);
       // Reset file input
      event.target.value = '';
    }
  };

  const handleGoToStep2 = () => {
    if (!newCandidateData.jobTitle) {
      toast({
        variant: 'destructive',
        title: 'Job Role Required',
        description: 'Please select a job role to continue.',
      });
      return;
    }
    setAddCandidateStep(2);
  }
  
  const renderTable = (candidates: Candidate[]) => {
    if (isLoadingCandidates) {
      return (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      );
    }
    if (!candidates || candidates.length === 0) {
      return (
        <div className="text-center py-12">
          <h3 className="text-lg font-semibold">No candidates found</h3>
          <p className="text-muted-foreground">Add a new candidate to get started.</p>
        </div>
      )
    }
    return <CandidateTable candidates={candidates} {...tableProps} />;
  }

  const tableProps = {
    onGenerateQuestions: handleOpenGenerateQuestions,
    onSummarizeFeedback: handleOpenSummarizeFeedback,
    onUpdateStatus: handleUpdateStatus,
    onReject: handleOpenRejectDialog,
    onViewProfile: handleViewProfile,
    onScheduleInterview: handleOpenScheduleInterview,
  };


  return (
    <ClientOnly>
      <div className="flex flex-col gap-6">
        <div className="flex items-center">
          <h1 className="text-2xl font-semibold md:text-3xl">Candidates</h1>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExport} disabled={!allFilteredCandidates || allFilteredCandidates.length === 0}>
              <Download className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:ml-2">Export</span>
            </Button>
            <Button size="sm" onClick={() => setAddCandidateOpen(true)}>
              <PlusCircle className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:ml-2">
                Add Candidate
              </span>
            </Button>
          </div>
        </div>
        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="screening">Screening</TabsTrigger>
            <TabsTrigger value="interview">Interview</TabsTrigger>
            <TabsTrigger value="offer">Offer</TabsTrigger>
            <TabsTrigger value="hired">Hired</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
          </TabsList>
          <TabsContent value="all">
            <Card>
              <CardHeader>
                <CardTitle>All Candidates</CardTitle>
                <CardDescription>
                  Manage your candidates and their progress.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {renderTable(allFilteredCandidates)}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="screening">
            <Card>
              <CardHeader>
                <CardTitle>Screening</CardTitle>
                <CardDescription>
                  Candidates in the screening or sourced stage.
                </CardDescription>
              </CardHeader>
              <CardContent>
                 {renderTable(screeningCandidates)}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="interview">
            <Card>
              <CardHeader>
                <CardTitle>Interview</CardTitle>
                <CardDescription>
                  Candidates scheduled for an interview.
                </CardDescription>
              </CardHeader>
              <CardContent>
                 {renderTable(interviewCandidates)}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="offer">
            <Card>
              <CardHeader>
                <CardTitle>Offer</CardTitle>
                <CardDescription>
                  Candidates who have received an offer.
                </CardDescription>
              </CardHeader>
              <CardContent>
                 {renderTable(offerCandidates)}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="hired">
            <Card>
              <CardHeader>
                <CardTitle>Hired</CardTitle>
                <CardDescription>
                  Candidates who have been hired.
                </CardDescription>
              </CardHeader>
              <CardContent>
                 {renderTable(hiredCandidates)}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="rejected">
            <Card>
              <CardHeader>
                <CardTitle>Rejected</CardTitle>
                <CardDescription>
                  Candidates who were not selected.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {renderTable(rejectedCandidates)}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Add Candidate Dialog */}
        <Dialog open={isAddCandidateOpen} onOpenChange={setAddCandidateOpen}>
          <DialogContent className="sm:max-w-lg">
             <DialogHeader>
              <DialogTitle>Add New Candidate</DialogTitle>
               {addCandidateStep === 1 ? (
                  <DialogDescription>
                    First, select the job role the candidate is applying for.
                  </DialogDescription>
                ) : (
                  <DialogDescription>
                    Upload a resume to auto-fill details, or enter them manually. Click save when you&apos;re done.
                  </DialogDescription>
               )}
            </DialogHeader>

            {addCandidateStep === 1 && (
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="jobTitle" className="text-right">
                      Job Role
                    </Label>
                    <Select value={newCandidateData.jobTitle} onValueChange={(value) => setNewCandidateData(p => ({...p, jobTitle: value}))} required>
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select a job role" />
                      </SelectTrigger>
                      <SelectContent>
                        {jobs.filter(j => j.status === 'Open').map(job => (
                          <SelectItem key={job.id} value={job.title}>{job.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
              </div>
            )}

            {addCandidateStep === 2 && (
              <form onSubmit={handleAddCandidate}>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="resume-upload" className="text-right">
                        Resume
                      </Label>
                      <div className='col-span-3'>
                        <Input id="resume-upload" type="file" onChange={handleResumeUpload} disabled={isParsingResume} className="hidden" />
                        <Button type="button" variant="outline" onClick={() => document.getElementById('resume-upload')?.click()} disabled={isParsingResume}>
                          {isParsingResume ? 
                            <><CircleDashed className="mr-2 h-4 w-4 animate-spin" /> Parsing...</> :
                            <><Upload className="mr-2 h-4 w-4" /> Upload & Parse</>
                          }
                        </Button>
                      </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">
                      Name
                    </Label>
                    <Input id="name" name="name" className="col-span-3" required value={newCandidateData.name} onChange={(e) => setNewCandidateData(p => ({...p, name: e.target.value}))}/>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="email" className="text-right">
                      Email
                    </Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      className="col-span-3"
                      required
                      value={newCandidateData.email} 
                      onChange={(e) => setNewCandidateData(p => ({...p, email: e.target.value}))}
                    />
                  </div>
                  
                   <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">
                      Experience
                    </Label>
                    <Select value={newCandidateData.experienceLevel} onValueChange={(value: Candidate['experienceLevel']) => setNewCandidateData(p => ({...p, experienceLevel: value}))} required>
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select experience" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Entry-level">Entry-level</SelectItem>
                        <SelectItem value="Mid-level">Mid-level</SelectItem>
                        <SelectItem value="Senior">Senior</SelectItem>
                        <SelectItem value="Lead">Lead</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {availableSkills.length > 0 && (
                    <div className="grid grid-cols-4 items-start gap-4">
                      <Label className="text-right pt-2">Skills</Label>
                      <div className="col-span-3 grid grid-cols-2 gap-2">
                        {availableSkills.map(skill => (
                          <div key={skill} className="flex items-center gap-2">
                            <Checkbox 
                              id={`skill-${skill}`}
                              checked={newCandidateData.skills?.includes(skill)} 
                              onCheckedChange={(checked) => {
                                 setNewCandidateData(prev => {
                                  const newSkills = checked 
                                    ? [...(prev.skills || []), skill] 
                                    : (prev.skills || []).filter(s => s !== skill);
                                  return {...prev, skills: newSkills };
                                })
                              }}
                            />
                            <Label htmlFor={`skill-${skill}`} className="font-normal">{skill}</Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                 <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setAddCandidateStep(1)}>Back</Button>
                  <Button type="submit" disabled={isParsingResume}>Save Candidate</Button>
                </DialogFooter>
              </form>
            )}
            {addCandidateStep === 1 && (
              <DialogFooter>
                <Button type="button" onClick={handleGoToStep2}>Next</Button>
              </DialogFooter>
            )}
          </DialogContent>
        </Dialog>
        
        {/* Generate Questions Dialog */}
        <Dialog open={isQuestionsDialogOpen} onOpenChange={setQuestionsDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Bot /> Screening Questions
              </DialogTitle>
              <DialogDescription>
                For {activeCandidate?.name} - {activeCandidate?.jobTitle}
              </DialogDescription>
            </DialogHeader>
            <div className="prose prose-sm max-w-none text-foreground dark:prose-invert">
              {isLoading ? (
                <div className="flex items-center justify-center p-8">
                  <CircleDashed className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <ol className="list-decimal pl-5">
                  {generatedQuestions.map((q, i) => (
                    <li key={i} className="mb-2">{q}</li>
                  ))}
                </ol>
              )}
            </div>
            <DialogFooter>
              <Button variant="secondary" onClick={() => setQuestionsDialogOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Summarize Feedback Dialog */}
        <Dialog open={isSummaryDialogOpen} onOpenChange={setSummaryDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <VenetianMask /> Feedback Summary
              </DialogTitle>
              <DialogDescription>
                For {activeCandidate?.name}. Paste the raw interview feedback below.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <Textarea 
                placeholder="Paste interview feedback here..." 
                className="min-h-[150px]"
                value={feedbackToSummarize}
                onChange={(e) => setFeedbackToSummarize(e.target.value)}
              />
              {feedbackSummary && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{feedbackSummary}</p>
                  </CardContent>
                </Card>
              )}
            </div>
            <DialogFooter>
              <Button variant="secondary" onClick={() => setSummaryDialogOpen(false)}>Close</Button>
              <Button onClick={handleSummarizeFeedback} disabled={isLoading}>
                {isLoading ? <CircleDashed className="animate-spin" /> : 'Summarize'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reject Candidate Alert Dialog */}
        <AlertDialog open={isRejectDialogOpen} onOpenChange={setRejectDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will move {activeCandidate?.name} to the 'Rejected' list. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleRejectCandidate} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Yes, Reject Candidate
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

         {/* Schedule Interview Dialog */}
        <Dialog open={isScheduleInterviewOpen} onOpenChange={setScheduleInterviewOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Schedule Interview</DialogTitle>
              <DialogDescription>
                Select a date and time for the interview with {activeCandidate?.name}.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="interview-date" className="text-right">Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-[240px] col-span-3 justify-start text-left font-normal",
                        !interviewDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {interviewDate ? format(interviewDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={interviewDate}
                      onSelect={setInterviewDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="interview-time" className="text-right">Time</Label>
                <Input
                  id="interview-time"
                  type="time"
                  className="col-span-3"
                  value={interviewTime}
                  onChange={(e) => setInterviewTime(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter className="sm:justify-between">
               <Button variant="outline" onClick={() => toast({ title: 'Email Sent!', description: `An invitation has been sent to ${activeCandidate?.email}` })}>
                  <Mail className="mr-2 h-4 w-4" />
                  Send Mail to Candidate
              </Button>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setScheduleInterviewOpen(false)}>Cancel</Button>
                <Button onClick={handleScheduleInterview}>Schedule & Move</Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

         {/* View Profile Sheet */}
         <Sheet open={isProfileSheetOpen} onOpenChange={setProfileSheetOpen}>
          <SheetContent className="sm:max-w-lg overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Candidate Profile</SheetTitle>
            </SheetHeader>
            {activeCandidate && (
              <div className="py-6">
                <div className="flex items-center gap-4 mb-6">
                  <Avatar className="h-16 w-16">
                    <AvatarFallback className="text-2xl">
                      {activeCandidate.name.split(' ').map(n => n[0]).slice(0,2).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="text-xl font-bold">{activeCandidate.name}</h2>
                    <p className="text-muted-foreground">{activeCandidate.email}</p>
                  </div>
                </div>

                <div className="grid gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Application Details</CardTitle>
                    </CardHeader>
                    <CardContent className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label className="text-sm">Applying for</Label>
                        <p>{activeCandidate.jobTitle}</p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-sm">Status</Label>
                        <div>
                          <Badge variant={statusColors[activeCandidate.status]}>{activeCandidate.status}</Badge>
                        </div>
                      </div>
                       <div className="space-y-1">
                        <Label className="text-sm">Applied On</Label>
                        <p>{activeCandidate.appliedDate ? new Date((activeCandidate.appliedDate as any).seconds * 1000).toLocaleDateString() : 'N/A'}</p>
                      </div>
                       <div className="space-y-1">
                        <Label className="text-sm">Experience Level</Label>
                        <p>{activeCandidate.experienceLevel}</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Fit Score</CardTitle>
                    </CardHeader>
                    <CardContent className="grid sm:grid-cols-2 gap-4">
                       <div className="space-y-1">
                        <Label className="text-sm">Skill Fit</Label>
                        <p className="text-2xl font-bold">{activeCandidate.skillFit}%</p>
                      </div>
                       <div className="space-y-1">
                        <Label className="text-sm">Experience Fit</Label>                      <p className="text-2xl font-bold">{activeCandidate.experienceFit}%</p>
                      </div>
                    </CardContent>
                  </Card>

                   <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Skills</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-2">
                      {activeCandidate.skills.map(skill => (
                        <Badge key={skill} variant="secondary">{skill}</Badge>
                      ))}
                    </CardContent>
                  </Card>
                  
                  <Button variant="outline">
                    <Download className="mr-2 h-4 w-4" /> Download Resume
                  </Button>

                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>

      </div>
    </ClientOnly>
  );
}


    
    