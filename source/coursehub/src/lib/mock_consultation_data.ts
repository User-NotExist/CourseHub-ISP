// Placeholder data shared by the list and detail pages.
// Replace with real API calls once the consultation API is ready.

export type Consultant = { name: string; initials: string; email: string };

export type ConsultationLog = {
  id: string;
  title: string;
  date: string; // ISO date, e.g. "2026-10-21"
  consultant: Consultant;
  details: string; // plain text, line breaks are kept
};

export type Course = { code: string; section: string; name: string; sec: string };

export const SAMPLE_COURSE: Course = {
  code: "0981567",
  section: "56",
  name: "Database",
  sec: "450",
};

const KANYA: Consultant = { name: "Kanya Chaiyasit", initials: "KC", email: "kanya.c@ku.th" };
const SOMCHAI: Consultant = { name: "Somchai Wongsa", initials: "SW", email: "somchai.w@ku.th" };
const PIM: Consultant = { name: "Pim Rattanakul", initials: "PR", email: "pim.r@ku.th" };

export const SAMPLE_LOGS: ConsultationLog[] = [
  {
    id: "1",
    title: "Assignment 5 question",
    date: "2026-10-21",
    consultant: KANYA,
    details:
      "Asked about question 3 of Assignment 5, specifically how to write a query that returns customers who have placed orders in every product category.\n\nThe consultant explained the relational division pattern and showed two ways to solve it: a double NOT EXISTS and a GROUP BY with HAVING COUNT.\n\nNext steps:\n- Rewrite query 3 using the HAVING COUNT approach.\n- Compare the result with the NOT EXISTS version.\n- Add comments explaining the logic before submitting.",
  },
  {
    id: "2",
    title: "Normalization of the hotel schema",
    date: "2026-10-14",
    consultant: SOMCHAI,
    details:
      "Discussed the hotel reservation database schema and reviewed the relationships between guests, rooms, bookings, and payments.\n\nThe consultant recommended separating booking details from payment records and checking that every non-key attribute depends on the full primary key.\n\nNext steps:\n- Update the ER diagram and normalize the tables to 3NF.\n- Add primary and foreign key constraints.\n- Prepare sample data for the next consultation.",
  },
  {
    id: "3",
    title: "Midterm review: SQL joins",
    date: "2026-10-02",
    consultant: KANYA,
    details:
      "Reviewed the differences between INNER, LEFT, RIGHT and FULL joins using the practice questions from the midterm sheet.\n\nThe main confusion was how NULL values behave in outer joins and why filtering in WHERE can turn a LEFT JOIN into an INNER JOIN.\n\nNext steps:\n- Redo practice questions 4 to 8.\n- Write one example for each join type from memory.",
  },
  {
    id: "4",
    title: "Project proposal feedback",
    date: "2026-09-18",
    consultant: PIM,
    details:
      "Presented the project proposal and received feedback on its scope.\n\nThe consultant suggested narrowing the feature list to the core booking flow, defining the main entities earlier, and adding a short section on how the data will be validated.\n\nNext steps:\n- Trim the feature list and resubmit the proposal.\n- Draft the first version of the ER diagram.",
  },
];

export const getLog = (id: string) => SAMPLE_LOGS.find((l) => l.id === id);

export const formatDate = (iso: string, long = false) =>
  new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: long ? "long" : "short",
    year: "numeric",
  });