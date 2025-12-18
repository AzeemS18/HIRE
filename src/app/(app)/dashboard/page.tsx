
"use client";

import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import {
  ChartContainer,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { candidates, jobs, hiringFunnelData, recentActivity } from "@/lib/data";
import { Briefcase, UserCheck, Users, FileText } from "lucide-react";
import type { Candidate } from "@/lib/types";
import ClientOnly from "@/components/ui/client-only";

export default function Dashboard() {
  const topCandidates = candidates
    .sort((a, b) => b.skillFit + b.experienceFit - (a.skillFit + a.experienceFit))
    .slice(0, 5);

  const openPositionsCount = jobs.filter(job => job.status === 'Open').length;
  const candidatesToReviewCount = candidates.filter(c => c.status === 'Sourced' || c.status === 'Screening').length;
  const newHiresCount = candidates.filter(c => c.status === 'Hired').length;
  const upcomingInterviewsCount = candidates.filter(c => c.status === 'Interview').length;


  return (
    <ClientOnly>
      <div className="flex flex-col gap-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Link href="/jobs">
            <Card className="hover:bg-muted/50 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Open Positions
                </CardTitle>
                <Briefcase className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{openPositionsCount}</div>
                <p className="text-xs text-muted-foreground">
                  +2 from last month
                </p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/candidates?status=screening">
            <Card className="hover:bg-muted/50 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Candidates to Review
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{candidatesToReviewCount}</div>
                <p className="text-xs text-muted-foreground">
                  +15 since yesterday
                </p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/candidates?status=interview">
            <Card className="hover:bg-muted/50 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Upcoming Interviews</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{upcomingInterviewsCount}</div>
                <p className="text-xs text-muted-foreground">
                  +5 scheduled this week
                </p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/onboarding">
            <Card className="hover:bg-muted/50 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">New Hires</CardTitle>
                <UserCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{newHiresCount}</div>
                <p className="text-xs text-muted-foreground">+3 this quarter</p>
              </CardContent>
            </Card>
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Hiring Funnel</CardTitle>
              <CardDescription>
                Overview of candidates at each stage.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{}} className="h-[250px] w-full">
                <BarChart data={hiringFunnelData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="stage" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
                  <YAxis tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
                  <Tooltip cursor={false} content={<ChartTooltipContent />} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Candidates">
                    {hiringFunnelData.map((entry) => (
                      <Cell key={`cell-${entry.stage}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Updates from your hiring pipelines.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-4">
                    <div className="text-sm">
                      <p>
                        <span className="font-medium">{activity.candidateName}</span>
                        {" "}{activity.activity}
                      </p>
                      <p className="text-xs text-muted-foreground">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Top Candidates</CardTitle>
            <CardDescription>
              Highest-ranking candidates across all open roles.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidate</TableHead>
                  <TableHead className="hidden md:table-cell">Role</TableHead>
                  <TableHead>Skill Fit</TableHead>
                  <TableHead>Experience Fit</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topCandidates.map((candidate) => (
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
                          <div className="text-sm text-muted-foreground md:hidden">
                            {candidate.jobTitle}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{candidate.jobTitle}</TableCell>
                    <TableCell>{candidate.skillFit}%</TableCell>
                    <TableCell>{candidate.experienceFit}%</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{candidate.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </ClientOnly>
  );
}
