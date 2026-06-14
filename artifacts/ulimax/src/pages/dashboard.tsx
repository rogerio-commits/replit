import { useGetDashboardSummary, useGetRecentActivity } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Briefcase, CheckSquare, Clock, Users, Activity } from "lucide-react";
import { format } from "date-fns";

export default function Dashboard() {
  const { data: summary, isLoading: isSummaryLoading } = useGetDashboardSummary();
  const { data: activity, isLoading: isActivityLoading } = useGetRecentActivity();

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of your projects and team performance.</p>
      </div>

      {isSummaryLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      ) : summary ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalProjects}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {summary.activeProjects} active right now
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
              <CheckSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalTasks}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {summary.doneTasks} completed
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-destructive">Overdue Tasks</CardTitle>
              <Clock className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{summary.overdueTasks}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Require immediate attention
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Team Members</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalMembers}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Across all projects
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Latest updates across all projects and tasks.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isActivityLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : activity && activity.length > 0 ? (
              <div className="space-y-6">
                {activity.map((item) => (
                  <div key={`${item.type}-${item.id}`} className="flex items-start gap-4">
                    <div className="mt-0.5 bg-muted p-2 rounded-full">
                      <Activity className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {item.type === 'project' ? 'Project' : 'Task'}: {item.title}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {item.projectName && <span className="font-medium text-foreground">{item.projectName}</span>}
                        {item.projectName && ' — '}
                        Status changed to {item.status.replace('_', ' ')}
                      </p>
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(item.createdAt), 'MMM d, h:mm a')}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                No recent activity.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Status Breakdown</CardTitle>
            <CardDescription>
              Current state of active tasks.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isSummaryLoading ? (
               <Skeleton className="h-[200px] w-full" />
            ) : summary ? (
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-muted-foreground">To Do</span>
                    <span className="font-medium">{summary.tasksByStatus.todo}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-slate-300" style={{ width: `${(summary.tasksByStatus.todo / summary.totalTasks) * 100 || 0}%` }} />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-muted-foreground">In Progress</span>
                    <span className="font-medium">{summary.tasksByStatus.in_progress}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500" style={{ width: `${(summary.tasksByStatus.in_progress / summary.totalTasks) * 100 || 0}%` }} />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-muted-foreground">In Review</span>
                    <span className="font-medium">{summary.tasksByStatus.review}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500" style={{ width: `${(summary.tasksByStatus.review / summary.totalTasks) * 100 || 0}%` }} />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-muted-foreground">Done</span>
                    <span className="font-medium">{summary.tasksByStatus.done}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500" style={{ width: `${(summary.tasksByStatus.done / summary.totalTasks) * 100 || 0}%` }} />
                  </div>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
