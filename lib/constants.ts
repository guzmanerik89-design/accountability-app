export const ACCOUNTING_TASKS = [
  "Bank 1 Reconciliation",
  "Bank 2 Reconciliation",
  "1099-NEC",
  "Accounts Receivable Review",
  "Accounts Payable Review",
  "Payroll Reconciliation",
  "Fixed Assets Update",
  "Month-End Journal Entries",
  "Financial Statements",
  "Balance Sheet Review",
  "Audit",
  "Review with Client",
];

export const TAX_TASKS = [
  "Gather Source Documents",
  "Review Prior Year Return",
  "Income Summary",
  "Deductions & Credits",
  "Depreciation Schedule",
  "Estimated Tax Payments",
  "Tax Prep",
  "Review Tax with Client",
  "Client Sign-off & Filing",
];

export const STATUS_CONFIG = {
  not_started: {
    label: "Not Started",
    color: "bg-gray-100 text-gray-600 border-gray-200",
    dot: "bg-gray-400",
  },
  in_progress: {
    label: "In Progress",
    color: "bg-blue-100 text-blue-700 border-blue-200",
    dot: "bg-blue-500",
  },
  needs_info: {
    label: "Needs Info",
    color: "bg-yellow-100 text-yellow-700 border-yellow-200",
    dot: "bg-yellow-500",
  },
  review: {
    label: "Review",
    color: "bg-purple-100 text-purple-700 border-purple-200",
    dot: "bg-purple-500",
  },
  complete: {
    label: "Complete",
    color: "bg-green-100 text-green-700 border-green-200",
    dot: "bg-green-500",
  },
};

export const ENTITY_TYPES = [
  "LLC",
  "S-Corp",
  "C-Corp",
  "Sole Proprietorship",
  "Partnership",
  "Other",
];

export const SPRINT_DAYS = [
  { day: "Day 1", date: "Wed 02/25", focus: "Kickoff", tasks: "Gather all source docs for 8 businesses\nSet up client communication checklist\nConfirm any missing items" },
  { day: "Day 2", date: "Thu 02/26", focus: "Doc Intake", tasks: "Complete document collection\nOrganize files by business\nNote any missing statements" },
  { day: "Day 3", date: "Fri 02/27", focus: "Acct Biz 1-4", tasks: "Bank reconciliations Biz 1–4\nAR/AP review Biz 1–4\nUpdate tracker" },
  { day: "Day 4", date: "Sat 02/28", focus: "Acct Biz 5-8", tasks: "Bank reconciliations Biz 5–8\nAR/AP review Biz 5–8\nUpdate tracker" },
  { day: "Day 5", date: "Sun 03/01", focus: "Payroll", tasks: "Payroll reconciliation all 8\nFixed assets update all 8\nFollow up on any open items" },
  { day: "Day 6", date: "Mon 03/02", focus: "J-Entries", tasks: "Month-end journal entries all 8\nInter-company eliminations\nReview adjustments" },
  { day: "Day 7", date: "Tue 03/03", focus: "Fin Stmts", tasks: "Finalize financial statements all 8\nBalance sheet review\nInternal QA check" },
  { day: "Day 8", date: "Wed 03/04", focus: "Tax Prep 1-4", tasks: "Income summary Biz 1–4\nGather deductions & credits\nReview prior year returns 1–4" },
  { day: "Day 9", date: "Thu 03/05", focus: "Tax Prep 5-8", tasks: "Income summary Biz 5–8\nGather deductions & credits\nReview prior year returns 5–8" },
  { day: "Day 10", date: "Fri 03/06", focus: "Depreciation", tasks: "Depreciation schedules all 8\nEstimated tax payments check\nCarryforwards & NOLs" },
  { day: "Day 11", date: "Sat 03/07", focus: "Returns 1-4", tasks: "Prepare tax returns Biz 1–4\nRun tax software checks\nInternal review" },
  { day: "Day 12", date: "Sun 03/08", focus: "Returns 5-8", tasks: "Prepare tax returns Biz 5–8\nRun tax software checks\nInternal review" },
  { day: "Day 13", date: "Mon 03/09", focus: "Client Review", tasks: "Send returns to all 8 clients\nCollect signatures/approvals\nAddress any questions" },
  { day: "Day 14", date: "Tue 03/10", focus: "DEADLINE", tasks: "Final sign-offs & e-file\nConfirm all tracker items Complete\nArchive client files" },
];
