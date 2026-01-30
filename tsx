<Select
  value={selectedUserForTeam || ""}
  onValueChange={(value) => setSelectedUserForTeam(value as Id<"users">)}
>
