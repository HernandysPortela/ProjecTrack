const { readFilesToContextTool } = default_api;
const files = await readFilesToContextTool({
  file_paths: ["convex/projectMembers.ts", "src/pages/ProjectView.tsx"],
  replace_files_in_context: true
});
