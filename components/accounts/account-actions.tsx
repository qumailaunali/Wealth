"use client";

import { Archive, ArchiveRestore, ArrowUpToLine, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { deleteAccount, moveAccountToFront, setAccountArchived } from "@/lib/actions/accounts";
import type { AccountView } from "@/lib/types";
import { AccountFormSheet } from "./account-form-sheet";

export function AccountActions({
  account,
  txCount,
  isFirst = false,
}: {
  account: AccountView;
  txCount: number;
  isFirst?: boolean;
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const showFirst = !isFirst && !account.isArchived;

  const moveToFront = () =>
    startTransition(async () => {
      const res = await moveAccountToFront(account.id);
      if (!res.ok) return void toast.error(res.error);
      toast.success(`“${account.name}” will now show first`);
      router.refresh();
    });

  const toggleArchive = () =>
    startTransition(async () => {
      const res = await setAccountArchived(account.id, !account.isArchived);
      if (!res.ok) return void toast.error(res.error);
      toast.success(account.isArchived ? "Account restored" : "Account archived");
      setConfirmOpen(false);
    });

  const remove = () =>
    startTransition(async () => {
      const res = await deleteAccount(account.id, true);
      if (!res.ok) return void toast.error(res.error);
      toast.success("Account deleted");
      router.replace("/accounts");
    });

  return (
    <div className={showFirst ? "grid grid-cols-2 gap-2 sm:grid-cols-4" : "grid grid-cols-3 gap-2"}>
      {showFirst ? (
        <Button variant="outline" onClick={moveToFront} disabled={pending}>
          <ArrowUpToLine aria-hidden="true" /> Show first
        </Button>
      ) : null}
      <Button variant="outline" onClick={() => setEditOpen(true)}>
        <Pencil aria-hidden="true" /> Edit
      </Button>
      <Button variant="outline" onClick={toggleArchive} disabled={pending}>
        {account.isArchived ? (
          <ArchiveRestore aria-hidden="true" />
        ) : (
          <Archive aria-hidden="true" />
        )}
        {account.isArchived ? "Restore" : "Archive"}
      </Button>
      <Button
        variant="outline"
        className="text-expense"
        onClick={() => setConfirmOpen(true)}
        disabled={pending}
      >
        <Trash2 aria-hidden="true" /> Delete
      </Button>

      <AccountFormSheet open={editOpen} onOpenChange={setEditOpen} account={account} />

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{account.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              {txCount > 0
                ? `This account has ${txCount} transaction${txCount === 1 ? "" : "s"} (including transfers). Deleting it permanently removes them all and changes your balances. Archiving hides the account but keeps your history.`
                : "This account has no transactions. It will be removed permanently."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            {txCount > 0 && !account.isArchived ? (
              <Button variant="secondary" onClick={toggleArchive} disabled={pending}>
                Archive instead
              </Button>
            ) : null}
            <AlertDialogAction
              onClick={remove}
              className="bg-destructive hover:bg-destructive/90 text-white"
            >
              Delete{txCount > 0 ? " everything" : ""}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
