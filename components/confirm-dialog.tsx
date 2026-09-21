import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  action,
  onConfirm,
  disabled = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  action: string;
  onConfirm: () => void;
  disabled?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <Button
          variant="destructive"
          disabled={disabled}
          onPress={() => {
            onConfirm();
            onOpenChange(false);
          }}
        >
          <Text>{action}</Text>
        </Button>
        <Button variant="outline" onPress={() => onOpenChange(false)}>
          <Text>Cancel</Text>
        </Button>
      </DialogContent>
    </Dialog>
  );
}
