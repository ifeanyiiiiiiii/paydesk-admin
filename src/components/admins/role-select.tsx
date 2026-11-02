"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type Role, roleDetails, roles } from "@/lib/auth/permissions";

const roleItems = roles.map((role) => ({
  value: role,
  label: roleDetails[role].label,
}));

export function RoleSelect({
  id,
  value,
  onChange,
  invalid,
}: {
  id: string;
  value: Role | undefined;
  onChange: (role: Role) => void;
  invalid?: boolean;
}) {
  return (
    <Select
      items={roleItems}
      value={value ?? null}
      onValueChange={(role) => role && onChange(role as Role)}
    >
      <SelectTrigger id={id} className="w-full" aria-invalid={invalid}>
        <SelectValue placeholder="Choose a role" />
      </SelectTrigger>
      <SelectContent>
        {roleItems.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
