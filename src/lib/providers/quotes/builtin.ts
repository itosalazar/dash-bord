import type { Cue } from "@/lib/types";
import type { QuoteProvider } from "../types";

/**
 * Original, attribution-free cues written for dash-bord. Short enough to read
 * from across a desk; focused on starting, focusing, resting and small habits.
 */
const LINES: [string, string[]][] = [
  ["Keep the next step small enough to start.", ["start"]],
  ["Begin badly. Refine kindly.", ["start"]],
  ["Five focused minutes still count.", ["focus"]],
  ["Clear one surface, clear one thought.", ["space"]],
  ["Drink some water before the next tab.", ["body"]],
  ["Finish the sentence you started.", ["focus"]],
  ["Make it work, then make it lovely.", ["craft"]],
  ["One thing at a time is still a pace.", ["focus"]],
  ["Stand up, roll your shoulders, come back.", ["body"]],
  ["Protect the first hour like a meeting.", ["habit"]],
  ["Write the messy version first.", ["craft"]],
  ["Rest is part of the work, not a prize for it.", ["rest"]],
  ["Ask the question you keep postponing.", ["courage"]],
  ["Close the loops that take two minutes.", ["habit"]],
  ["Decide once. Repeat easily.", ["habit"]],
  ["Leave a note for tomorrow's you.", ["habit"]],
  ["Progress first. Polish later.", ["craft"]],
  ["Breathe out a little longer than you breathe in.", ["rest"]],
  ["Pick the task that makes the others easier.", ["focus"]],
  ["Good enough today beats perfect someday.", ["craft"]],
  ["Look out the window for twenty seconds.", ["body"]],
  ["Name the next physical action.", ["start"]],
  ["Small habits, repeated, become the scenery.", ["habit"]],
  ["Make the right thing the easy thing.", ["habit"]],
  ["Single tab. Single task.", ["focus"]],
  ["Say no to one thing so you can say yes properly.", ["focus"]],
  ["Tidy the edges and the middle will follow.", ["space"]],
  ["Attention is the budget. Spend it on purpose.", ["focus"]],
  ["Start where your energy already is.", ["start"]],
  ["Show the work before it feels ready.", ["courage"]],
  ["A walk counts as thinking.", ["body"]],
  ["Ship the draft, then sharpen it.", ["craft"]],
  ["Let the first idea be the warm-up.", ["craft"]],
  ["Notice one thing that went right today.", ["rest"]],
  ["Unclench your jaw. Drop your shoulders.", ["body"]],
  ["Leave something a little better than you found it.", ["craft"]],
  ["Batch the small stuff. Guard the deep stuff.", ["focus"]],
  ["Curiosity first, conclusions later.", ["craft"]],
  ["If it takes a minute, do it now.", ["habit"]],
  ["End the day by setting up the next one.", ["habit"]],
  ["Steady beats sudden.", ["habit"]],
  ["Write the worry down, then return to the work.", ["rest"]],
  ["Celebrate the streak. Forgive the gap.", ["habit"]],
  ["Light, water, movement. Check all three.", ["body"]],
  ["You need a clearer next step more than more time.", ["start"]],
  ["Make space before you make things.", ["space"]],
  ["Be generous with feedback and patient with drafts.", ["craft"]],
  ["The calendar is a plan, not a verdict.", ["rest"]],
  ["Keep going, gently.", ["rest"]],
  ["Leave room for the unexpected good idea.", ["craft"]],
  ["Done is a shape you can still refine.", ["craft"]],
  ["Put your phone face down for the next block.", ["focus"]],
];

export const BUILTIN_CUES: Cue[] = LINES.map(([text, tags], index) => ({
  id: `builtin-${String(index + 1).padStart(2, "0")}`,
  text,
  tags,
}));

export const builtinQuoteProvider: QuoteProvider = {
  id: "builtin",
  list: async () => BUILTIN_CUES,
};
