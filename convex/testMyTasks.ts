import { query } from "./_generated/server";
import { getCurrentUser } from "./users";

export const testMyTasks = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return { error: "No user" };

    const memberships = await ctx.db
      .query("workgroup_members")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const memberWorkgroupIds = memberships.map((m) => m.workgroupId);
    
    const ownedWorkgroups = await ctx.db
      .query("workgroups")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .collect();
    
    const ownedWorkgroupIds = ownedWorkgroups.map((w) => w._id);
    
    const workgroupIds = [...new Set([...memberWorkgroupIds, ...ownedWorkgroupIds])];

    const allProjects = await ctx.db.query("projects").collect();
    const userProjects = allProjects.filter((p) => workgroupIds.includes(p.workgroupId));
    
    const projectIds = userProjects.map((p) => p._id);
    const allTasks = await ctx.db.query("tasks").collect();
    
    const allProjectTasks = allTasks.filter((t) => projectIds.includes(t.projectId));

    return {
      memberWorkgroupIds: memberWorkgroupIds.length,
      ownedWorkgroupIds: ownedWorkgroupIds.length,
      workgroupIds: workgroupIds.length,
      allProjects: allProjects.length,
      userProjects: userProjects.length,
      projectIds: projectIds.length,
      allTasks: allTasks.length,
      allProjectTasks: allProjectTasks.length,
      message: `Usuario tem ${allProjectTasks.length} tarefas em seus projetos`
    };
  },
});
