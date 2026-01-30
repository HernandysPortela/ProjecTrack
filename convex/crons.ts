import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Send daily task reminders every day at 8 AM BRT (11 AM UTC)
crons.interval(
  "send daily task reminders",
  { hours: 24 }, // Run every 24 hours
  internal.cronActions.sendDailyReminders,
  {}
);

export default crons;
