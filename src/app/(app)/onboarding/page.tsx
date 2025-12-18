
'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { newHires, jobs } from "@/lib/data";
import { GraduationCap, Bot, CircleDashed } from "lucide-react";
import { recommendPersonalizedLearning } from '@/flows/subflows/recommend-personalized-learning';
import { useToast } from "@/hooks/use-toast";
import type { NewHire } from '@/lib/types';
import ClientOnly from '@/components/ui/client-only';

export default function OnboardingPage() {
  const [activeHire, setActiveHire] = useState<NewHire | null>(null);
  const [isLearningDialogOpen, setLearningDialogOpen] = useState(false);
  const [learningRecs, setLearningRecs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const statusVariant = {
    "On Track": "default",
    "At Risk": "destructive",
    Delayed: "outline",
  } as const;
  
  const handleOpenLearningDialog = async (hire: NewHire) => {
    setActiveHire(hire);
    setLearningDialogOpen(true);
    setIsLoading(true);
    setLearningRecs([]);

    try {
      const job = jobs.find(j => j.title === hire.jobTitle);
      // For demonstration, we'll define some skill gaps. In a real app, this would be determined through assessment.
      const skillGaps = ["Next.js", "GraphQL"];
      
      const response = await recommendPersonalizedLearning({
        jobRole: hire.jobTitle,
        skillGaps: skillGaps,
      });
      setLearningRecs(response.learningRecommendations);
    } catch (error) {
       console.error("Error recommending learning:", error);
       toast({
        variant: "destructive",
        title: "Recommendation Error",
        description: "Could not generate learning recommendations. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <ClientOnly>
      <div className="flex flex-col gap-6">
        <div className="flex items-center">
          <h1 className="text-2xl font-semibold md:text-3xl">New Hire Onboarding</h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Onboarding Progress</CardTitle>
            <CardDescription>
              Track the onboarding journey for your new team members.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {newHires.map((hire) => (
                <AccordionItem value={hire.id} key={hire.id}>
                  <AccordionTrigger>
                    <div className="flex w-full items-center gap-4 text-left">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>
                          {hire.name.split(' ').map(n => n[0]).slice(0,2).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 grid gap-1">
                        <p className="font-medium">{hire.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {hire.jobTitle}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                          <Badge
                          variant={
                              statusVariant[
                              hire.onboardingStatus as keyof typeof statusVariant
                              ]
                          }
                          >
                          {hire.onboardingStatus}
                          </Badge>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="pl-14 pr-4">
                      <h4 className="font-semibold mb-2">Onboarding Checklist</h4>
                      <ul className="space-y-2 mb-4">
                          {hire.tasks.map(task => (
                              <li key={task.id} className="flex items-center gap-3">
                                  <Checkbox id={`task-${task.id}`} checked={task.status === "Completed"} />
                                  <label htmlFor={`task-${task.id}`} className={`flex-1 text-sm ${task.status === 'Completed' ? 'line-through text-muted-foreground' : ''}`}>{task.name}</label>
                              </li>
                          ))}
                      </ul>
                      <Button onClick={() => handleOpenLearningDialog(hire)}>
                          <GraduationCap className="mr-2 h-4 w-4" />
                          Recommend Personalized Learning
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>

        {/* Learning Recommendations Dialog */}
        <Dialog open={isLearningDialogOpen} onOpenChange={setLearningDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Bot /> Learning Plan
              </DialogTitle>
              <DialogDescription>
                For {activeHire?.name} - {activeHire?.jobTitle}
              </DialogDescription>
            </DialogHeader>
            <div className="prose prose-sm max-w-none text-foreground dark:prose-invert">
              {isLoading ? (
                <div className="flex items-center justify-center p-8">
                  <CircleDashed className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <>
                  <p>Based on the role requirements and identified skill gaps, here are some recommended learning resources:</p>
                  <ul>
                    {learningRecs.map((rec, i) => (
                      <li key={i}>{rec}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
            <DialogFooter>
              <Button variant="secondary" onClick={() => setLearningDialogOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ClientOnly>
  );
}

    

    