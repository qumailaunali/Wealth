"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Archive, ArchiveRestore, Loader2, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { IconBadge } from "@/components/app-icon";
import { applyFieldErrors, Field, fieldA11y } from "@/components/forms/field";
import { ColorPicker, IconPicker } from "@/components/forms/pickers";
import { useAppData } from "@/components/providers/app-data";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Segmented } from "@/components/ui/segmented";
import {
  createCategory,
  deleteCategory,
  setCategoryArchived,
  updateCategory,
} from "@/lib/actions/categories";
import { toInputString } from "@/lib/money";
import type { CategoryView, CatType } from "@/lib/types";
import { type CategoryInput, categorySchema } from "@/lib/validators/finance";

export function CategoryFormSheet({
  open,
  onOpenChange,
  category,
  defaultType,
  defaultParentId,
  usage,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: CategoryView;
  defaultType: CatType;
  defaultParentId?: string | null;
  usage: number;
}) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle className="text-lg">
            {category ? "Edit category" : "New category"}
          </DrawerTitle>
          <DrawerDescription>
            {category
              ? `${usage} transaction${usage === 1 ? "" : "s"} use this category.`
              : "Group your spending and income your way."}
          </DrawerDescription>
        </DrawerHeader>
        {open ? (
          <CategoryForm
            category={category}
            defaultType={defaultType}
            defaultParentId={defaultParentId ?? null}
            onDone={() => onOpenChange(false)}
          />
        ) : null}
      </DrawerContent>
    </Drawer>
  );
}

function CategoryForm({
  category,
  defaultType,
  defaultParentId,
  onDone,
}: {
  category?: CategoryView;
  defaultType: CatType;
  defaultParentId: string | null;
  onDone: () => void;
}) {
  const { categories, prefs } = useAppData();
  const [pending, startTransition] = useTransition();
  const [reassign, setReassign] = useState<{ count: number; target: string } | null>(null);

  const form = useForm<CategoryInput>({
    resolver: zodResolver(categorySchema),
    defaultValues: category
      ? {
          name: category.name,
          type: category.type,
          icon: category.icon,
          color: category.color,
          parentId: category.parentId,
          monthlyBudget: category.monthlyBudget
            ? toInputString(category.monthlyBudget, prefs.defaultCurrency)
            : "",
        }
      : {
          name: "",
          type: defaultType,
          icon: "shopping-bag",
          color: "#10B981",
          parentId: defaultParentId,
          monthlyBudget: "",
        },
  });
  const { errors } = form.formState;
  const [type, color, icon, name] = useWatch({
    control: form.control,
    name: ["type", "color", "icon", "name"],
  });
  const hasChildren = category ? categories.some((c) => c.parentId === category.id) : false;
  const parentOptions = categories.filter(
    (c) => c.type === type && !c.parentId && !c.isArchived && c.id !== category?.id,
  );

  const onSubmit = form.handleSubmit((values) =>
    startTransition(async () => {
      const payload = { ...values, parentId: values.parentId || null };
      const res = category
        ? await updateCategory(category.id, payload)
        : await createCategory(payload);
      if (!res.ok) {
        applyFieldErrors(res.fieldErrors, form.setError);
        toast.error(res.error);
        return;
      }
      toast.success(category ? "Category updated" : "Category created");
      onDone();
    }),
  );

  const runDelete = (reassignTo?: string) =>
    startTransition(async () => {
      if (!category) return;
      const res = await deleteCategory({ id: category.id, reassignTo });
      if (!res.ok) return void toast.error(res.error);
      if (res.data.needsReassign) {
        const target = categories.find(
          (c) => c.type === category.type && c.id !== category.id && !c.isArchived,
        );
        setReassign({ count: res.data.needsReassign, target: target?.id ?? "" });
        return;
      }
      toast.success("Category deleted");
      setReassign(null);
      onDone();
    });

  const toggleArchive = () =>
    startTransition(async () => {
      if (!category) return;
      const res = await setCategoryArchived(category.id, !category.isArchived);
      if (!res.ok) return void toast.error(res.error);
      toast.success(category.isArchived ? "Category restored" : "Category archived");
      setReassign(null);
      onDone();
    });

  return (
    <form onSubmit={onSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
      <div className="grid grid-cols-1 gap-5 overflow-y-auto px-4 pb-4">
        <div className="bg-surface-2/60 flex items-center gap-3 rounded-2xl p-3">
          <IconBadge name={icon} color={color} size="lg" />
          <p className="truncate font-semibold">{name || "Category name"}</p>
        </div>

        {!category ? (
          <Segmented
            label="Category type"
            value={type}
            onChange={(t) => {
              form.setValue("type", t);
              form.setValue("parentId", null);
            }}
            options={[
              { value: "EXPENSE", label: "Expense", activeClassName: "bg-expense/15 text-expense" },
              { value: "INCOME", label: "Income", activeClassName: "bg-income/15 text-income" },
            ]}
          />
        ) : null}

        <Field id="cat-name" label="Name" error={errors.name?.message}>
          <Input
            {...fieldA11y("cat-name", errors.name?.message)}
            placeholder="e.g. Groceries"
            {...form.register("name")}
          />
        </Field>

        {!hasChildren ? (
          <Field id="cat-parent" label="Parent category (optional)">
            <NativeSelect
              id="cat-parent"
              {...form.register("parentId", { setValueAs: (v: string) => v || null })}
            >
              <option value="">None (top level)</option>
              {parentOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
        ) : null}

        {type === "EXPENSE" ? (
          <Field
            id="cat-budget"
            label={`Monthly budget (${prefs.defaultCurrency}, optional)`}
            error={errors.monthlyBudget?.message}
            hint="We'll warn you at 80% and alert you at 100%."
          >
            <Input
              {...fieldA11y("cat-budget", errors.monthlyBudget?.message)}
              inputMode="decimal"
              placeholder="No budget"
              {...form.register("monthlyBudget")}
            />
          </Field>
        ) : null}

        <div className="grid grid-cols-1 gap-2">
          <span className="text-muted-foreground text-sm font-medium">Colour</span>
          <Controller
            control={form.control}
            name="color"
            render={({ field }) => <ColorPicker value={field.value} onChange={field.onChange} />}
          />
        </div>
        <div className="grid grid-cols-1 gap-2">
          <span className="text-muted-foreground text-sm font-medium">Icon</span>
          <Controller
            control={form.control}
            name="icon"
            render={({ field }) => (
              <IconPicker value={field.value} onChange={field.onChange} color={color} />
            )}
          />
        </div>
      </div>
      <div className="flex gap-2 border-t p-4">
        {category ? (
          <>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="px-4"
              onClick={toggleArchive}
              disabled={pending}
              aria-label={category.isArchived ? "Restore category" : "Archive category"}
            >
              {category.isArchived ? (
                <ArchiveRestore aria-hidden="true" />
              ) : (
                <Archive aria-hidden="true" />
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="text-expense px-4"
              onClick={() => runDelete()}
              disabled={pending}
              aria-label="Delete category"
            >
              <Trash2 aria-hidden="true" />
            </Button>
          </>
        ) : null}
        <Button type="submit" size="lg" className="flex-1" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
          {category ? "Save changes" : "Create category"}
        </Button>
      </div>

      <AlertDialog open={Boolean(reassign)} onOpenChange={(o) => (o ? null : setReassign(null))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move {reassign?.count} transactions first</AlertDialogTitle>
            <AlertDialogDescription>
              “{category?.name}” is in use. Choose where its transactions should go, or archive the
              category to keep it but hide it from pickers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid grid-cols-1 gap-2">
            <Label htmlFor="reassign-to">Move transactions to</Label>
            <NativeSelect
              id="reassign-to"
              value={reassign?.target ?? ""}
              onChange={(e) => setReassign((r) => (r ? { ...r, target: e.target.value } : r))}
            >
              {categories
                .filter((c) => c.type === category?.type && c.id !== category?.id && !c.isArchived)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.parentId ? "↳ " : ""}
                    {c.name}
                  </option>
                ))}
            </NativeSelect>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button variant="secondary" onClick={toggleArchive} disabled={pending}>
              Archive instead
            </Button>
            <Button
              onClick={() => reassign?.target && runDelete(reassign.target)}
              disabled={pending || !reassign?.target}
              className="bg-destructive hover:bg-destructive/90 text-white"
            >
              Move & delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}
