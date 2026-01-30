    let actualCompletionDate = args.actualCompletionDate;
    const actualHours = args.actualHours;

    if (args.status && (args.status === "done" || args.status === "completed")) {
      if (actualCompletionDate === undefined) {
        actualCompletionDate = Date.now();
      }
    }
