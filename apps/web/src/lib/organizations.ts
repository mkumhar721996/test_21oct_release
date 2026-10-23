export type Consultant = { name: string; email: string | null; phone: string | null };

export type Organization = {
  id: string;
  name: string;
  consultant: Consultant | null;
};

export const ORGANIZATIONS: Organization[] = [
  {
    id: "org-1",
    name: "Hope Trust",
    consultant: { name: "Ada Lovelace", email: "ada@wfc.org", phone: "555-0100" },
  },
  {
    id: "org-2",
    name: "River Foundation",
    consultant: { name: "Grace Hopper", email: null, phone: "555-0101" },
  },
  {
    id: "org-3",
    name: "Oak Alliance",
    consultant: { name: "Alan Turing", email: "alan@wfc.org", phone: null },
  },
  { id: "org-4", name: "Bright Futures", consultant: null },
];
