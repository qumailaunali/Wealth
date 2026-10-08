"use client";

import { Archive, ArchiveRestore, Pencil, Trash2 } from "lucide-react";
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
import { deleteAccount, setAccountArchived } from "@/lib/actions/accounts";
import type { AccountView } from "@/lib/types";
import { AccountFormSheet } from "./account-form-sheet";

export function AccountActions({ account, txCount }: { account: AccountView; txCount: number }) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, startTransition] = useTransition();

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
    <div className="grid grid-cols-3 gap-2">
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
