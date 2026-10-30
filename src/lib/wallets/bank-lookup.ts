import { createRandom } from "@/lib/data/random";
import { firstNames, lastNames } from "@/lib/data/seed";

/**
 * Stand-in for a bank's name-enquiry service. The same account number always
 * gives the same fictional name, and numbers starting 000 don't exist, so the
 * "account not found" path can be tried in the demo.
 */
export function lookupAccount(accountNumber: string): string | null {
  if (accountNumber.startsWith("000")) return null;
  const random = createRandom(Number(accountNumber));
  return `${random.pick(firstNames)} ${random.pick(lastNames)}`;
}
